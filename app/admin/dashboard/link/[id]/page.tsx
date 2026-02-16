'use client';

import { useEffect, useState } from 'react';
import { supabase, Category } from '@/app/lib/supabase';
import { useRouter, useParams } from 'next/navigation';
import { getFaviconUrl, getFallbackFaviconUrl } from '@/app/utils/favicon';

export default function LinkForm() {
  const [categoryId, setCategoryId] = useState('');
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState('');
  const [order, setOrder] = useState(0);
  const [isPrivate, setIsPrivate] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [isEdit, setIsEdit] = useState(false);

  const [iconPreview, setIconPreview] = useState('');
  const [iconLoading, setIconLoading] = useState(false);
  const [iconError, setIconError] = useState(false);

  const router = useRouter();
  const params = useParams();

  useEffect(() => {
    loadCategories();
    if (params.id && params.id !== 'new') {
      setIsEdit(true);
      loadLink(params.id as string);
    }
  }, [params.id]);

  useEffect(() => {
    if (icon) {
      if (/[\p{Emoji}]/u.test(icon)) {
        setIconPreview(icon);
        setIconError(false);
      } else {
        setIconPreview('');
      }
    } else if (url) {
      setIconPreview(getFaviconUrl(url));
    } else {
      setIconPreview('');
    }
  }, [icon, url]);

  const loadCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('order', { ascending: true });

      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error('加载分类失败:', error);
    }
  };

  const loadLink = async (id: string) => {
    try {
      const { data, error } = await supabase
        .from('links')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      if (data) {
        setCategoryId(data.category_id);
        setTitle(data.title);
        setUrl(data.url);
        setDescription(data.description);
        setIcon(data.icon || '');
        setOrder(data.order);
        setIsPrivate(data.is_private || false);
      }
    } catch (error) {
      console.error('加载失败:', error);
      alert('加载失败');
    }
  };

  const handleAutoFetchIcon = async () => {
    if (!url) return;
    setIconLoading(true);
    setIconError(false);

    try {
      const faviconUrl = getFaviconUrl(url);
      const img = new Image();
      img.onload = () => {
        setIconLoading(false);
        setIconError(false);
      };
      img.onerror = () => {
        const fallbackUrl = getFallbackFaviconUrl(url);
        const fallbackImg = new Image();
        fallbackImg.onload = () => {
          setIconLoading(false);
          setIconError(false);
        };
        fallbackImg.onerror = () => {
          setIconLoading(false);
          setIconError(true);
        };
        fallbackImg.src = fallbackUrl;
      };
      img.src = faviconUrl;
    } catch (error) {
      setIconLoading(false);
      setIconError(true);
    }
  };

  const handleImageError = () => {
    setIconError(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const linkData = {
        category_id: categoryId,
        title,
        url,
        description,
        icon: icon || null,
        order,
        is_private: isPrivate,
      };

      if (isEdit) {
        const { error } = await supabase
          .from('links')
          .update(linkData)
          .eq('id', params.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('links')
          .insert([linkData]);

        if (error) throw error;
      }

      router.push('/admin/dashboard');
    } catch (error) {
      console.error('保存失败:', error);
      alert('保存失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {isEdit ? '编辑链接' : '添加链接'}
          </h1>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                所属分类 *
              </label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                required
                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-400"
              >
                <option value="">请选择分类</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.icon} {cat.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                网站名称 *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-400"
                placeholder="例如：GitHub"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                网站 URL *
              </label>
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                required
                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-400"
                placeholder="https://github.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                网站描述 *
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
                rows={3}
                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-400"
                placeholder="简短描述这个网站..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                图标（可选）
              </label>

              <div className="mb-3 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="flex items-center space-x-4">
                  <div className="w-16 h-16 flex items-center justify-center rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600">
                    {iconLoading ? (
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-800 dark:border-gray-300"></div>
                    ) : icon && /[\p{Emoji}]/u.test(icon) ? (
                      <span className="text-3xl">{icon}</span>
                    ) : iconPreview && !iconError ? (
                      <img
                        src={iconPreview}
                        alt="图标预览"
                        className="w-10 h-10 object-contain"
                        onError={handleImageError}
                      />
                    ) : (
                      <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        图标预览
                      </span>
                      {iconLoading && (
                        <span className="text-xs text-blue-600 dark:text-blue-400">正在获取...</span>
                      )}
                      {!iconLoading && iconPreview && !iconError && (
                        <span className="text-xs text-green-600 dark:text-green-400">✓ 获取成功</span>
                      )}
                      {iconError && (
                        <span className="text-xs text-red-600 dark:text-red-400">✗ 获取失败</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {icon ? '使用自定义图标' : '使用网站自动图标'}
                    </p>
                  </div>
                </div>
              </div>

              <input
                type="text"
                value={icon}
                onChange={(e) => setIcon(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-400"
                placeholder="留空自动获取，或输入 Emoji"
              />
              <div className="mt-2 flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => {
                    setIcon('');
                    handleAutoFetchIcon();
                  }}
                  disabled={!url || iconLoading}
                  className="text-xs px-3 py-1.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
                >
                  🔄 重新获取
                </button>
                <a
                  href="https://emojipedia.org"
                  target="_blank"
                  className="text-xs text-gray-500 dark:text-gray-400 hover:underline"
                >
                  或从 Emojipedia 复制 Emoji
                </a>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                排序顺序
              </label>
              <input
                type="number"
                value={order}
                onChange={(e) => setOrder(parseInt(e.target.value))}
                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-400"
                placeholder="0"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                数字越小越靠前
              </p>
            </div>

            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                id="isPrivate"
                checked={isPrivate}
                onChange={(e) => setIsPrivate(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-gray-800 focus:ring-gray-400"
              />
              <label htmlFor="isPrivate" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                🔒 设为私密链接（只有登录后可见）
              </label>
            </div>

            <div className="flex space-x-4">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-gray-800 dark:bg-gray-700 text-white py-3 rounded-lg font-medium hover:bg-gray-700 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
              >
                {loading ? '保存中...' : '保存'}
              </button>
              <button
                type="button"
                onClick={() => router.back()}
                className="flex-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 py-3 rounded-lg font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                取消
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
