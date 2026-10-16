'use client';

import { useCallback, useMemo, useState } from 'react';
import Image from 'next/image';
import SearchBar from './SearchBar';
import CategorySection from './CategorySection';
import ThemeToggle from './ThemeToggle';
import BackToTop from './BackToTop';
import RefreshButton from './RefreshButton';
import Sidebar from './Sidebar';
import { useDailyQuote } from './home/useDailyQuote';
import { useSiteAnalytics } from './home/useSiteAnalytics';
import { useKeyboardShortcuts } from './home/useKeyboardShortcuts';
import { useScrollState } from './home/useScrollState';
import { useAdminRefresh } from './home/useAdminRefresh';
import { usePrivateUnlock } from './home/usePrivateUnlock';
import type { NavCategory, NavSnapshot } from '../types';

interface HomeClientProps {
  snapshot: NavSnapshot;
  submitEnabled: boolean;
  version: string;
}

export default function HomeClient({ snapshot, submitEnabled, version }: HomeClientProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const dailyQuote = useDailyQuote();
  useSiteAnalytics();
  useKeyboardShortcuts();
  const { scrolledPastHeader, headerRef } = useScrollState();
  const { canRefresh, isRefreshButtonBusy, handleRefresh } = useAdminRefresh();
  const {
    searchQuery,
    showPrivate,
    privateCategories,
    handleSearchChange,
    handleSearchFocus,
    clearSearchQuery,
    exitPrivateMode,
  } = usePrivateUnlock();

  const normalizedQuery = searchQuery.trim().toLowerCase();

  const handleSelectCategory = useCallback((categoryId: string | null) => {
    setSelectedCategory(categoryId);
    clearSearchQuery();

    window.setTimeout(() => {
      if (!categoryId) {
        headerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
      }

      document
        .getElementById(`category-${categoryId}`)
        ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 0);
  }, [clearSearchQuery, headerRef]);

  const sidebarCategories = useMemo<NavCategory[]>(() => {
    // 快照只含公开数据；私密数据仅"开门"成功后由服务端下发。
    // 这里仍显式过滤 isPrivate，保证 SQL 迁移前后的过渡期行为一致。
    const publicCategories = snapshot.categories
      .filter((category) => !category.isPrivate)
      .map((category) => ({
        ...category,
        links: category.links.filter((link) => !link.isPrivate),
      }));

    if (!showPrivate) {
      return publicCategories;
    }

    // 私密分类按后台 order 归位（与原来"开门"前就在快照里时的顺序一致），
    // 而不是一律沉底；旧快照没有 order 时保持原有相对顺序。
    return [...publicCategories, ...privateCategories].sort(
      (a, b) => (a.order ?? Number.MAX_SAFE_INTEGER) - (b.order ?? Number.MAX_SAFE_INTEGER)
    );
  }, [snapshot.categories, showPrivate, privateCategories]);

  const filteredCategories = useMemo<NavCategory[]>(() => {
    const result = sidebarCategories;

    if (!normalizedQuery) {
      return result;
    }

    return result
      .map((category) => {
        const links = category.links.filter((link) => {
          const haystack = `${link.title} ${link.description}`.toLowerCase();
          return haystack.includes(normalizedQuery);
        });

        return links.length === category.links.length ? category : { ...category, links };
      })
      .filter((category) => category.links.length > 0);
  }, [normalizedQuery, sidebarCategories]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors flex">
      <ThemeToggle />
      {canRefresh && <RefreshButton onRefresh={handleRefresh} isRefreshing={isRefreshButtonBusy} />}
      <BackToTop />

      <Sidebar
        categories={sidebarCategories}
        selectedCategory={selectedCategory}
        onSelectCategory={handleSelectCategory}
        isOpen={isSidebarOpen}
        onToggle={() => setIsSidebarOpen((value) => !value)}
        hotLinks={snapshot.hotLinks}
        submitEnabled={submitEnabled}
        version={version}
      />

      <div className="flex-1 flex flex-col min-w-0 lg:ml-64">
        <div className={`fixed top-0 left-0 right-0 z-10 lg:hidden bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700/50 shadow-sm transition-transform duration-300 ${
          scrolledPastHeader ? 'translate-y-0' : '-translate-y-full'
        }`}>
          <div className="flex items-center justify-between px-4 py-2">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg overflow-hidden">
                <Image src="/icon.svg" alt="Logo" width={28} height={28} className="w-full h-full object-cover" />
              </div>
              <span className="text-sm font-bold text-gray-900 dark:text-gray-100">收藏夹</span>
            </div>
            <button
              onClick={() => setIsSidebarOpen((value) => !value)}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              aria-label="打开侧边栏"
            >
              <svg className="w-6 h-6 text-gray-700 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>

        <header ref={headerRef} className="relative overflow-hidden border-b border-gray-200 dark:border-gray-700/50 shadow-sm">
          <div
            className="absolute inset-0 bg-cover bg-center bg-gradient-to-br from-blue-400 to-indigo-600"
            style={{ backgroundImage: "url('/api/bing-wallpaper')" }}
          />

          <div className="relative px-4 py-8 sm:py-10">
            <div className="flex items-center justify-end mb-2 lg:hidden">
              <button
                onClick={() => setIsSidebarOpen((value) => !value)}
                className="p-2 transition-all duration-300"
                aria-label="打开侧边栏"
              >
                <svg className="w-6 h-6 text-white drop-shadow-lg" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>

            <div className="text-center mb-2">
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white drop-shadow-lg">
                收藏夹
              </h1>
            </div>

            <div className="flex justify-center px-2 sm:px-0">
              <div className="w-full max-w-md">
                <SearchBar value={searchQuery} onChange={handleSearchChange} onFocus={handleSearchFocus} />
              </div>
            </div>
            <div className="flex justify-center px-2 sm:px-0 mt-3 sm:mt-4">
              <div className="w-full max-w-md px-3 py-1 rounded-full bg-white/60 dark:bg-gray-800/60 backdrop-blur-md text-gray-500 dark:text-gray-500 text-[10px] sm:text-xs text-center shadow-sm transition-all duration-300 hover:bg-white/70 dark:hover:bg-gray-800/70 hover:shadow-md leading-tight">
                {dailyQuote || ' '}
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-6 lg:py-8">
          <div className="max-w-[1600px] mx-auto">
            {showPrivate && (
              <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-900/20 border-2 border-amber-200 dark:border-amber-700 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🔐</span>
                  <div>
                    <p className="text-sm font-semibold text-amber-900 dark:text-amber-100">
                      隐私模式已开启
                    </p>
                    <p className="text-xs text-amber-700 dark:text-amber-300">
                      正在显示隐藏的分类和链接
                    </p>
                  </div>
                </div>
                <button
                  onClick={exitPrivateMode}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  退出隐私模式
                </button>
              </div>
            )}

            {filteredCategories.length > 0 ? (
              filteredCategories.map((category) => (
                <CategorySection key={category.id} category={category} />
              ))
            ) : (
              <div className="text-center py-20">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gray-100 dark:bg-gray-800 mb-4">
                  <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="text-gray-500 dark:text-gray-400 text-lg font-medium">
                  没有找到匹配的结果
                </p>
                <p className="text-gray-400 dark:text-gray-500 text-sm mt-2">
                  试试其他关键词或选择不同的分类
                </p>
              </div>
            )}
          </div>
        </main>

        <footer className="bg-white/80 dark:bg-gray-900/50 backdrop-blur-xl border-t border-gray-200 dark:border-gray-700/50">
          <div className="px-4 lg:px-6 py-4 sm:py-5 lg:py-6">
            <div className="max-w-4xl mx-auto space-y-3">
              <div className="text-center">
                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-500">
                  内容来源于互联网，如有侵权，请联系删除
                  <a
                    href="mailto:anchen770@gmail.com"
                    aria-label="发送邮件联系删除"
                    className="ml-1.5 inline-flex align-middle text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </a>
                </p>
              </div>

              <div className="text-center">
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                  © {new Date().getFullYear()} 收藏夹 - 一些常用的工具 |
                  <a
                    href="https://github.com/omzm/nav"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-1 font-semibold text-gray-900 dark:text-gray-100 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                  >
                    GitHub
                  </a>
                </p>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
