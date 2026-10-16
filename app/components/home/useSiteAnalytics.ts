'use client';

import { useEffect } from 'react';

/**
 * 浏览量上报：页面加载 2 秒后上报一次全站浏览（服务端只记总数，不携带 path）。
 * fire-and-forget，失败不影响主体功能。
 */
export function useSiteAnalytics(): void {
  useEffect(() => {
    const report = () => {
      fetch('/api/site-view', { method: 'POST', keepalive: true }).catch((error) => {
        console.error('Failed to report site view:', error);
      });
    };

    const timer = window.setTimeout(() => {
      // 只上报一次浏览，不携带 path（服务端只记总数）
      // sendBeacon 返回 false 表示未能加入发送队列，降级用 fetch 补发
      if (typeof navigator.sendBeacon === 'function') {
        try {
          if (navigator.sendBeacon('/api/site-view')) return;
        } catch {
          // 忽略异常，走 fetch 补发
        }
      }
      report();
    }, 2000);

    return () => window.clearTimeout(timer);
  }, []);
}
