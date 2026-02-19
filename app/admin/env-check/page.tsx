'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/app/lib/supabase';
import { useRouter } from 'next/navigation';

export default function EnvCheck() {
  const [authenticated, setAuthenticated] = useState(false);
  const [checking, setChecking] = useState(true);
  const router = useRouter();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const hasUrl = !!supabaseUrl;
  const hasKey = !!supabaseKey;

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/admin');
        return;
      }
      setAuthenticated(true);
      setChecking(false);
    };
    checkAuth();
  }, [router]);

  if (checking) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-pulse text-gray-500">验证中...</div>
      </div>
    );
  }

  if (!authenticated) return null;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
      <div className="max-w-3xl w-full bg-white dark:bg-gray-800 rounded-lg p-8 border border-gray-200 dark:border-gray-700">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">
          🔧 环境变量检查
        </h1>

        <div className="space-y-6">
          {/* URL 检查 */}
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                NEXT_PUBLIC_SUPABASE_URL
              </h3>
              <span className={`text-sm px-2 py-1 rounded ${hasUrl ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'}`}>
                {hasUrl ? '✅ 已配置' : '❌ 未配置'}
              </span>
            </div>
          </div>

          {/* Key 检查 */}
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                NEXT_PUBLIC_SUPABASE_ANON_KEY
              </h3>
              <span className={`text-sm px-2 py-1 rounded ${hasKey ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'}`}>
                {hasKey ? '✅ 已配置' : '❌ 未配置'}
              </span>
            </div>
          </div>

          {/* 操作按钮 */}
          <div className="flex items-center space-x-3">
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-sm"
            >
              刷新检查
            </button>
          </div>

          {/* 配置说明 */}
          {(!hasUrl || !hasKey) && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
              <h3 className="font-semibold text-yellow-800 dark:text-yellow-200 mb-2">
                ⚠️ 配置步骤
              </h3>
              <ol className="text-sm text-yellow-700 dark:text-yellow-300 space-y-2 list-decimal list-inside">
                <li>在项目根目录创建 <code className="bg-yellow-100 dark:bg-yellow-900/40 px-1 rounded">.env.local</code> 文件</li>
                <li>添加以下内容（替换为你的实际值）：
                  <pre className="mt-2 p-3 bg-yellow-100 dark:bg-yellow-900/40 rounded text-xs overflow-x-auto">
{`NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here`}
                  </pre>
                </li>
                <li>保存文件</li>
                <li><strong>重启开发服务器</strong>（Ctrl+C 然后 npm run dev）</li>
                <li>刷新此页面检查</li>
              </ol>
            </div>
          )}

          {/* 成功提示 */}
          {hasUrl && hasKey && (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
              <h3 className="font-semibold text-green-800 dark:text-green-200 mb-2">
                ✅ 环境变量配置正确
              </h3>
              <p className="text-sm text-green-700 dark:text-green-300 mb-3">
                现在可以测试 Supabase 连接了
              </p>
              <a
                href="/admin/test"
                className="inline-block px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
              >
                前往连接测试 →
              </a>
            </div>
          )}

          {/* 快捷链接 */}
          <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
              快捷链接
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <a
                href="/"
                className="text-center px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-sm"
              >
                返回首页
              </a>
              <a
                href="/admin"
                className="text-center px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-sm"
              >
                后台登录
              </a>
              <a
                href="https://supabase.com"
                target="_blank"
                className="text-center px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-sm"
              >
                Supabase 官网
              </a>
              <a
                href="/SUPABASE_SETUP.md"
                target="_blank"
                className="text-center px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-sm"
              >
                设置文档
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
