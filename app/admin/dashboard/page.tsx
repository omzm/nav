'use client';

import { useEffect, useState } from 'react';
import { supabase, Category, Link } from '@/app/lib/supabase';
import { useRouter } from 'next/navigation';

export default function AdminDashboard() {
  const [user, setUser] = useState<any>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [links, setLinks] = useState<Link[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'categories' | 'links' | 'stats'>('categories');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string | null>(null);
  const router = useRouter();

  // 统计数据
  const [stats, setStats] = useState({
    totalCategories: 0,
    totalLinks: 0,
    publicCategories: 0,
    privateCategories: 0,
    publicLinks: 0,
    privateLinks: 0,
  });

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push('/admin');
      return;
    }
    setUser(user);
    loadData();
  };

  const loadData = async () => {
    try {
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('categories')
        .select('*')
        .order('order', { ascending: true });

      if (categoriesError) throw categoriesError;
      setCategories(categoriesData || []);

      const { data: linksData, error: linksError } = await supabase
        .from('links')
        .select('*')
        .order('order', { ascending: true });

      if (linksError) throw linksError;
      setLinks(linksData || []);

      // 计算统计数据
      const publicCats = (categoriesData || []).filter(c => !c.is_private).length;
      const privateCats = (categoriesData || []).filter(c => c.is_private).length;
      const publicLnks = (linksData || []).filter(l => !l.is_private).length;
      const privateLnks = (linksData || []).filter(l => l.is_private).length;

      setStats({
        totalCategories: (categoriesData || []).length,
        totalLinks: (linksData || []).length,
        publicCategories: publicCats,
        privateCategories: privateCats,
        publicLinks: publicLnks,
        privateLinks: privateLnks,
      });
    } catch (error) {
      console.error('加载数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/admin');
  };

  const deleteCategory = async (id: string) => {
    if (!confirm('确定要删除这个分类吗？这将同时删除该分类下的所有链接。')) return;

    try {
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', id);

      if (error) throw error;
      loadData();
    } catch (error) {
      console.error('删除失败:', error);
      alert('删除失败');
    }
  };

  const deleteLink = async (id: string) => {
    if (!confirm('确定要删除这个链接吗？')) return;

    try {
      const { error } = await supabase
        .from('links')
        .delete()
        .eq('id', id);

      if (error) throw error;
      loadData();
    } catch (error) {
      console.error('删除失败:', error);
      alert('删除失败');
    }
  };

  // 搜索过滤
  const filteredCategories = categories.filter(cat =>
    cat.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredLinks = links.filter(link => {
    const matchesSearch = link.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      link.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = !selectedCategoryFilter || link.category_id === selectedCategoryFilter;
    return matchesSearch && matchesCategory;
  });

  const viewCategoryLinks = (categoryId: string) => {
    setActiveTab('links');
    setSelectedCategoryFilter(categoryId);
    setSearchQuery('');
  };

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
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            🎛️ 后台管理
          </h1>
          <div className="flex items-center space-x-4">
            <a
              href="/"
              target="_blank"
              className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
            >
              查看网站 →
            </a>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {user?.email}
            </span>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-gray-800 dark:bg-gray-700 text-white rounded-lg hover:bg-gray-700 dark:hover:bg-gray-600 transition-colors text-sm"
            >
              退出登录
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* 标签页 */}
        <div className="flex space-x-4 mb-6 border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setActiveTab('stats')}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === 'stats'
                ? 'text-gray-900 dark:text-gray-100 border-b-2 border-gray-800 dark:border-gray-300'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            📊 统计
          </button>
          <button
            onClick={() => setActiveTab('categories')}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === 'categories'
                ? 'text-gray-900 dark:text-gray-100 border-b-2 border-gray-800 dark:border-gray-300'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            分类管理 ({categories.length})
          </button>
          <button
            onClick={() => setActiveTab('links')}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === 'links'
                ? 'text-gray-900 dark:text-gray-100 border-b-2 border-gray-800 dark:border-gray-300'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            链接管理 ({links.length})
          </button>
        </div>

        {/* 统计面板 */}
        {activeTab === 'stats' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">总分类数</p>
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
                    <p className="text-sm text-gray-600 dark:text-gray-400">总链接数</p>
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
                    <p className="text-sm text-gray-600 dark:text-gray-400">平均每分类</p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-gray-100 mt-2">
                      {stats.totalCategories > 0 ? Math.round(stats.totalLinks / stats.totalCategories) : 0}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                    <span className="text-2xl">📊</span>
                  </div>
                </div>
                <div className="mt-4 text-xs text-gray-600 dark:text-gray-400">
                  个链接
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
                  className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors text-center"
                >
                  <div className="text-2xl mb-2">➕</div>
                  <div className="text-sm font-medium text-gray-900 dark:text-gray-100">添加分类</div>
                </button>
                <button
                  onClick={() => router.push('/admin/dashboard/link/new')}
                  className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors text-center"
                >
                  <div className="text-2xl mb-2">🔗</div>
                  <div className="text-sm font-medium text-gray-900 dark:text-gray-100">添加链接</div>
                </button>
                <button
                  onClick={() => window.open('/', '_blank')}
                  className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors text-center"
                >
                  <div className="text-2xl mb-2">👁️</div>
                  <div className="text-sm font-medium text-gray-900 dark:text-gray-100">查看网站</div>
                </button>
                <button
                  onClick={loadData}
                  className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors text-center"
                >
                  <div className="text-2xl mb-2">🔄</div>
                  <div className="text-sm font-medium text-gray-900 dark:text-gray-100">刷新数据</div>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 分类管理 */}
        {activeTab === 'categories' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center mb-4">
              <input
                type="text"
                placeholder="搜索分类..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-400"
              />
              <button
                onClick={() => router.push('/admin/dashboard/category/new')}
                className="px-4 py-2 bg-gray-800 dark:bg-gray-700 text-white rounded-lg hover:bg-gray-700 dark:hover:bg-gray-600 transition-colors"
              >
                + 添加分类
              </button>
            </div>

            <div className="grid gap-4">
              {filteredCategories.map((category) => (
                <div
                  key={category.id}
                  className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <span className="text-2xl">{category.icon}</span>
                      <div>
                        <div className="flex items-center space-x-2">
                          <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                            {category.name}
                          </h3>
                          {category.is_private && (
                            <span className="text-xs px-2 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded">
                              🔒 私密
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          排序: {category.order} | {links.filter(l => l.category_id === category.id).length} 个链接
                        </p>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => viewCategoryLinks(category.id)}
                        className="px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
                        title="查看该分类下的所有链接"
                      >
                        👁️ 查看链接
                      </button>
                      <button
                        onClick={() => router.push(`/admin/dashboard/category/${category.id}`)}
                        className="px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
                      >
                        编辑
                      </button>
                      <button
                        onClick={() => deleteCategory(category.id)}
                        className="px-3 py-1.5 text-sm bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded hover:bg-red-200 dark:hover:bg-red-900/50"
                      >
                        删除
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
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
              <div className="flex-1 w-full sm:w-auto">
                <input
                  type="text"
                  placeholder="搜索链接..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-400"
                />
              </div>
              <div className="flex items-center space-x-2 w-full sm:w-auto">
                <select
                  value={selectedCategoryFilter || ''}
                  onChange={(e) => setSelectedCategoryFilter(e.target.value || null)}
                  className="flex-1 sm:flex-initial px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-400"
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
                  className="px-4 py-2 bg-gray-800 dark:bg-gray-700 text-white rounded-lg hover:bg-gray-700 dark:hover:bg-gray-600 transition-colors whitespace-nowrap"
                >
                  + 添加链接
                </button>
              </div>
            </div>

            {selectedCategoryFilter && (
              <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-3 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    正在筛选：
                  </span>
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {categories.find(c => c.id === selectedCategoryFilter)?.icon}{' '}
                    {categories.find(c => c.id === selectedCategoryFilter)?.name}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    ({filteredLinks.length} 个链接)
                  </span>
                </div>
                <button
                  onClick={() => setSelectedCategoryFilter(null)}
                  className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                >
                  ✕ 清除筛选
                </button>
              </div>
            )}

            <div className="grid gap-4">
              {filteredLinks.map((link) => {
                const category = categories.find(c => c.id === link.category_id);
                return (
                  <div
                    key={link.id}
                    className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                            {link.title}
                          </h3>
                          {link.is_private && (
                            <span className="text-xs px-2 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded">
                              🔒 私密
                            </span>
                          )}
                          {category && (
                            <span className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded">
                              {category.icon} {category.name}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                          {link.description}
                        </p>
                        <a
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-gray-500 dark:text-gray-500 hover:underline"
                        >
                          {link.url}
                        </a>
                      </div>
                      <div className="flex space-x-2 ml-4">
                        <button
                          onClick={() => router.push(`/admin/dashboard/link/${link.id}`)}
                          className="px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
                        >
                          编辑
                        </button>
                        <button
                          onClick={() => deleteLink(link.id)}
                          className="px-3 py-1.5 text-sm bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded hover:bg-red-200 dark:hover:bg-red-900/50"
                        >
                          删除
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
