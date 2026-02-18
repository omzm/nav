// 数据缓存工具
const CACHE_KEY = 'nav_website_cache';
const CACHE_VERSION = '1.0';
const CACHE_EXPIRY = 5 * 60 * 1000; // 5分钟过期

interface CacheData {
  version: string;
  timestamp: number;
  categories: any[];
  links: any[];
}

/**
 * 保存数据到缓存
 */
export function saveToCache(categories: any[], links: any[]) {
  try {
    const cacheData: CacheData = {
      version: CACHE_VERSION,
      timestamp: Date.now(),
      categories,
      links,
    };
    localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
  } catch (error) {
    console.error('保存缓存失败:', error);
  }
}

/**
 * 从缓存读取数据
 */
export function loadFromCache(): { categories: any[]; links: any[] } | null {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return null;

    const cacheData: CacheData = JSON.parse(cached);

    // 检查版本
    if (cacheData.version !== CACHE_VERSION) {
      console.log('缓存版本不匹配，清除缓存');
      clearCache();
      return null;
    }

    // 检查是否过期
    const now = Date.now();
    if (now - cacheData.timestamp > CACHE_EXPIRY) {
      console.log('缓存已过期');
      clearCache();
      return null;
    }

    return {
      categories: cacheData.categories,
      links: cacheData.links,
    };
  } catch (error) {
    console.error('读取缓存失败:', error);
    return null;
  }
}

/**
 * 清除缓存
 */
export function clearCache() {
  try {
    localStorage.removeItem(CACHE_KEY);
  } catch (error) {
    console.error('清除缓存失败:', error);
  }
}

/**
 * 检查缓存是否有效
 */
export function isCacheValid(): boolean {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return false;

    const cacheData: CacheData = JSON.parse(cached);
    const now = Date.now();

    return (
      cacheData.version === CACHE_VERSION &&
      now - cacheData.timestamp <= CACHE_EXPIRY
    );
  } catch (error) {
    return false;
  }
}
