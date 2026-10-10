'use client';

import { useCallback, useSyncExternalStore } from 'react';

/**
 * 监听 CSS 媒体查询，返回当前是否匹配。
 * 服务端渲染时返回 false（与首屏 hydration 一致），客户端挂载后按实际视口更新。
 * @param query 媒体查询字符串，例如 '(max-width: 767px)'（需与 CSS 断点保持一致）
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return () => {};
      const mql = window.matchMedia(query);
      mql.addEventListener('change', onChange);
      return () => mql.removeEventListener('change', onChange);
    },
    [query]
  );
  const getSnapshot = useCallback(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
    return window.matchMedia(query).matches;
  }, [query]);
  const getServerSnapshot = useCallback(() => false, []);
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
