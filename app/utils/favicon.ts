/**
 * 从 URL 中提取域名
 */
export function extractDomain(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch {
    return '';
  }
}

// Favicon 缓存
const faviconCache = new Map<string, string>();
const FAVICON_CACHE_KEY_PREFIX = 'favicon_cache_';

/**
 * 从 localStorage 加载 favicon 缓存
 */
function loadFaviconFromStorage(domain: string): string | null {
  try {
    const cached = localStorage.getItem(FAVICON_CACHE_KEY_PREFIX + domain);
    return cached;
  } catch {
    return null;
  }
}

/**
 * 保存 favicon 到 localStorage
 */
function saveFaviconToStorage(domain: string, url: string) {
  try {
    localStorage.setItem(FAVICON_CACHE_KEY_PREFIX + domain, url);
  } catch (error) {
    console.error('保存 favicon 缓存失败:', error);
  }
}

/**
 * 获取网站 favicon URL（带缓存）
 * 使用 faviconextractor.com 服务
 */
export function getFaviconUrl(url: string): string {
  const domain = extractDomain(url);
  if (!domain) return '';

  // 1. 先检查内存缓存
  if (faviconCache.has(domain)) {
    return faviconCache.get(domain)!;
  }

  // 2. 检查 localStorage 缓存
  const cached = loadFaviconFromStorage(domain);
  if (cached) {
    faviconCache.set(domain, cached);
    return cached;
  }

  // 3. 生成新的 URL
  const faviconUrl = `https://www.faviconextractor.com/favicon/${domain}?larger=true`;
  faviconCache.set(domain, faviconUrl);
  saveFaviconToStorage(domain, faviconUrl);

  return faviconUrl;
}

/**
 * 获取备用 favicon URL
 * 使用 Google 的 favicon 服务作为备用
 */
export function getFallbackFaviconUrl(url: string): string {
  const domain = extractDomain(url);
  if (!domain) return '';
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
}

/**
 * 预加载 favicon（批量）
 */
export function preloadFavicons(urls: string[]) {
  const domains = urls.map(extractDomain).filter(Boolean);

  // 使用 requestIdleCallback 在浏览器空闲时预加载
  if ('requestIdleCallback' in window) {
    requestIdleCallback(() => {
      domains.forEach(domain => {
        const faviconUrl = getFaviconUrl(`https://${domain}`);
        // 创建 Image 对象预加载
        const img = new Image();
        img.src = faviconUrl;
      });
    });
  }
}

