'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Card, CodeHighlight, Space, Tag, Toast, Typography } from '@douyinfe/semi-ui';
import {
  IconCopy,
  IconAlertTriangle,
  IconExternalOpen,
  IconRefresh,
  IconServer,
  IconTickCircle,
} from '@douyinfe/semi-icons';
import { supabase } from '@/app/lib/supabase';
import { getLocalAdminUser } from '@/app/lib/local-admin';

const { Paragraph, Text } = Typography;

type InitStatus = 'idle' | 'checking' | 'success' | 'error';

const sqlCode = `CREATE TABLE IF NOT EXISTS categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  icon TEXT NOT NULL,
  "order" INTEGER NOT NULL DEFAULT 0,
  is_private BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

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

ALTER TABLE categories ADD COLUMN IF NOT EXISTS is_private BOOLEAN DEFAULT FALSE;
ALTER TABLE links ADD COLUMN IF NOT EXISTS is_private BOOLEAN DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_categories_order ON categories("order");
CREATE INDEX IF NOT EXISTS idx_links_category_id ON links(category_id);
CREATE INDEX IF NOT EXISTS idx_links_order ON links("order");

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read access on categories" ON categories;
DROP POLICY IF EXISTS "Allow public read access on links" ON links;
DROP POLICY IF EXISTS "Allow public read access on public categories" ON categories;
DROP POLICY IF EXISTS "Allow public read access on public links" ON links;

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

export default function DatabaseInit() {
  const [status, setStatus] = useState<InitStatus>('idle');
  const [message, setMessage] = useState('');
  const [logs, setLogs] = useState<string[]>([]);
  const router = useRouter();

  const addLog = (log: string) => {
    setLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${log}`]);
  };

  const checkAndInitDatabase = async () => {
    setStatus('checking');
    setMessage('');
    setLogs([]);

    try {
      addLog('开始检查数据库结构');

      const localUser = getLocalAdminUser();
      const {
        data: { user },
        error: userError,
      } = localUser
        ? { data: { user: localUser }, error: null }
        : await supabase.auth.getUser();

      if (userError || !user) {
        setStatus('error');
        setMessage('未登录，请先登录后台');
        addLog('错误：用户未登录');
        return;
      }

      addLog(`用户已登录：${user.email}`);

      let needsInit = false;

      addLog('检查 categories 表');
      const { error: categoriesError } = await supabase
        .from('categories')
        .select('id, name, icon, order, is_private')
        .limit(1);

      if (categoriesError) {
        if (
          categoriesError.message.includes('relation') ||
          categoriesError.message.includes('does not exist') ||
          categoriesError.message.includes('is_private')
        ) {
          needsInit = true;
          addLog(`categories 表需要初始化：${categoriesError.message}`);
        } else {
          throw categoriesError;
        }
      } else {
        addLog('categories 表结构正常');
      }

      addLog('检查 links 表');
      const { error: linksError } = await supabase
        .from('links')
        .select('id, title, url, is_private')
        .limit(1);

      if (linksError) {
        if (
          linksError.message.includes('relation') ||
          linksError.message.includes('does not exist') ||
          linksError.message.includes('is_private')
        ) {
          needsInit = true;
          addLog(`links 表需要初始化：${linksError.message}`);
        } else {
          throw linksError;
        }
      } else {
        addLog('links 表结构正常');
      }

      if (!needsInit) {
        setStatus('success');
        setMessage('数据库结构已正确配置');
        addLog('检查完成，一切正常');
        return;
      }

      setStatus('error');
      setMessage('数据库需要手动初始化');
      addLog('请复制下方 SQL 到 Supabase SQL Editor 中执行');
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : '未知错误';
      setStatus('error');
      setMessage(`检查失败：${msg}`);
      addLog(`错误：${msg}`);
    }
  };

  const copySql = async () => {
    await navigator.clipboard.writeText(sqlCode);
    Toast.success('SQL 已复制到剪贴板');
  };

  return (
    <main className="admin-shell">
      <div className="admin-content">
        <Space vertical spacing={24} style={{ width: '100%' }}>
          <Space align="start" style={{ width: '100%', justifyContent: 'space-between' }} wrap>
            <div>
              <h1 className="admin-page-title">数据库初始化</h1>
              <p className="admin-page-subtitle">检查 Supabase 表结构，并提供可手动执行的初始化 SQL。</p>
            </div>
            <Space wrap>
              <Button icon={<IconRefresh />} loading={status === 'checking'} onClick={() => void checkAndInitDatabase()}>
                检查数据库
              </Button>
              <Button onClick={() => router.push('/admin/test')}>连接测试</Button>
            </Space>
          </Space>

          <Card bordered={false} shadows="hover">
            <Space vertical spacing="medium" align="start" style={{ width: '100%' }}>
              <Tag
                color="grey"
                prefixIcon={
                  status === 'success' ? (
                    <IconTickCircle />
                  ) : status === 'error' ? (
                    <IconAlertTriangle />
                  ) : (
                    <IconServer />
                  )
                }
              >
                {status === 'idle'
                  ? '等待检查'
                  : status === 'checking'
                    ? '检查中'
                    : status === 'success'
                      ? '已就绪'
                      : '需要处理'}
              </Tag>
              {message && <Paragraph style={{ margin: 0 }}>{message}</Paragraph>}
            </Space>
          </Card>

          {logs.length > 0 && (
            <Card title="执行日志" bordered={false} shadows="hover">
              <Space vertical align="start" style={{ width: '100%' }}>
                {logs.map((log) => (
                  <Text key={log} code style={{ whiteSpace: 'normal' }}>
                    {log}
                  </Text>
                ))}
              </Space>
            </Card>
          )}

          {status === 'error' && (
            <Card
              title="初始化 SQL"
              bordered={false}
              shadows="hover"
              headerExtraContent={
                <Button icon={<IconCopy />} onClick={() => void copySql()}>
                  复制 SQL
                </Button>
              }
            >
              <Space vertical spacing="medium" style={{ width: '100%' }}>
                <CodeHighlight language="sql" code={sqlCode} />
                <Card bordered style={{ background: 'var(--semi-color-fill-0)' }}>
                  <Space vertical align="start">
                    <Text strong>执行步骤</Text>
                    <Text>1. 打开 Supabase 项目，进入 SQL Editor。</Text>
                    <Text>2. 新建 Query，粘贴 SQL 并点击 Run。</Text>
                    <Text>3. 回到本页重新点击“检查数据库”。</Text>
                    <Button
                      icon={<IconExternalOpen />}
                      onClick={() => window.open('https://supabase.com', '_blank', 'noopener,noreferrer')}
                    >
                      打开 Supabase
                    </Button>
                  </Space>
                </Card>
              </Space>
            </Card>
          )}

          {status === 'success' && (
            <Card bordered={false} shadows="hover">
              <Space wrap>
                <Button theme="solid" type="primary" onClick={() => router.push('/admin/dashboard')}>
                  进入后台管理
                </Button>
                <Button onClick={() => router.push('/')}>返回首页</Button>
              </Space>
            </Card>
          )}
        </Space>
      </div>
    </main>
  );
}
