/**
 * 内存滑动窗口限流（serverless 实例级）。
 * 目标：防脚本刷点击/浏览量，保护热门榜与 DB 写负载。精度要求不高，
 * 跨实例的极端刷量不在本层解决。
 *
 * 内存保护：不再被访问的 key 会堆积（比如攻击者用随机 key 刷），
 * 因此加了定期全量清扫 + 硬上限（删最老的 key），避免内存无限增长。
 */
const hits = new Map<string, number[]>();
const MAX_KEYS = 10_000;
let lastSweep = 0;

export function isRateLimited(key: string, limit: number, windowMs = 60_000): boolean {
  const now = Date.now();

  // 定期清扫：一个窗口期最多扫一次，删掉窗口内已无命中的 key
  if (now - lastSweep > windowMs && hits.size > 0) {
    lastSweep = now;
    for (const [k, list] of hits) {
      if (!list.some((t) => now - t < windowMs)) {
        hits.delete(k);
      }
    }
  }

  const list = hits.get(key);
  const fresh = list ? list.filter((t) => now - t < windowMs) : [];
  if (fresh.length >= limit) {
    hits.set(key, fresh);
    return true;
  }
  fresh.push(now);
  hits.set(key, fresh);

  // 硬上限：仍超限时删最老的 key（Map 按插入顺序排列）
  if (hits.size > MAX_KEYS) {
    const oldest = hits.keys().next().value;
    if (oldest !== undefined && oldest !== key) {
      hits.delete(oldest);
    }
  }

  return false;
}

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return request.headers.get('x-real-ip') || 'unknown';
}
