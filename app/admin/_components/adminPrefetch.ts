// 后台数据预取：layout 做鉴权的同时就发起数据查询，与鉴权并行，
// dashboard 挂载后直接消费，省去"鉴权完再查数据"的串行等待。
import { supabase, Category, Link as NavLink } from '@/app/lib/supabase';

interface AdminPrefetchResult {
  categories: Category[];
  links: NavLink[];
}

interface PendingPrefetch {
  promise: Promise<AdminPrefetchResult>;
  startedAt: number;
}

let pending: PendingPrefetch | null = null;

export function prefetchAdminData(): Promise<AdminPrefetchResult> {
  if (!pending) {
    const promise = Promise.all([
      supabase.from('categories').select('*').order('order', { ascending: true }),
      supabase.from('links').select('*').order('order', { ascending: true }),
    ]).then(([categoriesResult, linksResult]) => {
      if (categoriesResult.error) throw categoriesResult.error;
      if (linksResult.error) throw linksResult.error;
      return {
        categories: categoriesResult.data || [],
        links: linksResult.data || [],
      };
    });
    pending = { promise, startedAt: Date.now() };
    // 预取失败不驻留（比如未登录时 RLS 拒绝），下次走正常加载重试
    promise.catch(() => {
      pending = null;
    });
  }
  return pending.promise;
}

/**
 * 取出预取结果（一次性消费）。超过 maxAgeMs 的预取视为过期返回 null，
 * 调用方回退到正常加载流程。
 */
export function consumeAdminPrefetch(maxAgeMs = 60000): Promise<AdminPrefetchResult> | null {
  const current = pending;
  pending = null;
  if (!current) return null;
  if (Date.now() - current.startedAt > maxAgeMs) return null;
  return current.promise;
}
