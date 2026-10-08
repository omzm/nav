'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button, Input, Toast } from '@douyinfe/semi-ui';
import { IconArrowRight, IconExternalOpen, IconLock, IconMail } from '@douyinfe/semi-icons';
import { setupAdminAccount } from '@/app/actions/setupAdmin';
import AdminBrand from '../_components/AdminBrand';

export default function SetupForm({ suggestedEmail }: { suggestedEmail: string }) {
  const [email, setEmail] = useState(suggestedEmail);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (password !== confirmPassword) {
      Toast.error('两次输入的密码不一致');
      return;
    }

    setLoading(true);

    try {
      const result = await setupAdminAccount(email, password);

      if (!result.ok) {
        throw new Error(result.error || '初始化失败');
      }

      Toast.success('初始化完成，欢迎使用');
      router.push('/admin/dashboard');
    } catch (error) {
      Toast.error(error instanceof Error ? error.message : '初始化失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="admin-login-shell">
      <header className="admin-login-topbar">
        <AdminBrand compact />
        <Link href="/" className="admin-inline-link"><span>返回首页</span><IconExternalOpen aria-hidden="true" /></Link>
      </header>
      <div className="admin-login-main">
        <section className="admin-login-card">
          <div className="admin-login-heading">
            <h1>初始化管理员</h1>
            <p>第一次部署？设置你的管理员邮箱和密码，只需一次。</p>
          </div>
          <form className="admin-login-form" onSubmit={handleSubmit}>
            <label className="admin-login-form-field">
              <span>管理员邮箱</span>
              <Input value={email} onChange={setEmail} prefix={<IconMail aria-hidden="true" />} placeholder="you@example.com" type="email" autoComplete="username" showClear required />
            </label>
            <label className="admin-login-form-field">
              <span>设置密码</span>
              <Input value={password} onChange={setPassword} prefix={<IconLock aria-hidden="true" />} placeholder="至少 8 位" mode="password" autoComplete="new-password" required />
            </label>
            <label className="admin-login-form-field">
              <span>确认密码</span>
              <Input value={confirmPassword} onChange={setConfirmPassword} prefix={<IconLock aria-hidden="true" />} placeholder="再输入一次" mode="password" autoComplete="new-password" required />
            </label>
            <Button block htmlType="submit" loading={loading} theme="solid" type="primary" icon={<IconArrowRight aria-hidden="true" />} iconPosition="right">
              完成初始化，进入工作台
            </Button>
            <p className="admin-login-auth-hint">初始化后，此页面将自动失效，只能通过登录页进入后台。</p>
          </form>
        </section>
      </div>
      <footer className="admin-login-footer">收藏夹 · 内容管理工作台</footer>
    </main>
  );
}
