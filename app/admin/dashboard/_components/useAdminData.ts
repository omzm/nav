'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Toast } from '@douyinfe/semi-ui';
import { revalidateNavSnapshot } from '@/app/actions/revalidateNavSnapshot';
import { supabase, Category, Link as NavLink } from '@/app/lib/supabase';
import { loadAdminCache, saveAdminCache } from '@/app/utils/adminCache';

export function useAdminData() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [links, setLinks] = useState<NavLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const categoryMap = useMemo(() => {
    return new Map(categories.map((category) => [category.id, category]));
  }, [categories]);

  const stats = useMemo(() => {
    const publicCategories = categories.filter((category) => !category.is_private).length;
    const privateCategories = categories.length - publicCategories;
    const privateCategoryIds = new Set(
      categories.filter((category) => category.is_private).map((category) => category.id)
    );
    const privateLinks = links.filter(
      (link) => link.is_private || privateCategoryIds.has(link.category_id)
    ).length;

    return {
      totalCategories: categories.length,
      totalLinks: links.length,
      publicCategories,
      privateCategories,
      publicLinks: links.length - privateLinks,
      privateLinks,
    };
  }, [categories, links]);

  const linkCountByCategory = useMemo(() => {
    const countMap = new Map<string, { total: number; privateCount: number }>();

    for (const category of categories) {
      countMap.set(category.id, { total: 0, privateCount: 0 });
    }

    for (const link of links) {
      const category = categoryMap.get(link.category_id);
      const current = countMap.get(link.category_id) || { total: 0, privateCount: 0 };
      current.total += 1;

      if (link.is_private || category?.is_private) {
        current.privateCount += 1;
      }

      countMap.set(link.category_id, current);
    }

    return countMap;
  }, [categories, categoryMap, links]);

  const invalidateHomeCache = useCallback(async () => {
    try {
      await revalidateNavSnapshot();
    } catch (error) {
      console.error('刷新首页缓存失败:', error);
    }
  }, []);

  const loadData = useCallback(async (forceRefresh = false) => {
    try {
      if (forceRefresh) {
        setRefreshing(true);
      }

      if (!forceRefresh) {
        const cached = loadAdminCache();
        if (cached) {
          setCategories(cached.categories);
          setLinks(cached.links);
          setLoading(false);
        }
      }

      const [categoriesResult, linksResult] = await Promise.all([
        supabase.from('categories').select('*').order('order', { ascending: true }),
        supabase.from('links').select('*').order('order', { ascending: true }),
      ]);

      if (categoriesResult.error) throw categoriesResult.error;
      if (linksResult.error) throw linksResult.error;

      const nextCategories = categoriesResult.data || [];
      const nextLinks = linksResult.data || [];

      saveAdminCache(nextCategories, nextLinks);
      setCategories(nextCategories);
      setLinks(nextLinks);

      if (forceRefresh) {
        Toast.success('数据已刷新');
      }
    } catch (error) {
      console.error('加载后台数据失败:', error);
      Toast.error('加载数据失败，请稍后重试');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const exportData = useCallback(() => {
    const exportCategories = categories.map((category) => ({
      name: category.name,
      icon: category.icon,
      order: category.order,
      is_private: category.is_private,
      links: links
        .filter((link) => link.category_id === category.id)
        .map((link) => ({
          title: link.title,
          url: link.url,
          description: link.description,
          icon: link.icon || null,
          order: link.order,
          is_private: link.is_private,
        })),
    }));

    const blob = new Blob(
      [
        JSON.stringify(
          {
            exported_at: new Date().toISOString(),
            total_categories: categories.length,
            total_links: links.length,
            categories: exportCategories,
          },
          null,
          2
        ),
      ],
      { type: 'application/json' }
    );
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `nav-backup-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    Toast.success('备份已导出');
  }, [categories, links]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useEffect(() => {
    const categoriesChannel = supabase
      .channel('admin-categories-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'categories' }, () => {
        void loadData();
      })
      .subscribe();

    const linksChannel = supabase
      .channel('admin-links-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'links' }, () => {
        void loadData();
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(categoriesChannel);
      void supabase.removeChannel(linksChannel);
    };
  }, [loadData]);

  return {
    categories,
    setCategories,
    links,
    setLinks,
    categoryMap,
    linkCountByCategory,
    loading,
    refreshing,
    stats,
    exportData,
    invalidateHomeCache,
    loadData,
  };
}
