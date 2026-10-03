'use client';

import { memo } from 'react';
import { NavLink } from '../types';
import LazyFavicon from './LazyFavicon';

interface NavCardProps {
  link: NavLink;
}

function DefaultLinkIcon() {
  return (
    <svg className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"
      />
    </svg>
  );
}

function NavCard({ link }: NavCardProps) {
  const handleClick = () => {
    if (!link.id) return;

    const body = JSON.stringify({ linkId: link.id });

    const reportViaFetch = () => {
      fetch('/api/link-click', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        keepalive: true,
      }).catch((error) => {
        console.error('Failed to report link click:', error);
      });
    };

    // sendBeacon 返回 false 表示未能加入发送队列，降级用 fetch 补发，避免点击静默丢失
    if (typeof navigator.sendBeacon === 'function') {
      const blob = new Blob([body], { type: 'application/json' });
      try {
        if (navigator.sendBeacon('/api/link-click', blob)) return;
      } catch {
        // 忽略异常，走下面的 fetch 补发
      }
    }

    reportViaFetch();
  };

  return (
    <a
      href={link.url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={handleClick}
      className="group relative block min-h-[74px] sm:min-h-0 p-3 sm:p-4 rounded-lg border border-gray-200 dark:border-gray-700/60 bg-white/80 dark:bg-gray-800/50 backdrop-blur-sm hover:shadow-xl hover:shadow-gray-200/50 dark:hover:shadow-gray-500/5 hover:border-gray-300 dark:hover:border-gray-500/50 transition-all duration-300 hover:-translate-y-1 overflow-hidden active:scale-95"
    >
      <div className="absolute inset-0 bg-gray-50 dark:bg-gray-700/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

      <div className="relative flex h-full items-center justify-start gap-2.5 text-left sm:h-auto sm:items-start sm:gap-0 sm:space-x-3">
        <div className="flex-shrink-0 w-7 h-7 sm:w-10 sm:h-10 flex items-center justify-center rounded-md sm:rounded-lg bg-gray-50 dark:bg-gray-700/50 group-hover:scale-110 transition-transform duration-300 overflow-hidden">
          <LazyFavicon
            url={link.url}
            alt={`${link.title} icon`}
            className="w-4 h-4 sm:w-6 sm:h-6 object-contain"
            fallback={link.icon ? <span className="text-base sm:text-xl">{link.icon}</span> : <DefaultLinkIcon />}
          />
        </div>

        <div className="w-full flex-1 min-w-0 flex flex-col">
          <div className="flex items-start justify-start gap-2 sm:justify-between">
            <h3 className="max-w-full truncate text-xs leading-4 sm:text-sm sm:leading-normal font-medium sm:font-normal text-gray-900 dark:text-gray-100 group-hover:text-gray-700 dark:group-hover:text-gray-200 transition-colors duration-300">
              {link.title}
            </h3>
            <svg
              className="hidden sm:block w-3.5 h-3.5 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 flex-shrink-0 mt-0.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform duration-300"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
              />
            </svg>
          </div>
          <p className="mt-1 truncate text-[11px] leading-4 text-gray-600 dark:text-gray-400 sm:mt-1.5 sm:text-xs sm:leading-normal">
            {link.description}
          </p>
        </div>
      </div>
    </a>
  );
}

export default memo(NavCard, (prevProps, nextProps) => {
  return (
    prevProps.link.id === nextProps.link.id &&
    prevProps.link.url === nextProps.link.url &&
    prevProps.link.title === nextProps.link.title &&
    prevProps.link.description === nextProps.link.description &&
    prevProps.link.icon === nextProps.link.icon &&
    prevProps.link.isPrivate === nextProps.link.isPrivate
  );
});
