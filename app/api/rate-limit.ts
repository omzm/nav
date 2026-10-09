/**
 * 内存滑动窗口限流（serverless 实例级）。
 * 目标：防脚本刷点击/浏览量，保护热门榜与 DB 写负载。精度要求不高，
 * 跨实例的极端刷量不在本层解决。
 */
const hits = new Map<string, number[]>();

export function isRateLimited(key: string, limit: number, windowMs = 60_000): boolean {
  const now = Date.now();
  const list = hits.get(key);
  const fresh = list ? list.filter((t) => now - t < windowMs) : [];
  if (fresh.length >= limit) {
    hits.set(key, fresh);
    return true;
  }
  fresh.push(now);
  hits.set(key, fresh);
  return false;
}

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return request.headers.get('x-real-ip') || 'unknown';
}
