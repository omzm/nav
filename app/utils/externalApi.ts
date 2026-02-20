// 外部 API 缓存工具
const WALLPAPER_CACHE_KEY = 'bing_wallpaper_cache';
const QUOTE_CACHE_KEY = 'daily_quote_cache';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24小时

interface CacheItem {
  data: string;
  timestamp: number;
}

/**
 * 保存到缓存
 */
function saveCache(key: string, data: string) {
  try {
    const cacheItem: CacheItem = {
      data,
      timestamp: Date.now(),
    };
    localStorage.setItem(key, JSON.stringify(cacheItem));
  } catch (error) {
    console.error('保存缓存失败:', error);
  }
}

/**
 * 从缓存读取
 */
function loadCache(key: string): string | null {
  try {
    const cached = localStorage.getItem(key);
    if (!cached) return null;

    const cacheItem: CacheItem = JSON.parse(cached);
    const now = Date.now();

    // 检查是否过期
    if (now - cacheItem.timestamp > CACHE_DURATION) {
      localStorage.removeItem(key);
      return null;
    }

    return cacheItem.data;
  } catch (error) {
    console.error('读取缓存失败:', error);
    return null;
  }
}

/**
 * 带超时的 fetch
 */
async function fetchWithTimeout(url: string, timeout = 5000): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

/**
 * 加载必应壁纸（带缓存和超时）
 */
export async function loadBingWallpaper(): Promise<string> {
  // 1. 先尝试从缓存读取
  const cached = loadCache(WALLPAPER_CACHE_KEY);
  if (cached) {
    console.log('从缓存加载壁纸');
    return cached;
  }

  // 2. 加载新壁纸
  try {
    const wallpaperApiUrl = 'https://bing.img.run/uhd.php';
    const response = await fetchWithTimeout(wallpaperApiUrl, 3000);

    // 缓存解析后的最终 URL 而非 API 端点
    const resolvedUrl = response.url;
    saveCache(WALLPAPER_CACHE_KEY, resolvedUrl);
    return resolvedUrl;
  } catch (error) {
    console.error('加载壁纸失败:', error);
    // 返回默认渐变背景
    return '';
  }
}

/**
 * 加载每日一言（带缓存和超时）
 */
export async function loadDailyQuote(): Promise<string> {
  // 1. 先尝试从缓存读取
  const cached = loadCache(QUOTE_CACHE_KEY);
  if (cached) {
    console.log('从缓存加载每日一言');
    return cached;
  }

  // 2. 加载新的一言
  try {
    const response = await fetchWithTimeout(
      'https://v.api.aa1.cn/api/yiyan/index.php',
      3000
    );
    const text = await response.text();
    // 去除 HTML 标签
    const cleanText = text.replace(/<[^>]*>/g, '').trim();

    // 保存到缓存
    saveCache(QUOTE_CACHE_KEY, cleanText);
    return cleanText;
  } catch (error) {
    console.error('加载每日一言失败:', error);
    // 返回默认文本
    return '生活总会给你答案，但不会马上把一切都告诉你。';
  }
}
