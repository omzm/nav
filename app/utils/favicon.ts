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

/**
 * 获取网站 favicon URL
 * 使用 faviconextractor.com 服务
 */
export function getFaviconUrl(url: string): string {
  const domain = extractDomain(url);
  if (!domain) return '';
  return `https://www.faviconextractor.com/favicon/${domain}?larger=true`;
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
