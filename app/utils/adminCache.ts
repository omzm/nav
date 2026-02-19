// 后台管理缓存工具
import type { Category, Link } from '../lib/supabase';

const ADMIN_CACHE_KEY = 'admin_data_cache';
const ADMIN_CACHE_EXPIRY = 2 * 60 * 1000; // 2分钟过期（后台更新频繁，缓存时间短）

interface AdminCacheData {
  timestamp: number;
  categories: Category[];
  links: Link[];
}

/**
 * 保存后台数据到缓存
 */
export function saveAdminCache(categories: Category[], links: Link[]) {
  try {
    const cacheData: AdminCacheData = {
      timestamp: Date.now(),
      categories,
      links,
    };
    sessionStorage.setItem(ADMIN_CACHE_KEY, JSON.stringify(cacheData));
  } catch (error) {
    console.error('保存后台缓存失败:', error);
  }
}

/**
 * 从缓存读取后台数据
 */
export function loadAdminCache(): { categories: Category[]; links: Link[] } | null {
  try {
    const cached = sessionStorage.getItem(ADMIN_CACHE_KEY);
    if (!cached) return null;

    const cacheData: AdminCacheData = JSON.parse(cached);
    const now = Date.now();

    // 检查是否过期
    if (now - cacheData.timestamp > ADMIN_CACHE_EXPIRY) {
      clearAdminCache();
      return null;
    }

    return {
      categories: cacheData.categories,
      links: cacheData.links,
    };
  } catch (error) {
    console.error('读取后台缓存失败:', error);
    return null;
  }
}

/**
 * 清除后台缓存
 */
export function clearAdminCache() {
  try {
    sessionStorage.removeItem(ADMIN_CACHE_KEY);
  } catch (error) {
    console.error('清除后台缓存失败:', error);
  }
}
