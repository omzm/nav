'use client';

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import SearchBar from './SearchBar';
import CategorySection from './CategorySection';
import ThemeToggle from './ThemeToggle';
import BackToTop from './BackToTop';
import RefreshButton from './RefreshButton';
import Sidebar from './Sidebar';
import { unlockPrivateLinks } from '../actions/unlockPrivate';
import { hasAdminSession } from '../actions/adminSession';
import { revalidateNavSnapshot } from '../actions/revalidateNavSnapshot';
import type { UnlockPrivateResult } from '../actions/unlockPrivate';
import type { NavCategory, NavSnapshot } from '../types';

interface HomeClientProps {
  snapshot: NavSnapshot;
}

export default function HomeClient({ snapshot }: HomeClientProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  // 每日一言：客户端挂载后异步拉取，不阻塞首屏；加载前用占位符撑住高度避免布局抖动
  const [dailyQuote, setDailyQuote] = useState('');

  useEffect(() => {
    let active = true;
    fetch('/api/daily-quote')
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (active && typeof data?.quote === 'string' && data.quote) {
          setDailyQuote(data.quote);
        }
      })
      .catch(() => {
        // 一言加载失败不影响主体功能，保持占位即可
      });
    return () => {
      active = false;
    };
  }, []);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showPrivate, setShowPrivate] = useState(false);
  // "开门"成功后由服务端下发的私密分类（不再包含在初始快照中，见安全修复 S1）
  const [privateCategories, setPrivateCategories] = useState<NavCategory[]>([]);
  const [unlocking, setUnlocking] = useState(false);
  const [unlockFailed, setUnlockFailed] = useState(false);
  // 刷新按钮仅管理员可见（安全修复 S4：公开刷新可被滥用打穿缓存）
  const [canRefresh, setCanRefresh] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isRefreshPending, startRefreshTransition] = useTransition();
  const [scrolledPastHeader, setScrolledPastHeader] = useState(false);
  const headerRef = useRef<HTMLElement>(null);

  const normalizedQuery = searchQuery.trim().toLowerCase();

  // 管理员会话存在时才展示刷新按钮，避免普通访客误触无权限的操作
  // 性能优化：查询延迟到浏览器空闲时执行（避开首屏关键路径），结果缓存到
  // sessionStorage，同一标签页会话内只查一次。注意登出不会清这个 hint，
  // 但刷新操作本身有服务端鉴权，最坏情况只是按钮多显示一次。
  useEffect(() => {
    let active = true;
    const ADMIN_SESSION_HINT_KEY = 'nav_admin_hint';

    const resolve = (ok: boolean) => {
      if (active) setCanRefresh(ok);
    };

    try {
      const cached = sessionStorage.getItem(ADMIN_SESSION_HINT_KEY);
      if (cached !== null) {
        resolve(cached === '1');
        return;
      }
    } catch {
      // sessionStorage 不可用时降级为直接查询
    }

    const query = () => {
      hasAdminSession()
        .then((ok) => {
          try {
            sessionStorage.setItem(ADMIN_SESSION_HINT_KEY, ok ? '1' : '0');
          } catch {
            // 忽略缓存写入失败，不影响功能
          }
          resolve(ok);
        })
        .catch(() => {
          resolve(false);
        });
    };

    let idleHandle: number | undefined;
    let timeoutHandle: number | undefined;
    if (typeof window.requestIdleCallback === 'function') {
      idleHandle = window.requestIdleCallback(query, { timeout: 3000 });
    } else {
      timeoutHandle = window.setTimeout(query, 1500);
    }

    return () => {
      active = false;
      if (idleHandle !== undefined && typeof window.cancelIdleCallback === 'function') {
        window.cancelIdleCallback(idleHandle);
      }
      if (timeoutHandle !== undefined) {
        window.clearTimeout(timeoutHandle);
      }
    };
  }, []);

  const isRefreshButtonBusy = isRefreshing || isRefreshPending;

  const handleRefresh = useCallback(async () => {
    if (isRefreshButtonBusy) return;

    setIsRefreshing(true);

    try {
      await revalidateNavSnapshot();
    } catch (error) {
      console.error('Failed to refresh nav snapshot:', error);
    } finally {
      startRefreshTransition(() => {
        router.refresh();
      });
      setIsRefreshing(false);
    }
  }, [isRefreshButtonBusy, router, startRefreshTransition]);

  useEffect(() => {
    const report = () => {
      fetch('/api/site-view', { method: 'POST', keepalive: true }).catch((error) => {
        console.error('Failed to report site view:', error);
      });
    };

    const timer = window.setTimeout(() => {
      // 只上报一次浏览，不携带 path（服务端只记总数）
      // sendBeacon 返回 false 表示未能加入发送队列，降级用 fetch 补发
      if (typeof navigator.sendBeacon === 'function') {
        try {
          if (navigator.sendBeacon('/api/site-view')) return;
        } catch {
          // 忽略异常，走 fetch 补发
        }
      }
      report();
    }, 2000);

    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      if (!headerRef.current) return;
      setScrolledPastHeader(headerRef.current.getBoundingClientRect().bottom <= 0);
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        document.getElementById('search-input')?.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // "开门"：口令校验与私密数据下发走服务端（安全修复 S1）。
  // 口令正确才展示；失败时给出提示，避免静默无响应。
  //
  // 预取优化：用户在搜索框输入"开"字时即在后台发起请求，
  // 输入完"开门"时数据大概率已就绪，体感接近之前的即时显示。
  // 注意只在用户交互时预取（不随页面加载），爬虫与被动访问不会触发。
  const privatePrefetchRef = useRef<Promise<UnlockPrivateResult> | null>(null);

  const prefetchPrivate = useCallback(() => {
    if (showPrivate || privatePrefetchRef.current) {
      return privatePrefetchRef.current;
    }

    const pending = unlockPrivateLinks('开门').catch(
      (): UnlockPrivateResult => ({ ok: false, categories: [], reason: 'error' })
    );
    privatePrefetchRef.current = pending;
    return pending;
  }, [showPrivate]);

  const handleUnlock = useCallback(async () => {
    if (unlocking) return;

    setUnlocking(true);
    setUnlockFailed(false);

    try {
      let result = await (privatePrefetchRef.current ?? unlockPrivateLinks('开门'));

      // 预取遇到服务异常时重试一次，避免缓存单次网络抖动
      if (!result.ok && result.reason === 'error') {
        privatePrefetchRef.current = null;
        result = await unlockPrivateLinks('开门');
      }

      if (!result.ok) {
        setUnlockFailed(true);
        return;
      }

      setPrivateCategories(result.categories);
      setShowPrivate(true);
    } catch (error) {
      console.error('Failed to unlock private links:', error);
      setUnlockFailed(true);
    } finally {
      setUnlocking(false);
    }
  }, [unlocking]);

  const handleSearchChange = useCallback((value: string) => {
    if (value.trim() === '开门') {
      setSearchQuery('');
      void handleUnlock();
      return;
    }

    if (!showPrivate && value.includes('开')) {
      prefetchPrivate();
    }

    setUnlockFailed(false);
    setSearchQuery(value);
  }, [handleUnlock, prefetchPrivate, showPrivate]);

  const handleSelectCategory = useCallback((categoryId: string | null) => {
    setSelectedCategory(categoryId);

    if (searchQuery) {
      setSearchQuery('');
    }

    window.setTimeout(() => {
      if (!categoryId) {
        headerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
      }

      document
        .getElementById(`category-${categoryId}`)
        ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 0);
  }, [searchQuery]);

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

  const visibleLinkCount = useMemo(
    () => sidebarCategories.reduce((acc, category) => acc + category.links.length, 0),
    [sidebarCategories]
  );

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
        totalViewCount={snapshot.stats.totalViewCount}
      />

      <div className="flex-1 flex flex-col min-w-0">
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

          <div className="relative px-4 py-3">
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
              <SearchBar value={searchQuery} onChange={handleSearchChange} />
            </div>
            {unlocking && (
              <div className="flex justify-center px-2 sm:px-0 mt-2">
                <p className="text-xs text-gray-400 dark:text-gray-500">正在开门…</p>
              </div>
            )}
            {unlockFailed && (
              <div className="flex justify-center px-2 sm:px-0 mt-2">
                <p className="text-xs text-red-500 dark:text-red-400">
                  解锁失败，请稍后重试
                </p>
              </div>
            )}

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

        <footer className="bg-white/80 dark:bg-gray-900/50 backdrop-blur-xl border-t border-gray-200 dark:border-gray-700/50">
          <div className="px-4 lg:px-6 py-4 sm:py-5 lg:py-6">
            <div className="max-w-4xl mx-auto space-y-3">
              <div className="text-center">
                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-500">
                  已收录 <span className="font-semibold text-gray-700 dark:text-gray-300">{sidebarCategories.length}</span> 个分类，
                  <span className="font-semibold text-gray-700 dark:text-gray-300">{visibleLinkCount}</span> 个网站
                </p>
              </div>

              <div className="text-center">
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 italic">
                  精选实用工具，提升工作效率 ✓
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
