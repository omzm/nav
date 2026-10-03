'use client';

import { useEffect, useState } from 'react';

/**
 * 监听 CSS 媒体查询，返回当前是否匹配。
 * 服务端渲染时返回 false（与首屏 hydration 一致），客户端挂载后按实际视口更新。
 * @param query 媒体查询字符串，例如 '(max-width: 767px)'（需与 CSS 断点保持一致）
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;

    const mediaQueryList = window.matchMedia(query);
    setMatches(mediaQueryList.matches);

    const handleChange = (event: MediaQueryListEvent) => {
      setMatches(event.matches);
    };

    mediaQueryList.addEventListener('change', handleChange);
    return () => {
      mediaQueryList.removeEventListener('change', handleChange);
    };
  }, [query]);

  return matches;
}
