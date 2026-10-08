'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { Toast } from '@douyinfe/semi-ui';
import { revalidateNavSnapshot } from '@/app/actions/revalidateNavSnapshot';
import { supabase, Category, Link as NavLink } from '@/app/lib/supabase';
import { loadAdminCache, saveAdminCache } from '@/app/utils/adminCache';
import { debounce } from '@/app/utils/debounce';
import { consumeAdminPrefetch } from '@/app/admin/_components/adminPrefetch';

export function useAdminData() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [links, setLinks] = useState<NavLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  // 请求版本控制：并发 loadData 时只有最新一次能写入 state，避免旧快照覆盖新数据
  const loadRequestId = useRef(0);

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

  const loadData = useCallback(async (forceRefresh = false, options?: { skipCache?: boolean; silent?: boolean }) => {
    const requestId = ++loadRequestId.current;
    const isStale = () => requestId !== loadRequestId.current;

    try {
      if (forceRefresh) {
        setRefreshing(true);
      }

      if (!forceRefresh && !options?.skipCache) {
        // 优先消费 layout 鉴权期间预取的数据（鉴权与查询并行，省一次串行等待）
        const prefetched = consumeAdminPrefetch();
        if (prefetched) {
          try {
            const { categories: prefetchedCategories, links: prefetchedLinks } = await prefetched;
            // 预取可能在 supabase 会话恢复完成前发出：此时 RLS 静默过滤返回 200 空数组
            // 而非报错。空结果不可信（会污染 10 分钟缓存并显示空后台），丢弃后走正常加载重试。
            // 真正的空站点走正常加载同样能得到空结果，不影响正确性。
            if (prefetchedCategories.length === 0 && prefetchedLinks.length === 0) {
              throw new Error('suspicious empty prefetch result');
            }
            if (isStale()) return;
            saveAdminCache(prefetchedCategories, prefetchedLinks);
            setCategories(prefetchedCategories);
            setLinks(prefetchedLinks);
            setLoading(false);
            return;
          } catch {
            // 预取失败或结果不可信则继续走正常加载流程
          }
        }

        const cached = loadAdminCache();
        if (cached) {
          if (isStale()) return;
          setCategories(cached.categories);
          setLinks(cached.links);
          setLoading(false);
        }
      }

      const [categoriesResult, linksResult] = await Promise.all([
        supabase.from('categories').select('*').order('order', { ascending: true }),
        supabase.from('links').select('*').order('order', { ascending: true }),
      ]);

      if (isStale()) return;

      if (categoriesResult.error) throw categoriesResult.error;
      if (linksResult.error) throw linksResult.error;

      const nextCategories = categoriesResult.data || [];
      const nextLinks = linksResult.data || [];

      saveAdminCache(nextCategories, nextLinks);
      setCategories(nextCategories);
      setLinks(nextLinks);

      if (forceRefresh && !options?.silent) {
        Toast.success('数据已刷新');
      }
    } catch (error) {
      console.error('加载后台数据失败:', error);
      Toast.error('加载数据失败，请稍后重试');
    } finally {
      // 过期请求不碰 loading：新请求还在飞，提前关菊花会闪烁
      if (!isStale()) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  // 导出为浏览器书签 HTML（Netscape 格式，Chrome/Edge/Safari/Firefox 均可直接导入）
  const exportBookmarks = useCallback(() => {
    const escapeHtml = (value: string) =>
      value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');

    const now = Math.floor(Date.now() / 1000);
    const lines = [
      '<!DOCTYPE NETSCAPE-Bookmark-file-1>',
      '<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">',
      '<TITLE>收藏夹备份</TITLE>',
      '<H1>收藏夹备份</H1>',
      '<DL><p>',
    ];

    const sortedCategories = [...categories].sort((a, b) => a.order - b.order);
    for (const category of sortedCategories) {
      lines.push(`    <DT><H3 ADD_DATE="${now}" LAST_MODIFIED="${now}">${escapeHtml(category.name)}</H3>`);
      lines.push('    <DL><p>');
      const categoryLinks = links
        .filter((link) => link.category_id === category.id)
        .sort((a, b) => a.order - b.order);
      for (const link of categoryLinks) {
        lines.push(
          `        <DT><A HREF="${escapeHtml(link.url)}" ADD_DATE="${now}">${escapeHtml(link.title)}</A>`
        );
      }
      lines.push('    </DL><p>');
    }
    lines.push('</DL><p>');

    const blob = new Blob([lines.join('\n')], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `nav-bookmarks-${new Date().toISOString().slice(0, 10)}.html`;
    anchor.click();
    // Safari 下载可能还没开始就被吊销，延迟释放
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    Toast.success('书签 HTML 已导出，可直接导入浏览器');
  }, [categories, links]);

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
    // Safari 下载可能还没开始就被吊销，延迟释放
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    Toast.success('备份已导出');
  }, [categories, links]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useEffect(() => {
    type ChangePayload = {
      eventType: 'INSERT' | 'UPDATE' | 'DELETE';
      new: Record<string, unknown>;
      old: Record<string, unknown>;
    };

    const sortByOrder = <T extends { order: number }>(rows: T[]) =>
      [...rows].sort((a, b) => a.order - b.order);

    // 增量更新：realtime 事件直接修改本地对应的一条数据，即时反馈无需等待
    const applyChange = <T extends { id: string; order: number }>(
      setter: Dispatch<SetStateAction<T[]>>,
      payload: ChangePayload
    ) => {
      const { eventType, new: newRow, old: oldRow } = payload;
      setter((prev) => {
        if (eventType === 'INSERT' && typeof newRow?.id === 'string') {
          if (prev.some((row) => row.id === newRow.id)) return prev;
          return sortByOrder([...prev, newRow as T]);
        }
        if (eventType === 'UPDATE' && typeof newRow?.id === 'string') {
          return sortByOrder(
            prev.map((row) => (row.id === newRow.id ? { ...row, ...(newRow as T) } : row))
          );
        }
        if (eventType === 'DELETE' && typeof oldRow?.id === 'string') {
          return prev.filter((row) => row.id !== oldRow.id);
        }
        return prev;
      });
    };

    // 防抖全量刷新做一致性兜底：跳过读缓存，避免旧缓存闪回冲掉乐观更新
    const debouncedLoad = debounce(() => {
      void loadData(false, { skipCache: true });
    }, 400);

    // 分类与链接共用一个 channel（之前是两个独立订阅，两次建连往返）
    const channel = supabase
      .channel('admin-data-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'categories' }, (payload) => {
        applyChange<Category>(setCategories, payload as unknown as ChangePayload);
        debouncedLoad();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'links' }, (payload) => {
        applyChange<NavLink>(setLinks, payload as unknown as ChangePayload);
        debouncedLoad();
      })
      .subscribe();

    return () => {
      debouncedLoad.cancel();
      void supabase.removeChannel(channel);
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
    exportBookmarks,
    invalidateHomeCache,
    loadData,
  };
}
