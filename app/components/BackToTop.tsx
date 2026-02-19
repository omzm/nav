'use client';

import { useState, useEffect } from 'react';
import { throttle } from '../utils/throttle';

export default function BackToTop() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const toggleVisibility = () => {
      // 滚动超过 300px 时显示按钮
      if (window.scrollY > 300) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    // 使用节流优化，每 200ms 最多执行一次
    const throttledToggle = throttle(toggleVisibility, 200);

    window.addEventListener('scroll', throttledToggle, { passive: true });

    return () => window.removeEventListener('scroll', throttledToggle);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  return (
    <>
      {isVisible && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-32 sm:bottom-36 right-4 sm:right-6 z-50 w-10 h-10 rounded-full bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-600 transition-all duration-300 shadow-md hover:shadow-lg flex items-center justify-center group"
          aria-label="返回顶部"
        >
          <svg
            className="w-5 h-5 text-gray-600 dark:text-gray-300 transition-transform duration-300 group-hover:-translate-y-0.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 10l7-7m0 0l7 7m-7-7v18"
            />
          </svg>
        </button>
      )}
    </>
  );
}
