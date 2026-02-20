'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/app/lib/supabase';
import { useRouter, useParams } from 'next/navigation';
import { toast } from '@/app/components/Toast';

export default function CategoryForm() {
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('');
  const [order, setOrder] = useState(0);
  const [isPrivate, setIsPrivate] = useState(false);
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const router = useRouter();
  const params = useParams();

  useEffect(() => {
    if (params.id && params.id !== 'new') {
      setIsEdit(true);
      setDataLoading(true);
      loadCategory(params.id as string);
    }
  }, [params.id]);

  const loadCategory = async (id: string) => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      if (data) {
        setName(data.name);
        setIcon(data.icon);
        setOrder(data.order);
        setIsPrivate(data.is_private || false);
      }
    } catch (error) {
      console.error('加载失败:', error);
      toast.error('加载分类失败');
    } finally {
      setDataLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isEdit) {
        const { error } = await supabase
          .from('categories')
          .update({ name, icon, order, is_private: isPrivate })
          .eq('id', params.id);

        if (error) {
          throw error;
        }
        toast.success('分类更新成功！');
      } else {
        const { data, error } = await supabase
          .from('categories')
          .insert([{ name, icon, order, is_private: isPrivate }])
          .select();

        if (error) {
          toast.error(`保存失败: ${error.message}`);
          throw error;
        }
        toast.success('分类添加成功！');
      }

      router.push('/admin/dashboard');
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : '';
      if (!msg) {
        toast.error('保存失败: 未知错误');
      }
    } finally {
      setLoading(false);
    }
  };

  if (dataLoading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <div className="space-y-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i}>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20 mb-2 animate-pulse"></div>
                <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse"></div>
              </div>
            ))}
            <div className="flex space-x-4">
              <div className="flex-1 h-12 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse"></div>
              <div className="flex-1 h-12 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              分类名称 *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-400"
              placeholder="例如：开发工具"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              图标 Emoji *
            </label>
            <input
              type="text"
              value={icon}
              onChange={(e) => setIcon(e.target.value)}
              required
              className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-400"
              placeholder="例如：🛠️"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              可以从 <a href="https://emojipedia.org" target="_blank" className="underline">Emojipedia</a> 复制 Emoji
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              排序顺序
            </label>
            <input
              type="number"
              value={order}
              onChange={(e) => setOrder(parseInt(e.target.value, 10) || 0)}
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
              🔒 设为私密分类（只有登录后可见）
            </label>
          </div>

          <div className="flex space-x-4">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-gray-800 dark:bg-gray-700 text-white py-3 rounded-lg font-medium hover:bg-gray-700 dark:hover:bg-gray-600 transition-all disabled:opacity-50 active:scale-95 active:opacity-90"
            >
              {loading ? '保存中...' : '保存'}
            </button>
            <button
              type="button"
              onClick={() => router.back()}
              className="flex-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 py-3 rounded-lg font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-all active:scale-95 active:opacity-90"
            >
              取消
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
