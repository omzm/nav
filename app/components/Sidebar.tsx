'use client';

import { memo, useEffect, useMemo, useState } from 'react';
import { HotLink, NavCategory } from '../types';
import { getFaviconUrl } from '../utils/favicon';
import CategoryIcon from './CategoryIcon';

interface SidebarProps {
  categories: NavCategory[];
  selectedCategory: string | null;
  onSelectCategory: (categoryId: string | null) => void;
  isOpen: boolean;
  onToggle: () => void;
  hotLinks?: HotLink[];
}

const START_DATE = new Date('2026-02-16T00:00:00');

function getRunDays() {
  const diff = Date.now() - START_DATE.getTime();
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
}

const RunTimer = memo(function RunTimer() {
  const [days, setDays] = useState(getRunDays);

  useEffect(() => {
    const update = () => setDays(getRunDays());
    update();
    const timer = window.setInterval(update, 60 * 1000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className="flex items-center justify-center gap-1">
      <span>⏱️</span>
      <span>已运行 {days} 天</span>
    </div>
  );
});

interface CategoryListProps {
  categories: NavCategory[];
  selectedCategory: string | null;
  onCategoryClick: (categoryId: string | null) => void;
}

const CategoryList = memo(function CategoryList({
  categories,
  selectedCategory,
  onCategoryClick,
}: CategoryListProps) {
  return (
    <nav className="flex-1 overflow-y-auto p-2 sm:p-3 space-y-1">
      <button
        onClick={() => onCategoryClick(null)}
        className={`w-full text-left px-2.5 sm:px-3 py-2 sm:py-2.5 rounded-lg transition-all duration-300 group ${
          selectedCategory === null
            ? 'bg-gray-100 dark:bg-gray-800/50'
            : 'hover:bg-gray-100 dark:hover:bg-gray-800/50'
        }`}
      >
        <span className="flex items-center space-x-2 sm:space-x-2.5">
          <span className={`text-sm sm:text-base transition-transform duration-300 ${selectedCategory === null ? 'scale-110' : 'group-hover:scale-110'}`}>
            🏠
          </span>
          <span className={`text-xs sm:text-sm font-medium transition-colors duration-300 ${
            selectedCategory === null
              ? 'text-blue-500 dark:text-blue-400'
              : 'text-gray-700 dark:text-gray-300'
          }`}>全部分类</span>
        </span>
      </button>

      {categories.map((category) => (
        <button
          key={category.id}
          onClick={() => onCategoryClick(category.id)}
          className={`w-full text-left px-2.5 sm:px-3 py-2 sm:py-2.5 rounded-lg transition-all duration-300 group ${
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
              <img
                src={getFaviconUrl(link.url)}
                alt=""
                className="w-4 h-4 object-contain flex-shrink-0"
                loading="lazy"
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
}: SidebarProps) {
  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handleCategoryClick = (categoryId: string | null) => {
    onSelectCategory(categoryId);
    if (window.innerWidth < 1024) {
      onToggle();
    }
  };

  const categoryCountText = useMemo(() => `共 ${categories.length} 个分类`, [categories.length]);

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-20 lg:hidden animate-fade-in"
          onClick={onToggle}
        />
      )}

      <aside
        className={`fixed top-0 left-0 h-full bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl z-30 transition-transform duration-300 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0 lg:static lg:z-0 w-56 sm:w-64 flex flex-col shadow-2xl lg:shadow-none border-r border-gray-200 dark:border-gray-700/50`}
      >
        <div className="p-3 sm:p-4 border-b border-gray-200 dark:border-gray-700/50 flex items-center justify-between bg-gray-50 dark:bg-gray-800/50">
          <div className="flex items-center space-x-2 sm:space-x-2.5">
            <img src="/icon.svg" alt="Logo" className="w-7 h-7 sm:w-8 sm:h-8" />
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
        />

        <HotLinksPanel hotLinks={hotLinks} />

        <div className="p-2.5 sm:p-3 border-t border-gray-200 dark:border-gray-700/50 space-y-2">
          <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
            {categoryCountText}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
            <RunTimer />
          </div>
        </div>
      </aside>
    </>
  );
}
