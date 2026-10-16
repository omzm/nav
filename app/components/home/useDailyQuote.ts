'use client';

import { useEffect, useState } from 'react';

/**
 * 每日一言：客户端挂载后异步拉取，不阻塞首屏；
 * 加载前返回空字符串，调用方用占位符撑住高度避免布局抖动。
 */
export function useDailyQuote(): string {
  const [dailyQuote, setDailyQuote] = useState('');

  useEffect(() => {
    let active = true;
    fetch('/api/daily-quote')
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (active && typeof data?.quote === 'string' && data.quote) {
          setDailyQuote(data.quote);
        }
      })
      .catch(() => {
        // 一言加载失败不影响主体功能，保持占位即可
      });
    return () => {
      active = false;
    };
  }, []);

  return dailyQuote;
}
