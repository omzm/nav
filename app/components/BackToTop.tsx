'use client';

import { useState, useEffect } from 'react';
import { throttle } from '../utils/throttle';

export default function BackToTop() {
  const [scrollPercent, setScrollPercent] = useState(0);

  useEffect(() => {
    const updateProgress = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const percent = docHeight > 0 ? Math.min(scrollTop / docHeight, 1) : 0;
      setScrollPercent(percent);
    };

    const throttledUpdate = throttle(updateProgress, 50);

    window.addEventListener('scroll', throttledUpdate, { passive: true });
    updateProgress();

    return () => window.removeEventListener('scroll', throttledUpdate);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  // SVG 圆环参数
  const radius = 22;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - scrollPercent);

  return (
    <button
      onClick={scrollToTop}
      className="fixed bottom-6 sm:bottom-8 right-4 sm:right-6 z-50 w-12 h-12 rounded-full bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-300 shadow-md hover:shadow-lg flex items-center justify-center group"
      aria-label="返回顶部"
    >
      {/* 进度圆环 */}
      <svg className="absolute inset-0 w-12 h-12 -rotate-90" viewBox="0 0 48 48">
        <circle
          cx="24"
          cy="24"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="text-gray-200 dark:text-gray-600"
        />
        <circle
          cx="24"
          cy="24"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className="text-blue-500 dark:text-blue-400 transition-[stroke-dashoffset] duration-150"
        />
      </svg>
      {/* 箭头图标 / 百分比 */}
      {scrollPercent > 0 ? (
        <svg
          className="relative w-5 h-5 text-gray-600 dark:text-gray-300 transition-transform duration-300 group-hover:-translate-y-0.5"
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
      ) : (
        <span className="relative text-xs font-medium text-gray-400 dark:text-gray-500">0%</span>
      )}
    </button>
  );
}
