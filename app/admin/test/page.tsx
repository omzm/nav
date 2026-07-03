'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { User } from '@supabase/supabase-js';
import { Button, Card, Space, Spin, Tag, Toast, Typography } from '@douyinfe/semi-ui';
import { IconAlertTriangle, IconArrowLeft, IconRefresh, IconTickCircle } from '@douyinfe/semi-icons';
import { supabase } from '@/app/lib/supabase';
import { getLocalAdminUser } from '@/app/lib/local-admin';

const { Paragraph, Text } = Typography;

type TestStatus = 'checking' | 'success' | 'error';

export default function TestConnection() {
  const [status, setStatus] = useState<TestStatus>('checking');
  const [message, setMessage] = useState('');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const router = useRouter();

  const testConnection = useCallback(async () => {
    setStatus('checking');
    setMessage('');

    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      if (!supabaseUrl || !supabaseKey) {
        setStatus('error');
        setMessage('环境变量未配置，请检查 .env.local 中的 NEXT_PUBLIC_SUPABASE_URL 和 NEXT_PUBLIC_SUPABASE_ANON_KEY。');
        return;
      }

      const localUser = getLocalAdminUser();
      if (localUser) {
        setCurrentUser(localUser);
      }

      const {
        data: { user },
        error: userError,
      } = localUser
        ? { data: { user: localUser }, error: null }
        : await supabase.auth.getUser();

      if (userError) {
        setStatus('error');
        setMessage(`获取用户信息失败：${userError.message}`);
        return;
      }

      setCurrentUser(user);

      if (!user) {
        setStatus('error');
        setMessage('当前未登录，请先访问 /admin 登录。');
        return;
      }

      const { error: queryError } = await supabase.from('categories').select('id').limit(1);

      if (queryError) {
        setStatus('error');
        setMessage(`数据库连接失败：${queryError.message}`);
        return;
      }

      const testData = {
        name: '__connection_test__',
        icon: 'icon-tool',
        order: 999,
        is_private: true,
      };

      const { data: insertData, error: insertError } = await supabase
        .from('categories')
        .insert([testData])
        .select();

      if (insertError) {
        setStatus('error');
        setMessage(`写入测试失败：${insertError.message}`);
        return;
      }

      if (insertData?.[0]?.id) {
        await supabase.from('categories').delete().eq('id', insertData[0].id);
      }

      setStatus('success');
      setMessage('所有测试通过：环境变量、登录状态、数据库连接和写入权限均正常。');
      Toast.success('连接测试通过');
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : '未知错误';
      setStatus('error');
      setMessage(`测试失败：${msg}`);
    }
  }, []);

  const checkAuth = useCallback(async () => {
    const localUser = getLocalAdminUser();
    if (localUser) {
      await testConnection();
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push('/admin');
      return;
    }

    await testConnection();
  }, [router, testConnection]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void checkAuth();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [checkAuth]);

  return (
    <main className="admin-shell">
      <div className="admin-form-page">
        <Space vertical spacing={24} style={{ width: '100%' }}>
          <Space align="start" style={{ width: '100%', justifyContent: 'space-between' }} wrap>
            <div>
              <h1 className="admin-page-title">Supabase 连接测试</h1>
              <p className="admin-page-subtitle">验证登录、读写权限和数据库连通性。</p>
            </div>
            <Space wrap>
              <Button icon={<IconArrowLeft />} onClick={() => router.push('/admin/dashboard')}>
                返回后台
              </Button>
              <Button icon={<IconRefresh />} loading={status === 'checking'} onClick={() => void testConnection()}>
                重新测试
              </Button>
            </Space>
          </Space>

          <Card bordered={false} shadows="hover">
            {status === 'checking' ? (
              <Spin size="large" tip="正在测试连接..." style={{ width: '100%', padding: '56px 0' }} />
            ) : (
              <Space vertical spacing="medium" align="start" style={{ width: '100%' }}>
                <Tag
                  color={status === 'success' ? 'green' : 'red'}
                  prefixIcon={status === 'success' ? <IconTickCircle /> : <IconAlertTriangle />}
                >
                  {status === 'success' ? '测试通过' : '测试失败'}
                </Tag>
                <Paragraph style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{message}</Paragraph>
              </Space>
            )}
          </Card>

          {currentUser && (
            <Card title="当前用户" bordered={false} shadows="hover">
              <Space vertical align="start">
                <Text>邮箱：{currentUser.email}</Text>
                <Text type="tertiary">ID：{currentUser.id}</Text>
              </Space>
            </Card>
          )}

          <Card title="下一步" bordered={false} shadows="hover">
            <Space wrap>
              <Button theme="solid" type="primary" onClick={() => router.push('/admin/dashboard')}>
                进入后台
              </Button>
              <Button onClick={() => router.push('/admin/env-check')}>环境检查</Button>
              <Button onClick={() => router.push('/admin/init')}>数据库初始化</Button>
            </Space>
          </Card>
        </Space>
      </div>
    </main>
  );
}
