'use client';

import { useState, useMemo, useEffect } from 'react';
import { supabase, Category as DBCategory, Link as DBLink } from './lib/supabase';
import SearchBar from './components/SearchBar';
import CategorySection from './components/CategorySection';
import ThemeToggle from './components/ThemeToggle';
import BackToTop from './components/BackToTop';
import Sidebar from './components/Sidebar';
import { NavCategory } from './types';

export default function Home() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [categories, setCategories] = useState<NavCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [bingWallpaper, setBingWallpaper] = useState('');
  const [dailyQuote, setDailyQuote] = useState('');

  useEffect(() => {
    loadData();
    loadBingWallpaper();
    loadDailyQuote();
  }, []);

  const loadBingWallpaper = async () => {
    try {
      // 使用必应壁纸 API
      const wallpaperUrl = 'https://uapis.cn/api/v1/image/bing-daily';
      setBingWallpaper(wallpaperUrl);
    } catch (error) {
      console.error('加载壁纸失败:', error);
    }
  };

  const loadDailyQuote = async () => {
    try {
      const response = await fetch('https://v.api.aa1.cn/api/yiyan/index.php');
      const text = await response.text();
      // 去除 HTML 标签
      const cleanText = text.replace(/<[^>]*>/g, '').trim();
      setDailyQuote(cleanText);
    } catch (error) {
      console.error('加载每日一言失败:', error);
      setDailyQuote('生活总会给你答案，但不会马上把一切都告诉你。');
    }
  };

  const loadData = async () => {
    try {
      // 加载分类
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('categories')
        .select('*')
        .order('order', { ascending: true });

      if (categoriesError) throw categoriesError;

      // 加载链接
      const { data: linksData, error: linksError } = await supabase
        .from('links')
        .select('*')
        .order('order', { ascending: true });

      if (linksError) throw linksError;

      // 转换数据格式
      const formattedCategories: NavCategory[] = (categoriesData || []).map((cat: DBCategory) => ({
        id: cat.id,
        name: cat.name,
        icon: cat.icon,
        links: (linksData || [])
          .filter((link: DBLink) => link.category_id === cat.id)
          .map((link: DBLink) => ({
            title: link.title,
            url: link.url,
            description: link.description,
            icon: link.icon || undefined,
          })),
      }));

      setCategories(formattedCategories);
    } catch (error) {
      console.error('加载数据失败:', error);
      // 如果加载失败，使用本地数据作为后备
      const { categories: localCategories } = await import('./data');
      setCategories(localCategories);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      // 向下滚动且滚动距离大于50px时隐藏
      if (currentScrollY > lastScrollY && currentScrollY > 50) {
        setIsHeaderVisible(false);
      }
      // 向上滚动时显示
      else if (currentScrollY < lastScrollY) {
        setIsHeaderVisible(true);
      }

      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  const filteredCategories = useMemo(() => {
    let result = categories;

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
  }, [searchQuery, selectedCategory, categories]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors flex">
        {/* 侧边栏骨架屏 */}
        <aside className="hidden lg:block w-72 bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border-r border-gray-200 dark:border-gray-700/50">
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
        categories={categories}
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
        isOpen={isSidebarOpen}
        onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
      />

      {/* 主内容区 */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* 顶部标题栏和搜索框合并 */}
        <header className={`sticky top-0 z-10 border-b border-gray-200 dark:border-gray-700/50 shadow-sm transition-transform duration-300 ${
          isHeaderVisible ? 'translate-y-0' : '-translate-y-full'
        } relative overflow-hidden`}>
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
            {/* 顶部：菜单按钮 - 移到右边 */}
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

        {/* 页脚 */}
        <footer className="bg-white/80 dark:bg-gray-900/50 backdrop-blur-xl border-t border-gray-200 dark:border-gray-700/50">
          <div className="px-4 lg:px-6 py-4 sm:py-5 lg:py-6 text-center">
            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
              © 2026 收藏夹 - 一些常用的工具 | 使用 <span className="font-semibold text-gray-900 dark:text-gray-100">Next.js</span> 构建
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}

