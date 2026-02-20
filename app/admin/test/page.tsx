'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/app/lib/supabase';

export default function TestConnection() {
  const [status, setStatus] = useState<'checking' | 'success' | 'error'>('checking');
  const [message, setMessage] = useState('');
  const [currentUser, setCurrentUser] = useState<{ email?: string; id: string } | null>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      window.location.href = '/admin';
      return;
    }
    testConnection();
  };

  const testConnection = async () => {
    try {
      // 测试 1: 检查环境变量
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      if (!url || !key) {
        setStatus('error');
        setMessage('❌ 环境变量未配置\n\n请检查 .env.local 文件是否存在并包含:\nNEXT_PUBLIC_SUPABASE_URL\nNEXT_PUBLIC_SUPABASE_ANON_KEY');
        return;
      }

      // 测试 2: 检查用户登录状态
      const { data: { user }, error: userError } = await supabase.auth.getUser();

      if (userError) {
        setStatus('error');
        setMessage(`❌ 获取用户信息失败: ${userError.message}`);
        return;
      }

      setCurrentUser(user);

      if (!user) {
        setStatus('error');
        setMessage('❌ 未登录\n\n请先访问 /admin 登录');
        return;
      }

      // 测试 3: 检查数据库连接
      const { data, error } = await supabase
        .from('categories')
        .select('count')
        .limit(1);

      if (error) {
        setStatus('error');
        setMessage(`❌ 数据库连接失败: ${error.message}\n\n可能原因:\n1. 数据库表未创建\n2. RLS 策略配置错误\n3. API 密钥错误`);
        return;
      }

      // 测试 4: 尝试插入测试数据
      const testData = {
        name: '测试分类',
        icon: '🧪',
        order: 999,
        is_private: false,
      };

      const { data: insertData, error: insertError } = await supabase
        .from('categories')
        .insert([testData])
        .select();

      if (insertError) {
        setStatus('error');
        setMessage(`❌ 插入测试失败: ${insertError.message}\n\n详细信息:\n${JSON.stringify(insertError, null, 2)}`);
        return;
      }

      // 删除测试数据
      if (insertData && insertData[0]) {
        await supabase
          .from('categories')
          .delete()
          .eq('id', insertData[0].id);
      }

      setStatus('success');
      setMessage('✅ 所有测试通过！\n\n- 环境变量配置正确\n- 用户已登录\n- 数据库连接正常\n- 可以正常插入数据');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '未知错误';
      setStatus('error');
      setMessage(`❌ 测试失败: ${msg}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-white dark:bg-gray-800 rounded-lg p-8 border border-gray-200 dark:border-gray-700">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">
          🔍 Supabase 连接测试
        </h1>

        <div className="space-y-4">
          {status === 'checking' && (
            <div className="text-gray-600 dark:text-gray-400">
              正在测试连接...
            </div>
          )}

          {status === 'success' && (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
              <pre className="text-sm text-green-800 dark:text-green-200 whitespace-pre-wrap">
                {message}
              </pre>
            </div>
          )}

          {status === 'error' && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <pre className="text-sm text-red-800 dark:text-red-200 whitespace-pre-wrap">
                {message}
              </pre>
            </div>
          )}

          {currentUser && (
            <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">
                当前用户信息:
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                邮箱: {currentUser.email}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                ID: {currentUser.id}
              </p>
            </div>
          )}

          <div className="flex space-x-4 mt-6">
            <button
              onClick={testConnection}
              className="flex-1 bg-gray-800 dark:bg-gray-700 text-white py-3 rounded-lg font-medium hover:bg-gray-700 dark:hover:bg-gray-600 transition-colors"
            >
              重新测试
            </button>
            <a
              href="/admin/dashboard"
              className="flex-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 py-3 rounded-lg font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-center"
            >
              返回后台
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
