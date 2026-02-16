'use client';

import { useState } from 'react';
import { NavLink } from '../types';
import { getFaviconUrl, getFallbackFaviconUrl } from '../utils/favicon';

interface NavCardProps {
  link: NavLink;
}

export default function NavCard({ link }: NavCardProps) {
  const [imgError, setImgError] = useState(false);
  const [useFallback, setUseFallback] = useState(false);

  const faviconUrl = useFallback ? getFallbackFaviconUrl(link.url) : getFaviconUrl(link.url);

  const handleImageError = () => {
    if (!useFallback) {
      // 第一次失败，尝试使用备用源
      setUseFallback(true);
      setImgError(false);
    } else {
      // 备用源也失败，显示默认图标
      setImgError(true);
    }
  };

  return (
    <a
      href={link.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group relative block p-3 sm:p-4 rounded-lg border border-gray-200 dark:border-gray-700/60 bg-white/80 dark:bg-gray-800/50 backdrop-blur-sm hover:shadow-xl hover:shadow-gray-200/50 dark:hover:shadow-gray-500/5 hover:border-gray-300 dark:hover:border-gray-500/50 transition-all duration-300 hover:-translate-y-1 overflow-hidden active:scale-95"
    >
      {/* 背景效果 */}
      <div className="absolute inset-0 bg-gray-50 dark:bg-gray-700/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

      <div className="relative flex items-start space-x-3">
        {/* 网站图标 */}
        <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-lg bg-gray-50 dark:bg-gray-700/50 group-hover:scale-110 transition-transform duration-300 overflow-hidden">
          {!imgError && faviconUrl ? (
            <img
              src={faviconUrl}
              alt={`${link.title} icon`}
              className="w-6 h-6 object-contain"
              onError={handleImageError}
              loading="lazy"
            />
          ) : link.icon ? (
            <span className="text-xl">{link.icon}</span>
          ) : (
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
            </svg>
          )}
        </div>

        {/* 内容 */}
        <div className="flex-1 min-w-0 flex flex-col">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 group-hover:text-gray-700 dark:group-hover:text-gray-200 transition-colors duration-300 line-clamp-1">
              {link.title}
            </h3>
            <svg className="w-3.5 h-3.5 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 flex-shrink-0 mt-0.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </div>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1.5 truncate">
            {link.description}
          </p>
        </div>
      </div>
    </a>
  );
}
