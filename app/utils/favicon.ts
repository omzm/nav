export function extractDomain(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch {
    return '';
  }
}

const MAX_FAVICON_CACHE = 500;
const faviconCache = new Map<string, string>();
const FAVICON_CACHE_KEY_PREFIX = 'favicon_cache_';

function loadFaviconFromStorage(domain: string): string | null {
  try {
    return localStorage.getItem(FAVICON_CACHE_KEY_PREFIX + domain);
  } catch {
    return null;
  }
}

function saveFaviconToStorage(domain: string, url: string) {
  try {
    localStorage.setItem(FAVICON_CACHE_KEY_PREFIX + domain, url);
  } catch {
    try {
      const keysToRemove: string[] = [];

      for (let index = 0; index < localStorage.length; index += 1) {
        const key = localStorage.key(index);
        if (key?.startsWith(FAVICON_CACHE_KEY_PREFIX)) {
          keysToRemove.push(key);
        }
      }

      keysToRemove.slice(0, 50).forEach((key) => localStorage.removeItem(key));
      localStorage.setItem(FAVICON_CACHE_KEY_PREFIX + domain, url);
    } catch {
      // Ignore storage failures; favicon loading can continue without cache.
    }
  }
}

function evictOldestFromCache() {
  if (faviconCache.size <= MAX_FAVICON_CACHE) return;

  const firstKey = faviconCache.keys().next().value;
  if (firstKey !== undefined) {
    faviconCache.delete(firstKey);
  }
}

export function removeFaviconFromStorage(domain: string) {
  if (!domain) return;
  faviconCache.delete(domain);
  try {
    localStorage.removeItem(FAVICON_CACHE_KEY_PREFIX + domain);
  } catch {
    // Ignore storage failures.
  }
}

export function getFaviconUrl(url: string): string {
  const domain = extractDomain(url);
  if (!domain) return '';

  const memoryCached = faviconCache.get(domain);
  if (memoryCached) return memoryCached;

  const storageCached = loadFaviconFromStorage(domain);
  if (storageCached) {
    faviconCache.set(domain, storageCached);
    evictOldestFromCache();
    return storageCached;
  }

  const faviconUrl = `https://www.faviconextractor.com/favicon/${domain}?larger=true`;
  faviconCache.set(domain, faviconUrl);
  evictOldestFromCache();
  saveFaviconToStorage(domain, faviconUrl);

  return faviconUrl;
}

export function getFallbackFaviconUrl(url: string): string {
  const domain = extractDomain(url);
  if (!domain) return '';

  return `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
}
