'use client';

import { useState } from 'react';
import { supabase } from '@/app/lib/supabase';

export default function DatabaseInit() {
  const [status, setStatus] = useState<'idle' | 'checking' | 'creating' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (log: string) => {
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${log}`]);
  };

  const checkAndInitDatabase = async () => {
    setStatus('checking');
    setMessage('');
    setLogs([]);

    try {
      addLog('开始检查数据库...');

      // 检查用户登录状态
      const { data: { user }, error: userError } = await supabase.auth.getUser();

      if (userError || !user) {
        setStatus('error');
        setMessage('❌ 未登录，请先登录后台');
        addLog('错误: 用户未登录');
        return;
      }

      addLog(`✓ 用户已登录: ${user.email}`);

      // 检查 categories 表是否存在且有 is_private 字段
      addLog('检查 categories 表...');
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('categories')
        .select('id, name, icon, order, is_private')
        .limit(1);

      let needsInit = false;

      if (categoriesError) {
        if (categoriesError.message.includes('relation') || categoriesError.message.includes('does not exist')) {
          addLog('✗ categories 表不存在，需要创建');
          needsInit = true;
        } else if (categoriesError.message.includes('is_private')) {
          addLog('✗ categories 表缺少 is_private 字段');
          needsInit = true;
        } else {
          throw categoriesError;
        }
      } else {
        addLog('✓ categories 表结构正确');
      }

      // 检查 links 表
      addLog('检查 links 表...');
      const { data: linksData, error: linksError } = await supabase
        .from('links')
        .select('id, title, url, is_private')
        .limit(1);

      if (linksError) {
        if (linksError.message.includes('relation') || linksError.message.includes('does not exist')) {
          addLog('✗ links 表不存在，需要创建');
          needsInit = true;
        } else if (linksError.message.includes('is_private')) {
          addLog('✗ links 表缺少 is_private 字段');
          needsInit = true;
        } else {
          throw linksError;
        }
      } else {
        addLog('✓ links 表结构正确');
      }

      if (!needsInit) {
        setStatus('success');
        setMessage('✅ 数据库结构已正确配置！');
        addLog('数据库检查完成，一切正常');
        return;
      }

      // 需要初始化
      setStatus('error');
      setMessage('❌ 数据库需要手动初始化');
      addLog('');
      addLog('⚠️ 检测到数据库结构问题');
      addLog('');
      addLog('由于 Supabase 的安全限制，无法通过客户端自动创建表结构。');
      addLog('请按照以下步骤手动初始化：');
      addLog('');
      addLog('1. 访问 https://supabase.com 并登录');
      addLog('2. 选择你的项目');
      addLog('3. 点击左侧 "SQL Editor"');
      addLog('4. 点击 "New Query"');
      addLog('5. 复制下方的 SQL 代码');
      addLog('6. 粘贴到编辑器并点击 "Run"');
      addLog('7. 刷新本页面重新检查');

    } catch (error: any) {
      setStatus('error');
      setMessage(`❌ 检查失败: ${error.message}`);
      addLog(`错误: ${error.message}`);
    }
  };

  const sqlCode = `-- 创建分类表
CREATE TABLE IF NOT EXISTS categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  icon TEXT NOT NULL,
  "order" INTEGER NOT NULL DEFAULT 0,
  is_private BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- 创建链接表
CREATE TABLE IF NOT EXISTS links (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id UUID REFERENCES categories(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT,
  "order" INTEGER NOT NULL DEFAULT 0,
  is_private BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- 如果表已存在，添加缺失的字段
ALTER TABLE categories ADD COLUMN IF NOT EXISTS is_private BOOLEAN DEFAULT FALSE;
ALTER TABLE links ADD COLUMN IF NOT EXISTS is_private BOOLEAN DEFAULT FALSE;

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_categories_order ON categories("order");
CREATE INDEX IF NOT EXISTS idx_links_category_id ON links(category_id);
CREATE INDEX IF NOT EXISTS idx_links_order ON links("order");

-- 启用行级安全 (RLS)
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE links ENABLE ROW LEVEL SECURITY;

-- 删除旧策略（如果存在）
DROP POLICY IF EXISTS "Allow public read access on categories" ON categories;
DROP POLICY IF EXISTS "Allow public read access on links" ON links;
DROP POLICY IF EXISTS "Allow public read access on public categories" ON categories;
DROP POLICY IF EXISTS "Allow public read access on public links" ON links;

-- 创建新策略
CREATE POLICY "Allow public read access on public categories"
  ON categories FOR SELECT
  USING (is_private = FALSE OR auth.uid() IS NOT NULL);

CREATE POLICY "Allow public read access on public links"
  ON links FOR SELECT
  USING (is_private = FALSE OR auth.uid() IS NOT NULL);

CREATE POLICY "Allow authenticated users to insert categories"
  ON categories FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update categories"
  ON categories FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to delete categories"
  ON categories FOR DELETE
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to insert links"
  ON links FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update links"
  ON links FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to delete links"
  ON links FOR DELETE
  TO authenticated
  USING (true);`;

  const copySql = () => {
    navigator.clipboard.writeText(sqlCode);
    alert('✅ SQL 代码已复制到剪贴板！');
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-8 border border-gray-200 dark:border-gray-700">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">
            🗄️ 数据库初始化
          </h1>

          {/* 操作按钮 */}
          <div className="flex space-x-4 mb-6">
            <button
              onClick={checkAndInitDatabase}
              disabled={status === 'checking'}
              className="px-6 py-3 bg-gray-800 dark:bg-gray-700 text-white rounded-lg font-medium hover:bg-gray-700 dark:hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {status === 'checking' ? '检查中...' : '检查数据库'}
            </button>

            <a
              href="/admin/test"
              className="px-6 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-center"
            >
              连接测试
            </a>
          </div>

          {/* 状态消息 */}
          {message && (
            <div className={`p-4 rounded-lg mb-6 ${
              status === 'success'
                ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
                : status === 'error'
                ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
                : 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800'
            }`}>
              <p className={`text-sm font-medium ${
                status === 'success'
                  ? 'text-green-800 dark:text-green-200'
                  : status === 'error'
                  ? 'text-red-800 dark:text-red-200'
                  : 'text-blue-800 dark:text-blue-200'
              }`}>
                {message}
              </p>
            </div>
          )}

          {/* 日志 */}
          {logs.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                执行日志:
              </h3>
              <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 max-h-64 overflow-y-auto">
                {logs.map((log, index) => (
                  <div key={index} className="text-xs text-gray-600 dark:text-gray-400 font-mono">
                    {log}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SQL 代码 */}
          {status === 'error' && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  初始化 SQL 代码:
                </h3>
                <button
                  onClick={copySql}
                  className="px-3 py-1.5 text-sm bg-gray-800 dark:bg-gray-700 text-white rounded hover:bg-gray-700 dark:hover:bg-gray-600 transition-colors"
                >
                  📋 复制代码
                </button>
              </div>
              <pre className="bg-gray-900 text-green-400 p-4 rounded-lg text-xs overflow-x-auto max-h-96 overflow-y-auto">
                {sqlCode}
              </pre>

              <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                <h4 className="font-semibold text-yellow-800 dark:text-yellow-200 text-sm mb-2">
                  📝 执行步骤:
                </h4>
                <ol className="text-sm text-yellow-700 dark:text-yellow-300 space-y-1 list-decimal list-inside">
                  <li>点击上方"📋 复制代码"按钮</li>
                  <li>访问 <a href="https://supabase.com" target="_blank" className="underline">https://supabase.com</a></li>
                  <li>选择你的项目 → SQL Editor → New Query</li>
                  <li>粘贴代码并点击 Run</li>
                  <li>返回此页面，点击"检查数据库"</li>
                </ol>
              </div>
            </div>
          )}

          {/* 成功后的操作 */}
          {status === 'success' && (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
              <h4 className="font-semibold text-green-800 dark:text-green-200 mb-3">
                🎉 数据库已就绪！
              </h4>
              <div className="space-y-2">
                <a
                  href="/admin/dashboard"
                  className="block w-full text-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  进入后台管理 →
                </a>
                <a
                  href="/"
                  className="block w-full text-center px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  返回首页
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
