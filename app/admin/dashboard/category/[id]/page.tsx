'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/app/lib/supabase';
import { useRouter, useParams } from 'next/navigation';

export default function CategoryForm() {
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('');
  const [order, setOrder] = useState(0);
  const [isPrivate, setIsPrivate] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const router = useRouter();
  const params = useParams();

  useEffect(() => {
    if (params.id && params.id !== 'new') {
      setIsEdit(true);
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
      alert('加载失败');
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
          console.error('更新错误详情:', error);
          throw error;
        }
      } else {
        const { data, error } = await supabase
          .from('categories')
          .insert([{ name, icon, order, is_private: isPrivate }])
          .select();

        if (error) {
          console.error('插入错误详情:', error);
          alert(`保存失败: ${error.message}\n\n请检查:\n1. Supabase 配置是否正确\n2. 数据库表是否已创建\n3. 是否已登录\n\n详细错误: ${JSON.stringify(error, null, 2)}`);
          throw error;
        }
        console.log('插入成功:', data);
      }

      router.push('/admin/dashboard');
    } catch (error: any) {
      console.error('保存失败:', error);
      if (!error.message) {
        alert('保存失败: 未知错误，请检查浏览器控制台');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {isEdit ? '编辑分类' : '添加分类'}
          </h1>
        </div>
      </header>

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
                🔒 设为私密分类（只有登录后可见）
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
