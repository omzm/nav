'use client';

import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { supabase, Category as DBCategory, Link as DBLink } from './lib/supabase';
import SearchBar from './components/SearchBar';
import VirtualCategories from './components/VirtualCategories';
import ThemeToggle from './components/ThemeToggle';
import BackToTop from './components/BackToTop';
import Sidebar from './components/Sidebar';
import { NavCategory } from './types';
import { loadFromCache, saveToCache, clearCache } from './utils/cache';
import { loadBingWallpaper as loadWallpaper, loadDailyQuote as loadQuote } from './utils/externalApi';
import { preloadFavicons } from './utils/favicon';
import { debounce } from './utils/throttle';

export default function Home() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [categories, setCategories] = useState<NavCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [bingWallpaper, setBingWallpaper] = useState('');
  const [dailyQuote, setDailyQuote] = useState('');
  const [showPrivate, setShowPrivate] = useState(false);
  const [scrolledPastHeader, setScrolledPastHeader] = useState(false);
  const headerRef = useRef<HTMLElement>(null);

  // 防抖实时更新回调
  const debouncedLoadData = useCallback(
    debounce(() => {
      loadFreshData(false);
    }, 1000),
    []
  );

  useEffect(() => {
    loadData();
    // 异步加载外部资源，不阻塞主内容
    loadWallpaper().then(setBingWallpaper);
    loadQuote().then(setDailyQuote);

    // 订阅实时数据更新
    const categoriesChannel = supabase
      .channel('categories-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'categories' }, () => {
        console.log('分类数据已更新，重新加载...');
        debouncedLoadData();
      })
      .subscribe();

    const linksChannel = supabase
      .channel('links-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'links' }, () => {
        console.log('链接数据已更新，重新加载...');
        debouncedLoadData();
      })
      .subscribe();

    // 清理订阅
    return () => {
      supabase.removeChannel(categoriesChannel);
      supabase.removeChannel(linksChannel);
    };
  }, []);

  // 监听滚动，header 完全滚出视口才触发
  useEffect(() => {
    const handleScroll = () => {
      if (headerRef.current) {
        const headerBottom = headerRef.current.getBoundingClientRect().bottom;
        setScrolledPastHeader(headerBottom <= 0);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // 检测"开门"指令
  useEffect(() => {
    if (searchQuery.trim() === '开门' && !showPrivate) {
      setShowPrivate(true);
      setTimeout(() => setSearchQuery(''), 100);
    }
  }, [searchQuery, showPrivate]);

  const loadData = async (showLoadingState = true) => {
    try {
      // 1. 首先尝试从缓存加载
      const cachedData = loadFromCache();
      if (cachedData && showLoadingState) {
        console.log('从缓存加载数据');
        const formattedCategories = formatCategories(cachedData.categories, cachedData.links);
        setCategories(formattedCategories);
        setLoading(false);

        // 缓存有效，后台更新
        loadFreshData(false);
        return;
      }

      // 2. 加载新数据
      await loadFreshData(showLoadingState);
    } catch (error) {
      console.error('加载数据失败:', error);
      const { categories: localCategories } = await import('./data');
      setCategories(localCategories);
      setLoading(false);
    }
  };

  const loadFreshData = async (showLoadingState = true) => {
    try {
      // 并行查询分类和链接
      const [categoriesResult, linksResult] = await Promise.all([
        supabase
          .from('categories')
          .select('*')
          .order('order', { ascending: true }),
        supabase
          .from('links')
          .select('*')
          .order('order', { ascending: true }),
      ]);

      if (categoriesResult.error) throw categoriesResult.error;
      if (linksResult.error) throw linksResult.error;

      const categoriesData = categoriesResult.data || [];
      const linksData = linksResult.data || [];

      // 保存到缓存
      saveToCache(categoriesData, linksData);

      // 转换数据格式
      const formattedCategories = formatCategories(categoriesData, linksData);
      setCategories(formattedCategories);
    } finally {
      if (showLoadingState) {
        setLoading(false);
      }
    }
  };

  const formatCategories = (categoriesData: DBCategory[], linksData: DBLink[]): NavCategory[] => {
    const formatted = categoriesData.map((cat: DBCategory) => ({
      id: cat.id,
      name: cat.name,
      icon: cat.icon,
      isPrivate: cat.is_private || false,
      links: linksData
        .filter((link: DBLink) => link.category_id === cat.id)
        .map((link: DBLink) => ({
          title: link.title,
          url: link.url,
          description: link.description,
          icon: link.icon || undefined,
          isPrivate: link.is_private || false,
        })),
    }));

    // 预加载所有链接的 favicon
    const allUrls = linksData.map(link => link.url);
    preloadFavicons(allUrls);

    return formatted;
  };

  // 侧边栏分类列表：只过滤私密内容，不受分类筛选和搜索影响
  const sidebarCategories = useMemo(() => {
    if (showPrivate) {
      return categories;
    }

    return categories
      .filter(cat => !cat.isPrivate)
      .map(cat => ({
        ...cat,
        links: cat.links.filter(link => !link.isPrivate),
      }));
  }, [categories, showPrivate]);

  // 主内容区分类列表：在侧边栏分类基础上，再按分类筛选和搜索词筛选
  const filteredCategories = useMemo(() => {
    let result = sidebarCategories;

    // 检查是否输入了"开门"
    const isOpenDoorCommand = searchQuery.trim() === '开门';

    if (isOpenDoorCommand) {
      result = result.filter(cat => cat.isPrivate || cat.links.some(link => link.isPrivate));
      return result;
    }

    // 按分类筛选
    if (selectedCategory) {
      result = result.filter((cat) => cat.id === selectedCategory);
    }

    // 按搜索词筛选
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result
        .map((category) => ({
          ...category,
          links: category.links.filter(
            (link) =>
              link.title.toLowerCase().includes(query) ||
              link.description.toLowerCase().includes(query)
          ),
        }))
        .filter((category) => category.links.length > 0);
    }

    return result;
  }, [searchQuery, selectedCategory, sidebarCategories]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors flex">
        {/* 侧边栏骨架屏 */}
        <aside className="hidden lg:block w-64 bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border-r border-gray-200 dark:border-gray-700/50">
          <div className="p-6 border-b border-gray-200/50 dark:border-gray-700/50">
            <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
          </div>
          <div className="p-4 space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-12 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
            ))}
          </div>
        </aside>

        {/* 主内容骨架屏 */}
        <div className="flex-1 flex flex-col min-w-0">
          <header className="bg-white/95 dark:bg-gray-900/80 backdrop-blur-xl border-b border-gray-200 dark:border-gray-700/50">
            <div className="px-4 lg:px-6 py-4">
              <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-48 animate-pulse"></div>
            </div>
          </header>
          <div className="px-4 lg:px-6 py-4 border-b border-gray-200 dark:border-gray-700/50 bg-white/95 dark:bg-gray-900/80">
            <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded max-w-md mx-auto animate-pulse"></div>
          </div>
          <main className="flex-1 px-4 lg:px-8 py-8">
            <div className="max-w-[1600px] mx-auto space-y-12">
              {[1, 2, 3].map((i) => (
                <div key={i}>
                  <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded w-48 mb-6 animate-pulse"></div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map((j) => (
                      <div key={j} className="h-32 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse"></div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors flex">
      {/* 主题切换按钮 - 固定在右下角 */}
      <ThemeToggle />

      {/* 返回顶部按钮 - 固定在主题切换按钮上方 */}
      <BackToTop />

      {/* 侧边栏 */}
      <Sidebar
        categories={sidebarCategories}
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
        isOpen={isSidebarOpen}
        onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
      />

      {/* 主内容区 */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* 移动端：滚动超过 header 后从顶部滑入的固定栏 */}
        <div className={`fixed top-0 left-0 right-0 z-10 lg:hidden bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700/50 shadow-sm transition-transform duration-300 ${
          scrolledPastHeader ? 'translate-y-0' : '-translate-y-full'
        }`}>
          <div className="flex items-center justify-between px-4 py-2">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-gray-800 dark:bg-gray-700 flex items-center justify-center">
                <span className="text-xs font-bold text-white">N</span>
              </div>
              <span className="text-sm font-bold text-gray-900 dark:text-gray-100">收藏夹</span>
            </div>
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              aria-label="打开侧边栏"
            >
              <svg className="w-6 h-6 text-gray-700 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>

        {/* 顶部标题栏和搜索框 */}
        <header ref={headerRef} className="relative overflow-hidden border-b border-gray-200 dark:border-gray-700/50 shadow-sm">
          {/* 背景壁纸 */}
          {bingWallpaper && (
            <div
              className="absolute inset-0 bg-cover bg-center"
              style={{
                backgroundImage: `url(${bingWallpaper})`,
              }}
            />
          )}

          {/* 内容 */}
          <div className="relative px-4 py-3">
            {/* 顶部：菜单按钮 - 在壁纸上占一行 */}
            <div className="flex items-center justify-end mb-2 lg:hidden">
              <button
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="p-2 transition-all duration-300"
                aria-label="打开侧边栏"
              >
                <svg className="w-6 h-6 text-white drop-shadow-lg" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>

            {/* 标题 - 居中 */}
            <div className="text-center mb-2">
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white drop-shadow-lg">
                收藏夹
              </h1>
            </div>

            {/* 搜索框 - 居中 */}
            <div className="flex justify-center px-2 sm:px-0">
              <SearchBar value={searchQuery} onChange={setSearchQuery} />
            </div>

            {/* 每日一言 - 居中 */}
            <div className="flex justify-center px-2 sm:px-0 mt-3 sm:mt-4">
              <div className="w-full max-w-md px-3 py-1 rounded-full bg-white/60 dark:bg-gray-800/60 backdrop-blur-md text-gray-500 dark:text-gray-500 text-[10px] sm:text-xs text-center shadow-sm transition-all duration-300 hover:bg-white/70 dark:hover:bg-gray-800/70 hover:shadow-md leading-tight">
                {dailyQuote || '加载中...'}
              </div>
            </div>
          </div>
        </header>

        {/* 主内容 */}
        <main className="flex-1 overflow-y-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-6 lg:py-8">
          <div className="max-w-[1600px] mx-auto">
            {/* 隐私模式提示 */}
            {showPrivate && (
              <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-900/20 border-2 border-amber-200 dark:border-amber-700 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🔓</span>
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
                  onClick={() => {
                    setShowPrivate(false);
                    setSearchQuery('');
                    clearCache();
                  }}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  退出隐私模式
                </button>
              </div>
            )}

            {filteredCategories.length > 0 ? (
              <VirtualCategories categories={filteredCategories} />
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

        {/* 页脚 */}
        <footer className="bg-white/80 dark:bg-gray-900/50 backdrop-blur-xl border-t border-gray-200 dark:border-gray-700/50">
          <div className="px-4 lg:px-6 py-4 sm:py-5 lg:py-6">
            <div className="max-w-4xl mx-auto space-y-3">
              {/* 统计信息 */}
              <div className="text-center">
                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-500">
                  已收录 <span className="font-semibold text-gray-700 dark:text-gray-300">{sidebarCategories.length}</span> 个分类，
                  <span className="font-semibold text-gray-700 dark:text-gray-300">{sidebarCategories.reduce((acc, cat) => acc + cat.links.length, 0)}</span> 个网站
                </p>
              </div>

              {/* Slogan */}
              <div className="text-center">
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 italic">
                  精选实用工具，提升工作效率 ✨
                </p>
              </div>

              {/* 版权与链接 */}
              <div className="text-center">
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                  © 2026 收藏夹 - 一些常用的工具 |
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
