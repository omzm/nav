'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { supabase, Category, Link } from '@/app/lib/supabase';
import { useRouter } from 'next/navigation';
import { toast } from '@/app/components/Toast';
import { loadAdminCache, saveAdminCache } from '@/app/utils/adminCache';

export default function AdminDashboard() {
  const [user, setUser] = useState<any>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [links, setLinks] = useState<Link[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false); // 添加刷新状态
  const [activeTab, setActiveTab] = useState<'categories' | 'links' | 'stats'>('stats');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string | null>(null);
  const router = useRouter();

  // 使用 useMemo 缓存统计数据计算
  const stats = useMemo(() => {
    const publicCats = categories.filter(c => !c.is_private).length;
    const privateCats = categories.filter(c => c.is_private).length;
    const publicLnks = links.filter(l => !l.is_private).length;
    const privateLnks = links.filter(l => l.is_private).length;

    return {
      totalCategories: categories.length,
      totalLinks: links.length,
      publicCategories: publicCats,
      privateCategories: privateCats,
      publicLinks: publicLnks,
      privateLinks: privateLnks,
    };
  }, [categories, links]);

  useEffect(() => {
    checkUser();
  }, []);

  useEffect(() => {
    if (!user) return;

    // 订阅实时数据更新
    const categoriesChannel = supabase
      .channel('admin-categories-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'categories' }, () => {
        console.log('分类数据已更新，重新加载...');
        loadData();
      })
      .subscribe();

    const linksChannel = supabase
      .channel('admin-links-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'links' }, () => {
        console.log('链接数据已更新，重新加载...');
        loadData();
      })
      .subscribe();

    // 清理订阅
    return () => {
      supabase.removeChannel(categoriesChannel);
      supabase.removeChannel(linksChannel);
    };
  }, [user]);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push('/admin');
      return;
    }
    setUser(user);
    loadData();
  };

  const loadData = async (forceRefresh = false) => {
    try {
      // 如果是强制刷新，显示刷新状态
      if (forceRefresh) {
        setRefreshing(true);
      }

      // 先尝试从缓存加载（非强制刷新时）
      if (!forceRefresh) {
        const cached = loadAdminCache();
        if (cached) {
          console.log('从缓存加载后台数据');
          setCategories(cached.categories);
          setLinks(cached.links);
          setLoading(false);
        }
      }

      // 后台加载最新数据
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('categories')
        .select('*')
        .order('order', { ascending: true });

      if (categoriesError) throw categoriesError;

      const { data: linksData, error: linksError } = await supabase
        .from('links')
        .select('*')
        .order('order', { ascending: true });

      if (linksError) throw linksError;

      // 保存到缓存
      saveAdminCache(categoriesData || [], linksData || []);

      setCategories(categoriesData || []);
      setLinks(linksData || []);

      // 刷新成功提示
      if (forceRefresh) {
        toast.success('数据已刷新！');
      }
    } catch (error) {
      console.error('加载数据失败:', error);
      toast.error('加载数据失败');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/admin');
  };

  const deleteCategory = useCallback(async (id: string) => {
    if (!confirm('确定要删除这个分类吗？这将同时删除该分类下的所有链接。')) return;

    try {
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('分类删除成功！');
      loadData();
    } catch (error) {
      console.error('删除失败:', error);
      toast.error('删除失败，请重试');
    }
  }, []);

  const deleteLink = useCallback(async (id: string) => {
    if (!confirm('确定要删除这个链接吗？')) return;

    try {
      const { error } = await supabase
        .from('links')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('链接删除成功！');
      loadData();
    } catch (error) {
      console.error('删除失败:', error);
      toast.error('删除失败，请重试');
    }
  }, []);

  // 使用 useMemo 优化搜索过滤
  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) return categories;
    const query = searchQuery.toLowerCase();
    return categories.filter(cat =>
      cat.name.toLowerCase().includes(query)
    );
  }, [categories, searchQuery]);

  const filteredLinks = useMemo(() => {
    const query = searchQuery.toLowerCase();
    return links.filter(link => {
      const matchesSearch = !searchQuery.trim() ||
        link.title.toLowerCase().includes(query) ||
        link.description.toLowerCase().includes(query);
      const matchesCategory = !selectedCategoryFilter || link.category_id === selectedCategoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [links, searchQuery, selectedCategoryFilter]);

  const viewCategoryLinks = useCallback((categoryId: string) => {
    setActiveTab('links');
    setSelectedCategoryFilter(categoryId);
    setSearchQuery('');
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <div className="max-w-7xl mx-auto px-4 py-4">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-32 animate-pulse"></div>
          </div>
        </header>
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="flex space-x-4 mb-6 border-b border-gray-200 dark:border-gray-700">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-24 animate-pulse"></div>
            ))}
          </div>
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* 顶部导航 */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <span>🎛️</span>
              <span className="hidden sm:inline">后台管理</span>
              <span className="sm:hidden">管理</span>
            </h1>
            <div className="flex items-center gap-2 sm:gap-3">
              <a
                href="/"
                target="_blank"
                className="hidden sm:flex items-center gap-1 px-3 py-1.5 text-xs sm:text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <span>👁️</span>
                <span className="hidden md:inline">查看网站</span>
              </a>
              <span className="hidden lg:inline text-xs sm:text-sm text-gray-600 dark:text-gray-400 max-w-[150px] truncate">
                {user?.email}
              </span>
              <button
                onClick={handleLogout}
                className="px-3 sm:px-4 py-1.5 sm:py-2 bg-gray-800 dark:bg-gray-700 text-white rounded-lg hover:bg-gray-700 dark:hover:bg-gray-600 transition-all text-xs sm:text-sm font-medium active:scale-95 active:opacity-90"
              >
                <span className="hidden sm:inline">退出登录</span>
                <span className="sm:hidden">退出</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6 lg:py-8">
        {/* 标签页 */}
        <div className="flex gap-2 sm:gap-4 mb-4 sm:mb-6 border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
          <button
            onClick={() => setActiveTab('stats')}
            className={`px-3 sm:px-4 py-2 font-medium transition-all whitespace-nowrap text-sm sm:text-base active:scale-95 ${
              activeTab === 'stats'
                ? 'text-gray-900 dark:text-gray-100 border-b-2 border-gray-800 dark:border-gray-300'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            <span className="flex items-center gap-1.5">
              <span>📊</span>
              <span className="hidden sm:inline">统计</span>
            </span>
          </button>
          <button
            onClick={() => setActiveTab('categories')}
            className={`px-3 sm:px-4 py-2 font-medium transition-all whitespace-nowrap text-sm sm:text-base active:scale-95 ${
              activeTab === 'categories'
                ? 'text-gray-900 dark:text-gray-100 border-b-2 border-gray-800 dark:border-gray-300'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            <span className="flex items-center gap-1.5">
              <span>📁</span>
              <span className="hidden sm:inline">分类</span>
              <span className="text-xs opacity-75">({categories.length})</span>
            </span>
          </button>
          <button
            onClick={() => setActiveTab('links')}
            className={`px-3 sm:px-4 py-2 font-medium transition-all whitespace-nowrap text-sm sm:text-base active:scale-95 ${
              activeTab === 'links'
                ? 'text-gray-900 dark:text-gray-100 border-b-2 border-gray-800 dark:border-gray-300'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            <span className="flex items-center gap-1.5">
              <span>🔗</span>
              <span className="hidden sm:inline">链接</span>
              <span className="text-xs opacity-75">({links.length})</span>
            </span>
          </button>
        </div>

        {/* 统计面板 */}
        {activeTab === 'stats' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">📂 总分类数</p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-gray-100 mt-2">
                      {stats.totalCategories}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                    <span className="text-2xl">📁</span>
                  </div>
                </div>
                <div className="mt-4 flex items-center space-x-4 text-xs">
                  <span className="text-gray-600 dark:text-gray-400">
                    公开: {stats.publicCategories}
                  </span>
                  <span className="text-gray-600 dark:text-gray-400">
                    私密: {stats.privateCategories}
                  </span>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">🔗 总链接数</p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-gray-100 mt-2">
                      {stats.totalLinks}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                    <span className="text-2xl">🔗</span>
                  </div>
                </div>
                <div className="mt-4 flex items-center space-x-4 text-xs">
                  <span className="text-gray-600 dark:text-gray-400">
                    公开: {stats.publicLinks}
                  </span>
                  <span className="text-gray-600 dark:text-gray-400">
                    私密: {stats.privateLinks}
                  </span>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">📊 平均每分类</p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-gray-100 mt-2">
                      {stats.totalCategories > 0 ? Math.round(stats.totalLinks / stats.totalCategories) : 0}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                    <span className="text-2xl">📊</span>
                  </div>
                </div>
                <div className="mt-4 text-xs text-gray-600 dark:text-gray-400">
                  {stats.totalCategories > 0 ? Math.round(stats.totalLinks / stats.totalCategories) : 0} 个链接
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                快速操作
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <button
                  onClick={() => router.push('/admin/dashboard/category/new')}
                  className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-all text-center active:scale-95 active:opacity-90"
                >
                  <div className="text-2xl mb-2">➕</div>
                  <div className="text-sm font-medium text-gray-900 dark:text-gray-100">添加分类</div>
                </button>
                <button
                  onClick={() => router.push('/admin/dashboard/link/new')}
                  className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-all text-center active:scale-95 active:opacity-90"
                >
                  <div className="text-2xl mb-2">🔗</div>
                  <div className="text-sm font-medium text-gray-900 dark:text-gray-100">添加链接</div>
                </button>
                <button
                  onClick={() => window.open('/', '_blank')}
                  className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-all text-center active:scale-95 active:opacity-90"
                >
                  <div className="text-2xl mb-2">👁️</div>
                  <div className="text-sm font-medium text-gray-900 dark:text-gray-100">查看网站</div>
                </button>
                <button
                  onClick={() => loadData(true)}
                  disabled={refreshing}
                  className={`p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-all text-center active:scale-95 active:opacity-90 ${refreshing ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <div className={`text-2xl mb-2 ${refreshing ? 'animate-spin' : ''}`}>🔄</div>
                  <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {refreshing ? '刷新中...' : '刷新数据'}
                  </div>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 分类管理 */}
        {activeTab === 'categories' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3 sm:justify-between sm:items-center mb-4">
              <input
                type="text"
                placeholder="搜索分类..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full sm:flex-1 sm:max-w-md px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-400 text-sm"
              />
              <button
                onClick={() => router.push('/admin/dashboard/category/new')}
                className="w-full sm:w-auto px-4 py-2.5 bg-gray-800 dark:bg-gray-700 text-white rounded-lg hover:bg-gray-700 dark:hover:bg-gray-600 transition-all font-medium text-sm flex items-center justify-center gap-2 active:scale-95 active:opacity-90"
              >
                <span>➕</span>
                <span>添加分类</span>
              </button>
            </div>

            <div className="grid gap-3 sm:gap-4">
              {filteredCategories.map((category) => (
                <div
                  key={category.id}
                  className="bg-white dark:bg-gray-800 rounded-lg p-3 sm:p-4 border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <span className="text-2xl flex-shrink-0">{category.icon}</span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-sm sm:text-base truncate">
                            {category.name}
                          </h3>
                          {category.is_private && (
                            <span className="text-xs px-2 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded flex-shrink-0">
                              🔒 私密
                            </span>
                          )}
                        </div>
                        <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                          排序: {category.order} · {links.filter(l => l.category_id === category.id).length} 个链接
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2 sm:flex-shrink-0">
                      <button
                        onClick={() => viewCategoryLinks(category.id)}
                        className="flex-1 sm:flex-initial px-3 py-1.5 text-xs sm:text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-all font-medium active:scale-95 active:opacity-90"
                        title="查看该分类下的所有链接"
                      >
                        👁️ 查看
                      </button>
                      <button
                        onClick={() => router.push(`/admin/dashboard/category/${category.id}`)}
                        className="flex-1 sm:flex-initial px-3 py-1.5 text-xs sm:text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-all font-medium active:scale-95 active:opacity-90"
                      >
                        ✏️ 编辑
                      </button>
                      <button
                        onClick={() => deleteCategory(category.id)}
                        className="flex-1 sm:flex-initial px-3 py-1.5 text-xs sm:text-sm bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded hover:bg-red-200 dark:hover:bg-red-900/50 transition-all font-medium active:scale-95 active:opacity-90"
                      >
                        🗑️ 删除
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 链接管理 */}
        {activeTab === 'links' && (
          <div className="space-y-4">
            <div className="flex flex-col gap-3 mb-4">
              <input
                type="text"
                placeholder="搜索链接..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-400 text-sm"
              />
              <div className="flex gap-2">
                <select
                  value={selectedCategoryFilter || ''}
                  onChange={(e) => setSelectedCategoryFilter(e.target.value || null)}
                  className="flex-1 px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-400 text-sm"
                >
                  <option value="">所有分类</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.icon} {cat.name}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => router.push('/admin/dashboard/link/new')}
                  className="px-4 py-2.5 bg-gray-800 dark:bg-gray-700 text-white rounded-lg hover:bg-gray-700 dark:hover:bg-gray-600 transition-all whitespace-nowrap font-medium text-sm flex items-center gap-2 active:scale-95 active:opacity-90"
                >
                  <span>➕</span>
                  <span className="hidden sm:inline">添加链接</span>
                  <span className="sm:hidden">添加</span>
                </button>
              </div>
            </div>

            {selectedCategoryFilter && (
              <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                    正在筛选：
                  </span>
                  <span className="text-xs sm:text-sm font-medium text-gray-900 dark:text-gray-100">
                    {categories.find(c => c.id === selectedCategoryFilter)?.icon}{' '}
                    {categories.find(c => c.id === selectedCategoryFilter)?.name}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    ({filteredLinks.length} 个链接)
                  </span>
                </div>
                <button
                  onClick={() => setSelectedCategoryFilter(null)}
                  className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 font-medium"
                >
                  ✕ 清除筛选
                </button>
              </div>
            )}

            <div className="grid gap-3 sm:gap-4">
              {filteredLinks.map((link) => {
                const category = categories.find(c => c.id === link.category_id);
                return (
                  <div
                    key={link.id}
                    className="bg-white dark:bg-gray-800 rounded-lg p-3 sm:p-4 border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow"
                  >
                    <div className="flex flex-col gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-sm sm:text-base">
                            {link.title}
                          </h3>
                          {link.is_private && (
                            <span className="text-xs px-2 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded flex-shrink-0">
                              🔒 私密
                            </span>
                          )}
                          {category && (
                            <span className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded flex-shrink-0">
                              {category.icon} {category.name}
                            </span>
                          )}
                        </div>
                        <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-2 line-clamp-2">
                          {link.description}
                        </p>
                        <a
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs sm:text-sm text-gray-500 dark:text-gray-500 hover:underline break-all"
                        >
                          {link.url}
                        </a>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => router.push(`/admin/dashboard/link/${link.id}`)}
                          className="flex-1 px-3 py-1.5 text-xs sm:text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-all font-medium active:scale-95 active:opacity-90"
                        >
                          ✏️ 编辑
                        </button>
                        <button
                          onClick={() => deleteLink(link.id)}
                          className="flex-1 px-3 py-1.5 text-xs sm:text-sm bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded hover:bg-red-200 dark:hover:bg-red-900/50 transition-all font-medium active:scale-95 active:opacity-90"
                        >
                          🗑️ 删除
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
