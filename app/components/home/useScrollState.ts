'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * 滚动状态：跟踪页面是否已滚过 header 区域（移动端顶栏显隐用）。
 * 返回 headerRef（绑到 header 元素）与 scrolledPastHeader 状态。
 */
export function useScrollState(): {
  scrolledPastHeader: boolean;
  headerRef: React.RefObject<HTMLElement | null>;
} {
  const [scrolledPastHeader, setScrolledPastHeader] = useState(false);
  const headerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      if (!headerRef.current) return;
      setScrolledPastHeader(headerRef.current.getBoundingClientRect().bottom <= 0);
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return { scrolledPastHeader, headerRef };
}
