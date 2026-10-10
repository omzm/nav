'use client';

import { useSyncExternalStore } from 'react';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onFocus?: () => void;
}

export default function SearchBar({ value, onChange, onFocus }: SearchBarProps) {
  // 快捷键修饰键：苹果设备显示 ⌘，其他显示 Ctrl（与 HomeClient 的 keydown 处理一致）
  const modifierLabel = useSyncExternalStore(
    () => () => {},
    () => (/Mac|iPhone|iPad|iPod/.test(navigator.platform || '') ? '⌘' : 'Ctrl'),
    () => 'Ctrl'
  );

  return (
    <div className="relative w-full max-w-md group">
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={onFocus}
        placeholder="搜索..."
        id="search-input"
        aria-label="搜索链接"
        className="w-full px-3 py-2 pl-9 rounded-full bg-white/80 dark:bg-gray-800/80 backdrop-blur-md text-gray-900 dark:text-gray-100 text-sm placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:bg-white/90 dark:focus:bg-gray-800/90 focus:ring-2 focus:ring-white/50 dark:focus:ring-gray-700/50 transition-all duration-300 shadow-lg hover:shadow-xl hover:bg-white/90 dark:hover:bg-gray-800/90"
      />
      <svg
        className="absolute left-2.5 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500 group-focus-within:text-gray-600 dark:group-focus-within:text-gray-300 transition-colors duration-300"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
      {value ? (
        <button
          onClick={() => onChange('')}
          className="absolute right-2.5 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          aria-label="清除搜索"
        >
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      ) : (
        // 快捷键提示：只在细指针设备（键鼠）显示，触屏设备隐藏
        <kbd
          aria-hidden="true"
          title="聚焦搜索框"
          className="pointer-coarse:hidden absolute right-3 top-1/2 transform -translate-y-1/2 hidden sm:inline-flex items-center rounded-md border border-gray-300/70 dark:border-gray-600/70 bg-gray-100/80 dark:bg-gray-700/60 px-1.5 py-0.5 text-[10px] font-medium leading-none text-gray-500 dark:text-gray-400 select-none"
        >
          {modifierLabel} K
        </kbd>
      )}
    </div>
  );
}
