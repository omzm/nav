'use client';

import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import { HotLink, NavCategory } from '../types';
import CategoryIcon from './CategoryIcon';
import LazyFavicon from './LazyFavicon';
import SubmitLinkEntry, { SubmitCategory } from './SubmitLinkEntry';

interface SidebarProps {
  categories: NavCategory[];
  selectedCategory: string | null;
  onSelectCategory: (categoryId: string | null) => void;
  isOpen: boolean;
  onToggle: () => void;
  hotLinks?: HotLink[];
  submitEnabled?: boolean;
  version: string;
}

// 建站日期：如需调整"已稳定运行"的起始时间，改这里即可
const START_DATE = new Date('2026-02-16T00:00:00');
const ALL_CATEGORIES_ICON = `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M3 10.75L12 3l9 7.75" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M5.5 9.75V20h13V9.75" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M9.5 20v-6h5v6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

const RunTimer = memo(function RunTimer() {
  // 每秒更新一次，显示 天/时/分/秒
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const diff = Math.max(0, now - START_DATE.getTime());
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor(diff / 3600000) % 24;
  const minutes = Math.floor(diff / 60000) % 60;
  const seconds = Math.floor(diff / 1000) % 60;

  return (
    <div className="flex items-center justify-center gap-1 tabular-nums">
      <span>⏱️</span>
      <span>已稳定运行 {days} 天 {hours} 时 {minutes} 分 {seconds} 秒</span>
    </div>
  );
});

interface CategoryListProps {
  categories: NavCategory[];
  selectedCategory: string | null;
  onCategoryClick: (categoryId: string | null) => void;
  // 侧边栏每次打开时递增；>0 时分类项播放 stagger 入场动画
  enterKey: number;
}

const CategoryList = memo(function CategoryList({
  categories,
  selectedCategory,
  onCategoryClick,
  enterKey,
}: CategoryListProps) {
  const animate = enterKey > 0;
  return (
    <nav key={enterKey} className="flex-1 overflow-y-auto p-2 sm:p-3 space-y-1">
      <button
        onClick={() => onCategoryClick(null)}
        style={animate ? { animationDelay: '0ms' } : undefined}
        className={`w-full text-left px-2.5 sm:px-3 py-2 sm:py-2.5 rounded-lg transition-all duration-300 group ${
          animate ? 'sidebar-item-enter' : ''
        } ${
          selectedCategory === null
            ? 'bg-gray-100 dark:bg-gray-800/50'
            : 'hover:bg-gray-100 dark:hover:bg-gray-800/50'
        }`}
      >
        <span className="flex items-center space-x-2 sm:space-x-2.5">
          <span className={`text-sm sm:text-base transition-transform duration-300 ${selectedCategory === null ? 'scale-110' : 'group-hover:scale-110'}`}>
            <CategoryIcon icon={ALL_CATEGORIES_ICON} />
          </span>
          <span className={`text-xs sm:text-sm font-medium transition-colors duration-300 ${
            selectedCategory === null
              ? 'text-blue-500 dark:text-blue-400'
              : 'text-gray-700 dark:text-gray-300'
          }`}>全部分类</span>
        </span>
      </button>

      {categories.map((category, index) => (
        <button
          key={category.id}
          onClick={() => onCategoryClick(category.id)}
          style={animate ? { animationDelay: `${Math.min(index + 1, 10) * 30}ms` } : undefined}
          className={`w-full text-left px-2.5 sm:px-3 py-2 sm:py-2.5 rounded-lg transition-all duration-300 group ${
            animate ? 'sidebar-item-enter' : ''
          } ${
            selectedCategory === category.id
              ? 'bg-gray-100 dark:bg-gray-800/50'
              : 'hover:bg-gray-100 dark:hover:bg-gray-800/50'
          }`}
        >
          <span className="flex items-center space-x-2 sm:space-x-2.5">
            <span className={`text-sm sm:text-base transition-transform duration-300 ${selectedCategory === category.id ? 'scale-110' : 'group-hover:scale-110'}`}>
              <CategoryIcon icon={category.icon} />
            </span>
            <span className={`text-xs sm:text-sm font-medium transition-colors duration-300 ${
              selectedCategory === category.id
                ? 'text-blue-500 dark:text-blue-400'
                : 'text-gray-700 dark:text-gray-300'
            }`}>{category.name}</span>
          </span>
        </button>
      ))}
    </nav>
  );
});

const HotLinksPanel = memo(function HotLinksPanel({ hotLinks }: { hotLinks?: HotLink[] }) {
  if (!hotLinks?.length) return null;

  return (
    <div className="px-2 sm:px-3 pb-2 sm:pb-3">
      <div className="border-t border-gray-200 dark:border-gray-700/50 pt-2 sm:pt-3">
        <h3 className="px-2.5 sm:px-3 mb-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
          今日热门
        </h3>
        <div className="space-y-0.5">
          {hotLinks.map((link, index) => (
            <a
              key={link.url}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800/50 transition-colors group"
            >
              <span className="text-xs font-bold text-gray-400 dark:text-gray-500 w-4 text-center">
                {index + 1}
              </span>
              <LazyFavicon
                url={link.url}
                alt=""
                className="w-4 h-4 object-contain flex-shrink-0"
                fallback={<span className="w-4 h-4 rounded-sm bg-gray-200 dark:bg-gray-700 flex-shrink-0" />}
              />
              <span className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 truncate flex-1 group-hover:text-blue-500 dark:group-hover:text-blue-400 transition-colors">
                {link.title}
              </span>
              <span className="text-[10px] text-gray-400 dark:text-gray-500 tabular-nums">
                {link.clickCount}
              </span>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
});

export default function Sidebar({
  categories,
  selectedCategory,
  onSelectCategory,
  isOpen,
  onToggle,
  hotLinks,
  submitEnabled = false,
  version,
}: SidebarProps) {
  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // 侧边栏每次打开时递增，驱动分类项的 stagger 入场动画
  const [openCount, setOpenCount] = useState(0);
  const wasOpenRef = useRef(isOpen);
  useEffect(() => {
    if (isOpen && !wasOpenRef.current) {
      setOpenCount((c) => c + 1);
    }
    wasOpenRef.current = isOpen;
  }, [isOpen]);

  const handleCategoryClick = useCallback(
    (categoryId: string | null) => {
      onSelectCategory(categoryId);
      if (window.innerWidth < 1024) {
        onToggle();
      }
    },
    [onSelectCategory, onToggle]
  );

  // 提交收录弹窗用的分类下拉数据（只取需要的字段）
  const submitCategories = useMemo<SubmitCategory[]>(
    () =>
      categories.map((category) => ({
        id: category.id,
        name: category.name,
        isPrivate: Boolean(category.isPrivate),
      })),
    [categories]
  );

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-20 lg:hidden animate-fade-in"
          onClick={onToggle}
        />
      )}

      <aside
        className={`fixed top-0 left-0 h-full bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl z-30 transition-[transform,visibility] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] ${
          isOpen ? 'translate-x-0' : '-translate-x-full invisible'
        } lg:translate-x-0 lg:visible lg:static lg:z-0 w-56 sm:w-64 flex flex-col shadow-2xl lg:shadow-none border-r border-gray-200 dark:border-gray-700/50`}
      >
        <div className="p-3 sm:p-4 border-b border-gray-200 dark:border-gray-700/50 flex items-center justify-between bg-gray-50 dark:bg-gray-800/50">
          <div className="flex items-center space-x-2 sm:space-x-2.5">
            <Image src="/icon.svg" alt="Logo" width={32} height={32} className="w-7 h-7 sm:w-8 sm:h-8" />
            <h2 className="text-sm sm:text-base font-bold text-gray-900 dark:text-gray-100">
              分类
            </h2>
          </div>
          <button
            onClick={onToggle}
            className="lg:hidden p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800/50 transition-colors"
            aria-label="关闭侧边栏"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <CategoryList
          categories={categories}
          selectedCategory={selectedCategory}
          onCategoryClick={handleCategoryClick}
          enterKey={openCount}
        />

        <HotLinksPanel hotLinks={hotLinks} />

        <div className="p-2.5 sm:p-3 border-t border-gray-200 dark:border-gray-700/50 space-y-2">
          <SubmitLinkEntry
            categories={submitCategories}
            enabled={submitEnabled}
            defaultCategoryId={selectedCategory}
          />
          <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
            <RunTimer />
          </div>
          <div className="text-xs text-gray-400 dark:text-gray-500 text-center">
            v{version} · © 2026
          </div>
        </div>
      </aside>
    </>
  );
}
