import { unstable_cache } from 'next/cache';
import { categories as fallbackCategories } from '../data';
import type { HotLink, NavCategory, NavLink, NavSnapshot } from '../types';
import { createServerSupabaseClient } from './supabase-server';

type CategoryRow = {
  id: string;
  name: string;
  icon: string;
  is_private: boolean | null;
  order: number;
};

type LinkRow = {
  id: string;
  category_id: string;
  title: string;
  url: string;
  description: string;
  icon: string | null;
  is_private: boolean | null;
};

type HotLinkRow = {
  title: string;
  url: string;
  icon: string | null;
  click_count: number;
};

type SnapshotRpcData = Partial<{
  categories: NavCategory[];
  hotLinks: HotLink[];
  stats: {
    categoryCount: number;
    linkCount: number;
    totalViewCount: number;
  };
  generatedAt: string;
}>;

function normalizeRpcSnapshot(data: SnapshotRpcData): NavSnapshot {
  const categories = Array.isArray(data.categories) ? data.categories : [];
  const hotLinks = Array.isArray(data.hotLinks) ? data.hotLinks : [];

  return {
    categories,
    hotLinks,
    stats: {
      categoryCount: Number(data.stats?.categoryCount) || categories.length,
      linkCount:
        Number(data.stats?.linkCount) ||
        categories.reduce((sum, category) => sum + category.links.length, 0),
      totalViewCount: Number(data.stats?.totalViewCount) || 0,
    },
    generatedAt: data.generatedAt ? new Date(data.generatedAt).toISOString() : new Date().toISOString(),
  };
}

async function getTotalViewCount(supabase: ReturnType<typeof createServerSupabaseClient>) {
  const { data, error } = await supabase
    .from('site_stats')
    .select('value')
    .eq('key', 'total_views')
    .maybeSingle();

  if (error) {
    console.error('Failed to load total site view count:', error);
    return 0;
  }

  return Number(data?.value) || 0;
}

async function loadNavSnapshotFromTables(
  supabase: ReturnType<typeof createServerSupabaseClient>
): Promise<NavSnapshot> {
  try {
    const [categoriesResult, linksResult, hotLinksResult, totalViewCount] = await Promise.all([
      supabase
        .from('categories')
        .select('id,name,icon,is_private,order')
        .order('order', { ascending: true }),
      supabase
        .from('links')
        .select('id,category_id,title,url,description,icon,is_private')
        .order('order', { ascending: true }),
      supabase.rpc('get_today_hot_links', { limit_count: 3 }),
      getTotalViewCount(supabase),
    ]);

    if (categoriesResult.error) throw categoriesResult.error;
    if (linksResult.error) throw linksResult.error;

    const categoryRows = (categoriesResult.data || []) as CategoryRow[];
    const linkRows = (linksResult.data || []) as LinkRow[];
    const linksByCategory = new Map<string, NavLink[]>();

    for (const link of linkRows) {
      const navLink: NavLink = {
        id: link.id,
        title: link.title,
        url: link.url,
        description: link.description,
        icon: link.icon || undefined,
        isPrivate: link.is_private || false,
      };

      const group = linksByCategory.get(link.category_id);
      if (group) {
        group.push(navLink);
      } else {
        linksByCategory.set(link.category_id, [navLink]);
      }
    }

    const categories: NavCategory[] = categoryRows.map((category) => ({
      id: category.id,
      name: category.name,
      icon: category.icon,
      isPrivate: category.is_private || false,
      order: category.order,
      links: linksByCategory.get(category.id) || [],
    }));

    const hotLinks: HotLink[] = hotLinksResult.error
      ? []
      : ((hotLinksResult.data || []) as HotLinkRow[]).map((link) => ({
          title: link.title,
          url: link.url,
          icon: link.icon || undefined,
          clickCount: Number(link.click_count) || 0,
        }));

    return {
      categories,
      hotLinks,
      stats: {
        categoryCount: categories.length,
        // 按实际挂载到分类上的链接统计：读取期间若有并发写入，
        // linkRows 可能含分类快照中不存在的孤儿链接
        linkCount: categories.reduce((sum, category) => sum + category.links.length, 0),
        totalViewCount,
      },
      generatedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error('Failed to load nav snapshot:', error);
    return {
      categories: fallbackCategories,
      hotLinks: [],
      stats: {
        categoryCount: fallbackCategories.length,
        linkCount: fallbackCategories.reduce((sum, category) => sum + category.links.length, 0),
        totalViewCount: 0,
      },
      generatedAt: new Date().toISOString(),
    };
  }
}

async function loadNavSnapshot(): Promise<NavSnapshot> {
  const supabase = createServerSupabaseClient();

  try {
    const { data, error } = await supabase.rpc('get_nav_snapshot_data', { limit_count: 3 });

    if (error) throw error;

    // RPC 返回 null 或缺关键字段时走降级：避免把接口契约变化掩盖成"有效空快照"
    const rawData = data as SnapshotRpcData | null;
    if (!rawData || typeof rawData !== 'object' || !Array.isArray(rawData.categories)) {
      throw new Error('get_nav_snapshot_data 返回结构缺失关键字段');
    }

    const snapshot = normalizeRpcSnapshot((data || {}) as SnapshotRpcData);

    // 用字段是否存在（而非值是否为 0）判断 RPC 是否返回了浏览量：
    // 新站真实浏览量为 0 时不应再多打一次查询
    const rpcStats = (data as SnapshotRpcData | null)?.stats;
    if (snapshot.stats.totalViewCount === 0 && !(rpcStats && 'totalViewCount' in rpcStats)) {
      return {
        ...snapshot,
        stats: {
          ...snapshot.stats,
          totalViewCount: await getTotalViewCount(supabase),
        },
      };
    }

    return snapshot;
  } catch (error) {
    console.error('Failed to load nav snapshot via RPC:', error);
    return loadNavSnapshotFromTables(supabase);
  }
}

export const getNavSnapshot = unstable_cache(loadNavSnapshot, ['nav-snapshot'], {
  revalidate: 45,
  tags: ['nav-snapshot'],
});
