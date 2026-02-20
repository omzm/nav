'use client';

import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { supabase, Category as DBCategory, Link as DBLink } from './lib/supabase';
import SearchBar from './components/SearchBar';
import CategorySection from './components/CategorySection';
import ThemeToggle from './components/ThemeToggle';
import BackToTop from './components/BackToTop';
import RefreshButton from './components/RefreshButton';
import Sidebar from './components/Sidebar';
import { NavCategory, HotLink } from './types';
import { loadDailyQuote as loadQuote } from './utils/externalApi';
import { debounce } from './utils/throttle';

export default function Home() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [categories, setCategories] = useState<NavCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [dailyQuote, setDailyQuote] = useState('');
  const [showPrivate, setShowPrivate] = useState(false);
  const [scrolledPastHeader, setScrolledPastHeader] = useState(false);
  const [hotLinks, setHotLinks] = useState<HotLink[]>([]);
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
    loadHotLinks();
    // 异步加载外部资源，不阻塞主内容
    loadQuote().then(setDailyQuote);

    // 订阅实时数据更新
    const categoriesChannel = supabase
      .channel('categories-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'categories' }, () => {
        debouncedLoadData();
      })
      .subscribe();

    const linksChannel = supabase
      .channel('links-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'links' }, () => {
        debouncedLoadData();
      })
      .subscribe();

    const clicksChannel = supabase
      .channel('link-clicks-changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'link_clicks' }, () => {
        loadHotLinks();
      })
      .subscribe();

    // 清理订阅
    return () => {
      supabase.removeChannel(categoriesChannel);
      supabase.removeChannel(linksChannel);
      supabase.removeChannel(clicksChannel);
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

  // Ctrl+K 快捷键聚焦搜索框
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        const input = document.getElementById('search-input');
        if (input) input.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
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
          id: link.id,
          title: link.title,
          url: link.url,
          description: link.description,
          icon: link.icon || undefined,
          isPrivate: link.is_private || false,
        })),
    }));

    return formatted;
  };

  const loadHotLinks = async () => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayISO = today.toISOString();

      const { data, error } = await supabase
        .from('link_clicks')
        .select('link_id, links(title, url, icon)')
        .gte('clicked_at', todayISO);

      if (error) throw error;
      if (!data || data.length === 0) {
        setHotLinks([]);
        return;
      }

      // 按 link_id 聚合计数
      const countMap = new Map<string, { count: number; title: string; url: string; icon?: string }>();
      for (const row of data) {
        const linkId = row.link_id as string;
        const linkInfo = row.links as unknown as { title: string; url: string; icon?: string } | null;
        if (!linkInfo) continue;

        const existing = countMap.get(linkId);
        if (existing) {
          existing.count++;
        } else {
          countMap.set(linkId, {
            count: 1,
            title: linkInfo.title,
            url: linkInfo.url,
            icon: linkInfo.icon || undefined,
          });
        }
      }

      // 排序取前 5
      const sorted = Array.from(countMap.values())
        .sort((a, b) => b.count - a.count)
        .slice(0, 5)
        .map(item => ({
          title: item.title,
          url: item.url,
          icon: item.icon,
          clickCount: item.count,
        }));

      setHotLinks(sorted);
    } catch (error) {
      console.error('加载今日热门失败:', error);
    }
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
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 animate-spin-slow">
            <img src="/icon.svg" alt="加载中" className="w-full h-full" />
          </div>
          <p className="text-sm text-gray-400 dark:text-gray-500 animate-pulse">加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors flex">
      {/* 主题切换按钮 */}
      <ThemeToggle />

      {/* 刷新按钮 - 固定在主题切换按钮下方 */}
      <RefreshButton />

      {/* 返回顶部按钮 - 固定在主题切换按钮上方 */}
      <BackToTop />

      {/* 侧边栏 */}
      <Sidebar
        categories={sidebarCategories}
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
        isOpen={isSidebarOpen}
        onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
        hotLinks={hotLinks}
      />

      {/* 主内容区 */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* 移动端：滚动超过 header 后从顶部滑入的固定栏 */}
        <div className={`fixed top-0 left-0 right-0 z-10 lg:hidden bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700/50 shadow-sm transition-transform duration-300 ${
          scrolledPastHeader ? 'translate-y-0' : '-translate-y-full'
        }`}>
          <div className="flex items-center justify-between px-4 py-2">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg overflow-hidden">
                <img src="/icon.svg" alt="Logo" className="w-full h-full object-cover" />
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
          <div
            className="absolute inset-0 bg-cover bg-center bg-gradient-to-br from-blue-400 to-indigo-600"
            style={{
              backgroundImage: 'url(https://bing.img.run/uhd.php)',
            }}
          />

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
                  }}
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
