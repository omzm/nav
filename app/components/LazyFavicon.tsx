'use client';

import { ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { getFallbackFaviconUrl, getFaviconUrl, extractDomain, removeFaviconFromStorage } from '../utils/favicon';

interface LazyFaviconProps {
  url: string;
  alt: string;
  className: string;
  fallback: ReactNode;
}

export default function LazyFavicon({ url, alt, className, fallback }: LazyFaviconProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const [shouldLoad, setShouldLoad] = useState(false);
  const [useFallback, setUseFallback] = useState(false);
  const [imgError, setImgError] = useState(false);

  // URL 变化时重置失败状态：避免旧地址的失败记忆污染新地址
  const [prevUrl, setPrevUrl] = useState(url);
  if (prevUrl !== url) {
    setPrevUrl(url);
    setUseFallback(false);
    setImgError(false);
  }

  useEffect(() => {
    if (shouldLoad) return;

    const node = ref.current;
    if (!node) return;

    if (!('IntersectionObserver' in window)) {
      const timer = setTimeout(() => setShouldLoad(true), 0);
      return () => clearTimeout(timer);
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShouldLoad(true);
          observer.disconnect();
        }
      },
      {
        // 提前量设为 0：图标只在真正进入视口时才开始加载（对比测试用，之前为 240px）
        rootMargin: '0px 0px',
        threshold: 0.01,
      }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [shouldLoad]);

  const faviconUrl = useMemo(() => {
    if (!shouldLoad || imgError) return '';
    return useFallback ? getFallbackFaviconUrl(url) : getFaviconUrl(url);
  }, [imgError, shouldLoad, url, useFallback]);

  const handleImageError = () => {
    if (!useFallback) {
      // 主源失败：删掉已持久化的坏 URL，下次重载直接走降级，不再踩坑
      removeFaviconFromStorage(extractDomain(url));
      setUseFallback(true);
      setImgError(false);
      return;
    }

    setImgError(true);
  };

  return (
    <span ref={ref} className="inline-flex items-center justify-center">
      {faviconUrl ? (
        <img
          src={faviconUrl}
          alt={alt}
          className={className}
          onError={handleImageError}
          loading="lazy"
          decoding="async"
        />
      ) : (
        fallback
      )}
    </span>
  );
}
