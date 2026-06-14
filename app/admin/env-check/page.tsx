'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Card, CodeHighlight, Space, Spin, Tag, Toast, Typography } from '@douyinfe/semi-ui';
import { IconAlertTriangle, IconArrowLeft, IconExternalOpen, IconRefresh, IconTickCircle } from '@douyinfe/semi-icons';
import { supabase } from '@/app/lib/supabase';
import { getLocalAdminUser } from '@/app/lib/local-admin';

const { Paragraph, Text } = Typography;

export default function EnvCheck() {
  const [authenticated, setAuthenticated] = useState(false);
  const [checking, setChecking] = useState(true);
  const router = useRouter();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const hasUrl = Boolean(supabaseUrl);
  const hasKey = Boolean(supabaseKey);

  const checkAuth = useCallback(async () => {
    const localUser = getLocalAdminUser();
    if (localUser) {
      setAuthenticated(true);
      setChecking(false);
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push('/admin');
      return;
    }

    setAuthenticated(true);
    setChecking(false);
  }, [router]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void checkAuth();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [checkAuth]);

  const copyEnvTemplate = async () => {
    await navigator.clipboard.writeText(
      'NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co\nNEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here'
    );
    Toast.success('环境变量模板已复制');
  };

  if (checking) {
    return (
      <main className="admin-login-shell">
        <Spin size="large" tip="正在验证登录状态..." />
      </main>
    );
  }

  if (!authenticated) return null;

  return (
    <main className="admin-shell">
      <div className="admin-form-page">
        <Space vertical spacing={24} style={{ width: '100%' }}>
          <Space align="start" style={{ width: '100%', justifyContent: 'space-between' }} wrap>
            <div>
              <h1 className="admin-page-title">环境变量检查</h1>
              <p className="admin-page-subtitle">确认 Supabase 客户端配置是否已在当前运行环境中生效。</p>
            </div>
            <Space wrap>
              <Button icon={<IconArrowLeft />} onClick={() => router.push('/admin/dashboard')}>
                返回后台
              </Button>
              <Button icon={<IconRefresh />} onClick={() => window.location.reload()}>
                刷新检查
              </Button>
            </Space>
          </Space>

          <Card bordered={false} shadows="hover">
            <Space vertical spacing="medium" style={{ width: '100%' }}>
              <ConfigRow label="NEXT_PUBLIC_SUPABASE_URL" configured={hasUrl} />
              <ConfigRow label="NEXT_PUBLIC_SUPABASE_ANON_KEY" configured={hasKey} />
            </Space>
          </Card>

          {!hasUrl || !hasKey ? (
            <Card
              title={
                <Space>
                  <IconAlertTriangle style={{ color: 'var(--semi-color-warning)' }} />
                  配置步骤
                </Space>
              }
              bordered={false}
              shadows="hover"
            >
              <Space vertical spacing="medium" style={{ width: '100%' }}>
                <Paragraph>
                  在项目根目录创建 <Text code>.env.local</Text>，写入下面两项，然后重启开发服务器。
                </Paragraph>
                <CodeHighlight
                  language="bash"
                  code={`NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here`}
                />
                <Button onClick={copyEnvTemplate}>复制模板</Button>
              </Space>
            </Card>
          ) : (
            <Card
              title={
                <Space>
                  <IconTickCircle style={{ color: 'var(--semi-color-success)' }} />
                  配置正常
                </Space>
              }
              bordered={false}
              shadows="hover"
            >
              <Space vertical align="start">
                <Text>环境变量已配置，可以继续测试 Supabase 连接。</Text>
                <Button theme="solid" type="primary" onClick={() => router.push('/admin/test')}>
                  前往连接测试
                </Button>
              </Space>
            </Card>
          )}

          <Card title="快捷入口" bordered={false} shadows="hover">
            <Space wrap>
              <Button onClick={() => router.push('/')}>返回首页</Button>
              <Button onClick={() => router.push('/admin')}>后台登录</Button>
              <Button icon={<IconExternalOpen />} onClick={() => window.open('https://supabase.com', '_blank', 'noopener,noreferrer')}>
                Supabase 官网
              </Button>
              <Button icon={<IconExternalOpen />} onClick={() => window.open('/SUPABASE_SETUP.md', '_blank', 'noopener,noreferrer')}>
                设置文档
              </Button>
            </Space>
          </Card>
        </Space>
      </div>
    </main>
  );
}

function ConfigRow({ label, configured }: { label: string; configured: boolean }) {
  return (
    <Space style={{ width: '100%', justifyContent: 'space-between' }} wrap>
      <Text strong>{label}</Text>
      <Tag
        color="grey"
        prefixIcon={configured ? <IconTickCircle /> : <IconAlertTriangle />}
      >
        {configured ? '已配置' : '未配置'}
      </Tag>
    </Space>
  );
}
