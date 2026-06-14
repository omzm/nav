'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Card, Input, Space, Toast, Typography } from '@douyinfe/semi-ui';
import { IconArrowLeft, IconLock, IconMail, IconUserSetting } from '@douyinfe/semi-icons';
import { supabase, isSupabaseConfigured } from '@/app/lib/supabase';
import {
  LOCAL_ADMIN_EMAIL,
  LOCAL_ADMIN_PASSWORD,
  isLocalAdminCredentials,
  signInLocalAdmin,
} from '@/app/lib/local-admin';

const { Text, Title } = Typography;

export default function AdminLogin() {
  const [email, setEmail] = useState(process.env.NODE_ENV === 'development' ? LOCAL_ADMIN_EMAIL : '');
  const [password, setPassword] = useState(process.env.NODE_ENV === 'development' ? LOCAL_ADMIN_PASSWORD : '');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);

    try {
      const isLocalCredentials = isLocalAdminCredentials(email, password);

      if (!isLocalCredentials || isSupabaseConfigured) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (!isLocalCredentials && error) throw error;

        if (data.user) {
          Toast.success('登录成功');
          router.push('/admin/dashboard');
          return;
        }
      }

      if (isLocalCredentials) {
        signInLocalAdmin();
        Toast.success('本地测试登录成功');
        router.push('/admin/dashboard');
        return;
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '登录失败，请检查账号和密码';
      Toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="admin-login-shell">
      <Card className="admin-login-card" bordered={false} shadows="always">
        <Space vertical align="center" spacing={10} style={{ width: '100%', marginBottom: 28 }}>
          <div className="admin-icon-preview admin-login-logo">
            <IconUserSetting size="extra-large" />
          </div>
          <Title heading={3} style={{ margin: 0 }}>
            后台管理
          </Title>
          <Text type="tertiary">登录后维护首页分类、链接和展示数据</Text>
        </Space>

        <form className="admin-login-form" onSubmit={handleLogin}>
          <label className="admin-login-form-field">
            <Text strong>邮箱地址</Text>
            <Input
              value={email}
              onChange={setEmail}
              prefix={<IconMail />}
              placeholder="admin@example.com"
              type="email"
              size="large"
              showClear
              required
            />
          </label>

          <label className="admin-login-form-field">
            <Text strong>登录密码</Text>
            <Input
              value={password}
              onChange={setPassword}
              prefix={<IconLock />}
              placeholder="请输入密码"
              mode="password"
              size="large"
              required
            />
          </label>

          <Button block htmlType="submit" loading={loading} theme="solid" type="primary" size="large">
            登录
          </Button>

          <Button block icon={<IconArrowLeft />} theme="borderless" onClick={() => router.push('/')}>
            返回首页
          </Button>

          {process.env.NODE_ENV === 'development' && (
            <Text type="tertiary" size="small" style={{ textAlign: 'center' }}>
              本地测试账号：{LOCAL_ADMIN_EMAIL} / {LOCAL_ADMIN_PASSWORD}
            </Text>
          )}
        </form>
      </Card>
    </main>
  );
}
