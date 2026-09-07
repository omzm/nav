'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Card, CodeHighlight, Space, Tag, Toast, Typography } from '@douyinfe/semi-ui';
import {
  IconAlertTriangle,
  IconCopy,
  IconExternalOpen,
  IconRefresh,
  IconServer,
  IconTickCircle,
} from '@douyinfe/semi-icons';
import { supabase } from '@/app/lib/supabase';
import { getLocalAdminUser } from '@/app/lib/local-admin';
import { categories as fallbackCategories } from '@/app/data';

const { Paragraph, Text } = Typography;

type InitStatus = 'idle' | 'checking' | 'success' | 'warning' | 'error';

type DatabaseSyncStatus = {
  categoryCount: number;
  linkCount: number;
  fallbackCategoryCount: number;
  fallbackLinkCount: number;
  needsDataSync: boolean;
  needsSchemaSync: boolean;
};

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
CREATE INDEX IF NOT EXISTS idx_categories_is_private ON categories(is_private);
CREATE INDEX IF NOT EXISTS idx_links_category_id ON links(category_id);
CREATE INDEX IF NOT EXISTS idx_links_order ON links("order");
CREATE INDEX IF NOT EXISTS idx_links_is_private ON links(is_private);

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read access on categories" ON categories;
DROP POLICY IF EXISTS "Allow public read access on links" ON links;
DROP POLICY IF EXISTS "Allow public read access on public categories" ON categories;
DROP POLICY IF EXISTS "Allow public read access on public links" ON links;
DROP POLICY IF EXISTS "Allow authenticated users to insert categories" ON categories;
DROP POLICY IF EXISTS "Allow authenticated users to update categories" ON categories;
DROP POLICY IF EXISTS "Allow authenticated users to delete categories" ON categories;
DROP POLICY IF EXISTS "Allow authenticated users to insert links" ON links;
DROP POLICY IF EXISTS "Allow authenticated users to update links" ON links;
DROP POLICY IF EXISTS "Allow authenticated users to delete links" ON links;

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
  USING (true);

CREATE TABLE IF NOT EXISTS link_clicks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  link_id UUID REFERENCES links(id) ON DELETE CASCADE,
  clicked_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

CREATE INDEX IF NOT EXISTS idx_link_clicks_link_id ON link_clicks(link_id);
CREATE INDEX IF NOT EXISTS idx_link_clicks_clicked_at ON link_clicks(clicked_at);
CREATE INDEX IF NOT EXISTS idx_link_clicks_clicked_at_link_id ON link_clicks(clicked_at, link_id);

ALTER TABLE link_clicks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow anyone to insert link_clicks" ON link_clicks;
DROP POLICY IF EXISTS "Allow anyone to read link_clicks" ON link_clicks;

CREATE POLICY "Allow anyone to insert link_clicks"
  ON link_clicks FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow anyone to read link_clicks"
  ON link_clicks FOR SELECT
  USING (true);

CREATE TABLE IF NOT EXISTS site_stats (
  key TEXT PRIMARY KEY,
  value BIGINT NOT NULL DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

INSERT INTO site_stats (key, value)
VALUES ('total_views', 0)
ON CONFLICT (key) DO NOTHING;

ALTER TABLE site_stats ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow anyone to read site_stats" ON site_stats;

CREATE POLICY "Allow anyone to read site_stats"
  ON site_stats FOR SELECT
  USING (true);

CREATE OR REPLACE FUNCTION increment_site_view()
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  next_value BIGINT;
BEGIN
  INSERT INTO site_stats AS stats (key, value, updated_at)
  VALUES ('total_views', 1, TIMEZONE('utc', NOW()))
  ON CONFLICT (key)
  DO UPDATE SET
    value = stats.value + 1,
    updated_at = EXCLUDED.updated_at
  RETURNING value INTO next_value;

  RETURN next_value;
END;
$$;

CREATE OR REPLACE FUNCTION get_today_hot_links(limit_count integer DEFAULT 5)
RETURNS TABLE (
  title TEXT,
  url TEXT,
  icon TEXT,
  click_count BIGINT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    l.title,
    l.url,
    l.icon,
    COUNT(c.id)::BIGINT AS click_count
  FROM link_clicks c
  JOIN links l ON l.id = c.link_id
  WHERE c.clicked_at >= date_trunc('day', now())
    AND c.clicked_at < date_trunc('day', now()) + interval '1 day'
    AND COALESCE(l.is_private, false) = false
  GROUP BY l.id, l.title, l.url, l.icon
  ORDER BY click_count DESC, l.title ASC
  LIMIT GREATEST(limit_count, 0);
$$;

CREATE OR REPLACE FUNCTION get_nav_snapshot_data(limit_count integer DEFAULT 5)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'categories',
    COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', c.id,
          'name', c.name,
          'icon', c.icon,
          'isPrivate', COALESCE(c.is_private, false),
          'links', COALESCE((
            SELECT jsonb_agg(
              jsonb_build_object(
                'id', l.id,
                'title', l.title,
                'url', l.url,
                'description', l.description,
                'icon', l.icon,
                'isPrivate', COALESCE(l.is_private, false)
              )
              ORDER BY l."order" ASC
            )
            FROM links l
            WHERE l.category_id = c.id
          ), '[]'::jsonb)
        )
        ORDER BY c."order" ASC
      )
      FROM categories c
    ), '[]'::jsonb),
    'hotLinks',
    COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'title', h.title,
          'url', h.url,
          'icon', h.icon,
          'clickCount', h.click_count
        )
        ORDER BY h.click_count DESC, h.title ASC
      )
      FROM get_today_hot_links(limit_count) h
    ), '[]'::jsonb),
    'stats',
    jsonb_build_object(
      'categoryCount', (SELECT COUNT(*) FROM categories),
      'linkCount', (SELECT COUNT(*) FROM links),
      'totalViewCount', COALESCE((SELECT value FROM site_stats WHERE key = 'total_views'), 0)
    ),
    'generatedAt', now()
  );
$$;

GRANT EXECUTE ON FUNCTION get_today_hot_links(integer) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION increment_site_view() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_nav_snapshot_data(integer) TO anon, authenticated;`;

function isMissingDatabaseObject(message: string) {
  return (
    message.includes('relation') ||
    message.includes('function') ||
    message.includes('does not exist') ||
    message.includes('schema cache') ||
    message.includes('is_private')
  );
}

export default function DatabaseInit() {
  const [status, setStatus] = useState<InitStatus>('idle');
  const [message, setMessage] = useState('');
  const [logs, setLogs] = useState<string[]>([]);
  const [syncStatus, setSyncStatus] = useState<DatabaseSyncStatus | null>(null);
  const router = useRouter();

  const addLog = (log: string) => {
    setLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${log}`]);
  };

  const checkAndInitDatabase = async () => {
    setStatus('checking');
    setMessage('');
    setLogs([]);
    setSyncStatus(null);

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

      let needsSchemaSync = false;
      let coreTablesReady = true;

      const tableChecks = [
        {
          name: 'categories',
          query: () => supabase.from('categories').select('id, name, icon, order, is_private').limit(1),
          core: true,
        },
        {
          name: 'links',
          query: () => supabase.from('links').select('id, title, url, is_private').limit(1),
          core: true,
        },
        {
          name: 'link_clicks',
          query: () => supabase.from('link_clicks').select('id, link_id, clicked_at').limit(1),
          core: false,
        },
        {
          name: 'site_stats',
          query: () => supabase.from('site_stats').select('key, value, updated_at').limit(1),
          core: false,
        },
      ];

      for (const check of tableChecks) {
        addLog(`检查 ${check.name} 表`);
        const { error } = await check.query();

        if (error) {
          if (isMissingDatabaseObject(error.message)) {
            needsSchemaSync = true;
            if (check.core) coreTablesReady = false;
            addLog(`${check.name} 表需要同步：${error.message}`);
          } else {
            throw error;
          }
        } else {
          addLog(`${check.name} 表正常`);
        }
      }

      const rpcChecks = [
        {
          name: 'get_today_hot_links',
          query: () => supabase.rpc('get_today_hot_links', { limit_count: 1 }),
        },
        {
          name: 'get_nav_snapshot_data',
          query: () => supabase.rpc('get_nav_snapshot_data', { limit_count: 1 }),
        },
      ];

      for (const check of rpcChecks) {
        addLog(`检查 ${check.name} RPC`);
        const { error } = await check.query();

        if (error) {
          if (isMissingDatabaseObject(error.message)) {
            needsSchemaSync = true;
            addLog(`${check.name} RPC 需要同步：${error.message}`);
          } else {
            throw error;
          }
        } else {
          addLog(`${check.name} RPC 正常`);
        }
      }

      const fallbackCategoryCount = fallbackCategories.length;
      const fallbackLinkCount = fallbackCategories.reduce((sum, category) => sum + category.links.length, 0);
      let categoryCount = 0;
      let linkCount = 0;

      if (coreTablesReady) {
        addLog('检查数据库分类和链接数据量');
        const [categoryCountResult, linkCountResult] = await Promise.all([
          supabase.from('categories').select('id', { count: 'exact', head: true }),
          supabase.from('links').select('id', { count: 'exact', head: true }),
        ]);

        if (categoryCountResult.error) throw categoryCountResult.error;
        if (linkCountResult.error) throw linkCountResult.error;

        categoryCount = categoryCountResult.count || 0;
        linkCount = linkCountResult.count || 0;
        addLog(`数据库当前有 ${categoryCount} 个分类、${linkCount} 个链接`);
      }

      const needsDataSync = !needsSchemaSync && (categoryCount === 0 || linkCount === 0);

      setSyncStatus({
        categoryCount,
        linkCount,
        fallbackCategoryCount,
        fallbackLinkCount,
        needsDataSync,
        needsSchemaSync,
      });

      if (needsSchemaSync) {
        setStatus('error');
        setMessage('数据库结构或 RPC 不完整，需要去 Supabase SQL Editor 同步 SQL。');
        addLog('请复制下方 SQL 到 Supabase SQL Editor 执行。');
        return;
      }

      if (needsDataSync) {
        setStatus('warning');
        setMessage('数据库结构正常，但分类或链接数据为空，需要去数据库同步/导入数据。');
        addLog(`本地备用数据有 ${fallbackCategoryCount} 个分类、${fallbackLinkCount} 个链接，可作为同步参考。`);
        return;
      }

      setStatus('success');
      setMessage('数据库结构、RPC 和基础数据均已正常配置。');
      addLog('检查完成，一切正常。');
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

  const statusColor = status === 'success' ? 'green' : status === 'warning' ? 'orange' : status === 'error' ? 'red' : 'blue';
  const statusText =
    status === 'idle'
      ? '等待检查'
      : status === 'checking'
        ? '检查中'
        : status === 'success'
          ? '已就绪'
          : status === 'warning'
            ? '需要同步数据'
            : '需要处理';

  return (
    <div className="admin-utility-page">
      <div className="admin-content">
        <Space vertical spacing={24} style={{ width: '100%' }}>
          <Space align="start" style={{ width: '100%', justifyContent: 'space-between' }} wrap>
            <div>
              <h1 className="admin-page-title">数据库检查</h1>
              <p className="admin-page-subtitle">检查 Supabase 表结构、RPC 和基础数据，判断是否需要去数据库同步。</p>
            </div>
            <Space wrap>
              <Button icon={<IconRefresh aria-hidden="true" />} loading={status === 'checking'} onClick={() => void checkAndInitDatabase()}>
                检查数据库
              </Button>
              <Button onClick={() => router.push('/admin/test')}>连接测试</Button>
            </Space>
          </Space>

          <Card bordered={false} shadows="hover">
            <Space vertical spacing="medium" align="start" style={{ width: '100%' }}>
              <Tag
                color={statusColor}
                prefixIcon={
                  status === 'success' ? (
                    <IconTickCircle aria-hidden="true" />
                  ) : status === 'error' || status === 'warning' ? (
                    <IconAlertTriangle aria-hidden="true" />
                  ) : (
                    <IconServer aria-hidden="true" />
                  )
                }
              >
                {statusText}
              </Tag>
              {message && <Paragraph style={{ margin: 0 }}>{message}</Paragraph>}
            </Space>
          </Card>

          {syncStatus && (
            <Card title="数据库同步检查" bordered={false} shadows="hover">
              <Space vertical align="start" spacing="medium" style={{ width: '100%' }}>
                <Space wrap>
                  <Tag color={syncStatus.needsSchemaSync ? 'red' : 'green'}>
                    结构/RPC：{syncStatus.needsSchemaSync ? '需要同步 SQL' : '正常'}
                  </Tag>
                  <Tag color={syncStatus.needsDataSync ? 'orange' : 'green'}>
                    数据：{syncStatus.needsDataSync ? '需要同步数据' : '正常'}
                  </Tag>
                </Space>
                <Text>
                  数据库当前：{syncStatus.categoryCount} 个分类、{syncStatus.linkCount} 个链接。
                </Text>
                <Text type="tertiary">
                  本地备用数据：{syncStatus.fallbackCategoryCount} 个分类、{syncStatus.fallbackLinkCount} 个链接。
                </Text>
                {syncStatus.needsDataSync && (
                  <Text type="warning">
                    建议去 Supabase 表编辑器或 SQL Editor 导入分类和链接数据，导入后回到本页重新检查。
                  </Text>
                )}
              </Space>
            </Card>
          )}

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
              title="同步 SQL"
              bordered={false}
              shadows="hover"
              headerExtraContent={
                <Button icon={<IconCopy aria-hidden="true" />} onClick={() => void copySql()}>
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
                      icon={<IconExternalOpen aria-hidden="true" />}
                      onClick={() => window.open('https://supabase.com', '_blank', 'noopener,noreferrer')}
                    >
                      打开 Supabase
                    </Button>
                  </Space>
                </Card>
              </Space>
            </Card>
          )}

          {(status === 'success' || status === 'warning') && (
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
    </div>
  );
}
