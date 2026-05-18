import { unstable_cache } from 'next/cache';
import { categories as fallbackCategories } from '../data';
import type { HotLink, NavCategory, NavLink, NavSnapshot } from '../types';
import { createServerSupabaseClient } from './supabase-server';

type CategoryRow = {
  id: string;
  name: string;
  icon: string;
  is_private: boolean | null;
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

type SnapshotRpcLink = {
  id?: string;
  title?: string;
  url?: string;
  description?: string;
  icon?: string | null;
  isPrivate?: boolean;
};

type SnapshotRpcCategory = {
  id?: string;
  name?: string;
  icon?: string;
  isPrivate?: boolean;
  links?: SnapshotRpcLink[];
};

type SnapshotRpcPayload = {
  categories?: SnapshotRpcCategory[];
  hotLinks?: Array<{
    title?: string;
    url?: string;
    icon?: string | null;
    clickCount?: number;
  }>;
  stats?: {
    categoryCount?: number;
    linkCount?: number;
  };
  generatedAt?: string;
};

function formatRpcSnapshot(payload: SnapshotRpcPayload): NavSnapshot {
  const categories: NavCategory[] = (payload.categories || []).map((category) => ({
    id: category.id || '',
    name: category.name || '',
    icon: category.icon || 'icon-folder',
    isPrivate: category.isPrivate || false,
    links: (category.links || []).map((link) => ({
      id: link.id,
      title: link.title || '',
      url: link.url || '',
      description: link.description || '',
      icon: link.icon || undefined,
      isPrivate: link.isPrivate || false,
    })),
  }));

  const linkCount = categories.reduce((sum, category) => sum + category.links.length, 0);

  return {
    categories,
    hotLinks: (payload.hotLinks || []).map((link) => ({
      title: link.title || '',
      url: link.url || '',
      icon: link.icon || undefined,
      clickCount: Number(link.clickCount) || 0,
    })),
    stats: {
      categoryCount: payload.stats?.categoryCount ?? categories.length,
      linkCount: payload.stats?.linkCount ?? linkCount,
    },
    generatedAt: payload.generatedAt || new Date().toISOString(),
  };
}

async function loadNavSnapshot(): Promise<NavSnapshot> {
  const supabase = createServerSupabaseClient();

  try {
    const { data: snapshotData, error: snapshotError } = await supabase.rpc(
      'get_nav_snapshot_data',
      { limit_count: 5 }
    );

    if (!snapshotError && snapshotData) {
      return formatRpcSnapshot(snapshotData as SnapshotRpcPayload);
    }

    if (snapshotError) {
      console.warn('Falling back to table snapshot query:', snapshotError.message);
    }

    const [categoriesResult, linksResult, hotLinksResult] = await Promise.all([
      supabase
        .from('categories')
        .select('id,name,icon,is_private')
        .order('order', { ascending: true }),
      supabase
        .from('links')
        .select('id,category_id,title,url,description,icon,is_private')
        .order('order', { ascending: true }),
      supabase.rpc('get_today_hot_links', { limit_count: 5 }),
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
        linkCount: linkRows.length,
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
      },
      generatedAt: new Date().toISOString(),
    };
  }
}

export const getNavSnapshot = unstable_cache(loadNavSnapshot, ['nav-snapshot'], {
  revalidate: 45,
  tags: ['nav-snapshot'],
});
