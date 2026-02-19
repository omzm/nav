'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { supabase, Category, Link } from '@/app/lib/supabase';
import { useRouter } from 'next/navigation';
import { toast } from '@/app/components/Toast';
import { loadAdminCache, saveAdminCache } from '@/app/utils/adminCache';
import ConfirmDialog from '@/app/components/ConfirmDialog';

export default function AdminDashboard() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [links, setLinks] = useState<Link[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'categories' | 'links' | 'stats'>('stats');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({ open: false, title: '', message: '', onConfirm: () => {} });
  const router = useRouter();

  const stats = useMemo(() => {
    const publicCats = categories.filter(c => !c.is_private).length;
    const privateCats = categories.filter(c => c.is_private).length;
    const privateCatIds = new Set(categories.filter(c => c.is_private).map(c => c.id));
    const privateLnks = links.filter(l => l.is_private || privateCatIds.has(l.category_id)).length;
    const publicLnks = links.length - privateLnks;

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
    loadData();
  }, []);

  useEffect(() => {
    const categoriesChannel = supabase
      .channel('admin-categories-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'categories' }, () => {
        loadData();
      })
      .subscribe();

    const linksChannel = supabase
      .channel('admin-links-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'links' }, () => {
        loadData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(categoriesChannel);
      supabase.removeChannel(linksChannel);
    };
  }, []);

  const exportData = () => {
    const exportCategories = categories.map(cat => ({
      name: cat.name,
      icon: cat.icon,
      order: cat.order,
      is_private: cat.is_private,
      links: links
        .filter(l => l.category_id === cat.id)
        .map(l => ({
          title: l.title,
          url: l.url,
          description: l.description,
          icon: l.icon || null,
          order: l.order,
          is_private: l.is_private,
        })),
    }));

    const data = {
      exported_at: new Date().toISOString(),
      total_categories: categories.length,
      total_links: links.length,
      categories: exportCategories,
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nav-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('导出成功！');
  };

  const loadData = async (forceRefresh = false) => {
    try {
      if (forceRefresh) {
        setRefreshing(true);
      }

      if (!forceRefresh) {
        const cached = loadAdminCache();
        if (cached) {
          setCategories(cached.categories);
          setLinks(cached.links);
          setLoading(false);
        }
      }

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

      saveAdminCache(categoriesResult.data || [], linksResult.data || []);

      setCategories(categoriesResult.data || []);
      setLinks(linksResult.data || []);

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

  const deleteCategory = (id: string) => {
    setConfirmDialog({
      open: true,
      title: '删除分类',
      message: '确定要删除这个分类吗？这将同时删除该分类下的所有链接。',
      onConfirm: async () => {
        setConfirmDialog(prev => ({ ...prev, open: false }));
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
      },
    });
  };

  const deleteLink = (id: string) => {
    setConfirmDialog({
      open: true,
      title: '删除链接',
      message: '确定要删除这个链接吗？',
      onConfirm: async () => {
        setConfirmDialog(prev => ({ ...prev, open: false }));
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
      },
    });
  };

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
    );
  }

  return (
    <>
      <ConfirmDialog
        open={confirmDialog.open}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmText="删除"
        cancelText="取消"
        variant="danger"
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog(prev => ({ ...prev, open: false }))}
      />

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
              <span className="text-xs opacity-75">({categories.length}{stats.privateCategories > 0 && <span className="ml-0.5">🔒{stats.privateCategories}</span>})</span>
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
              <span className="text-xs opacity-75">({links.length}{stats.privateLinks > 0 && <span className="ml-0.5">🔒{stats.privateLinks}</span>})</span>
            </span>
          </button>
        </div>

        {/* 统计面板 */}
        {activeTab === 'stats' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">📂 总分类数</p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-gray-100 mt-2">
                      {stats.totalCategories}
                      {stats.privateCategories > 0 && (
                        <span className="text-sm font-normal text-amber-600 dark:text-amber-400 ml-2">（🔒{stats.privateCategories}）</span>
                      )}
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
                      {stats.privateLinks > 0 && (
                        <span className="text-sm font-normal text-amber-600 dark:text-amber-400 ml-2">（🔒{stats.privateLinks}）</span>
                      )}
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
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                快速操作
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
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
                  onClick={exportData}
                  className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-all text-center active:scale-95 active:opacity-90"
                >
                  <div className="text-2xl mb-2">📥</div>
                  <div className="text-sm font-medium text-gray-900 dark:text-gray-100">导出备份</div>
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

            {filteredCategories.length === 0 ? (
              <div className="bg-white dark:bg-gray-800 rounded-lg p-12 border border-gray-200 dark:border-gray-700 text-center">
                <div className="text-4xl mb-4">📁</div>
                <p className="text-gray-500 dark:text-gray-400 mb-4">
                  {searchQuery ? '没有找到匹配的分类' : '暂无分类，点击添加第一个分类'}
                </p>
                {!searchQuery && (
                  <button
                    onClick={() => router.push('/admin/dashboard/category/new')}
                    className="px-4 py-2 bg-gray-800 dark:bg-gray-700 text-white rounded-lg hover:bg-gray-700 dark:hover:bg-gray-600 transition-all text-sm font-medium active:scale-95"
                  >
                    ➕ 添加分类
                  </button>
                )}
              </div>
            ) : (
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
                              排序: {category.order} · {(() => {
                              const catLinks = links.filter(l => l.category_id === category.id);
                              const privateCount = catLinks.filter(l => l.is_private || category.is_private).length;
                              return (<>{catLinks.length} 个链接{privateCount > 0 && <span className="text-amber-600 dark:text-amber-400 ml-1">（🔒{privateCount}）</span>}</>);
                            })()}
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
            )}
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

            {filteredLinks.length === 0 ? (
              <div className="bg-white dark:bg-gray-800 rounded-lg p-12 border border-gray-200 dark:border-gray-700 text-center">
                <div className="text-4xl mb-4">🔗</div>
                <p className="text-gray-500 dark:text-gray-400 mb-4">
                  {searchQuery || selectedCategoryFilter ? '没有找到匹配的链接' : '暂无链接，点击添加第一个链接'}
                </p>
                {!searchQuery && !selectedCategoryFilter && (
                  <button
                    onClick={() => router.push('/admin/dashboard/link/new')}
                    className="px-4 py-2 bg-gray-800 dark:bg-gray-700 text-white rounded-lg hover:bg-gray-700 dark:hover:bg-gray-600 transition-all text-sm font-medium active:scale-95"
                  >
                    ➕ 添加链接
                  </button>
                )}
              </div>
            ) : (
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
            )}
          </div>
        )}
      </div>
    </>
  );
}
