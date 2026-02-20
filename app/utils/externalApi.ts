// 外部 API 工具
const QUOTE_CACHE_KEY = 'daily_quote_cache';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24小时

interface CacheItem {
  data: string;
  timestamp: number;
}

function saveCache(key: string, data: string) {
  try {
    const cacheItem: CacheItem = { data, timestamp: Date.now() };
    localStorage.setItem(key, JSON.stringify(cacheItem));
  } catch (error) {
    console.error('保存缓存失败:', error);
  }
}

function loadCache(key: string): string | null {
  try {
    const cached = localStorage.getItem(key);
    if (!cached) return null;

    const cacheItem: CacheItem = JSON.parse(cached);
    if (Date.now() - cacheItem.timestamp > CACHE_DURATION) {
      localStorage.removeItem(key);
      return null;
    }

    return cacheItem.data;
  } catch (error) {
    console.error('读取缓存失败:', error);
    return null;
  }
}

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
 * 加载每日一言（带缓存和超时）
 */
export async function loadDailyQuote(): Promise<string> {
  const cached = loadCache(QUOTE_CACHE_KEY);
  if (cached) {
    return cached;
  }

  try {
    const response = await fetchWithTimeout(
      'https://v.api.aa1.cn/api/yiyan/index.php',
      3000
    );
    const text = await response.text();
    const cleanText = text.replace(/<[^>]*>/g, '').trim();

    saveCache(QUOTE_CACHE_KEY, cleanText);
    return cleanText;
  } catch (error) {
    console.error('加载每日一言失败:', error);
    return '生活总会给你答案，但不会马上把一切都告诉你。';
  }
}
