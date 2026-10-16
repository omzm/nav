'use client';

import { useCallback, useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { hasAdminSession } from '../../actions/adminSession';
import { revalidateNavSnapshot } from '../../actions/revalidateNavSnapshot';

/**
 * 管理员刷新：刷新按钮仅管理员可见（安全修复 S4：公开刷新可被滥用打穿缓存）。
 *
 * 性能优化：会话查询延迟到浏览器空闲时执行（避开首屏关键路径），结果缓存到
 * sessionStorage，同一标签页会话内只查一次。注意登出不会清这个 hint，
 * 但刷新操作本身有服务端鉴权，最坏情况只是按钮多显示一次。
 */
export function useAdminRefresh(): {
  canRefresh: boolean;
  isRefreshButtonBusy: boolean;
  handleRefresh: () => void;
} {
  const router = useRouter();
  const [canRefresh, setCanRefresh] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isRefreshPending, startRefreshTransition] = useTransition();

  useEffect(() => {
    let active = true;
    const ADMIN_SESSION_HINT_KEY = 'nav_admin_hint';

    const resolve = (ok: boolean) => {
      if (active) setCanRefresh(ok);
    };

    try {
      const cached = sessionStorage.getItem(ADMIN_SESSION_HINT_KEY);
      if (cached !== null) {
        resolve(cached === '1');
        return;
      }
    } catch {
      // sessionStorage 不可用时降级为直接查询
    }

    const query = () => {
      hasAdminSession()
        .then((ok) => {
          try {
            sessionStorage.setItem(ADMIN_SESSION_HINT_KEY, ok ? '1' : '0');
          } catch {
            // 忽略缓存写入失败，不影响功能
          }
          resolve(ok);
        })
        .catch(() => {
          resolve(false);
        });
    };

    let idleHandle: number | undefined;
    let timeoutHandle: number | undefined;
    if (typeof window.requestIdleCallback === 'function') {
      idleHandle = window.requestIdleCallback(query, { timeout: 3000 });
    } else {
      timeoutHandle = window.setTimeout(query, 1500);
    }

    return () => {
      active = false;
      if (idleHandle !== undefined && typeof window.cancelIdleCallback === 'function') {
        window.cancelIdleCallback(idleHandle);
      }
      if (timeoutHandle !== undefined) {
        window.clearTimeout(timeoutHandle);
      }
    };
  }, []);

  const isRefreshButtonBusy = isRefreshing || isRefreshPending;

  const handleRefresh = useCallback(async () => {
    if (isRefreshButtonBusy) return;

    setIsRefreshing(true);

    try {
      await revalidateNavSnapshot();
    } catch (error) {
      console.error('Failed to refresh nav snapshot:', error);
    } finally {
      startRefreshTransition(() => {
        router.refresh();
      });
      setIsRefreshing(false);
    }
  }, [isRefreshButtonBusy, router, startRefreshTransition]);

  return { canRefresh, isRefreshButtonBusy, handleRefresh };
}
