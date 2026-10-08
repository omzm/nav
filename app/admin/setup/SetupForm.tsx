'use client';

import { ReactNode, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button, Input, PasswordInput, InputProps } from '@/app/admin/_components/ui';
import { toast } from '@/app/admin/_components/ui/toast';
import {
  IconArrowRight,
  IconExternalOpen,
  IconKey,
  IconLock,
  IconMail,
} from '@/app/admin/_components/ui/icons';
import { supabase } from '@/app/lib/supabase';
import { setupAdminAccount } from '@/app/actions/setupAdmin';
import AdminBrand from '../_components/AdminBrand';

/** 带左侧图标的输入框（替代 Semi Input 的 prefix） */
function IconField({
  icon,
  password = false,
  className = '',
  ...rest
}: { icon: ReactNode; password?: boolean } & InputProps) {
  const Cmp = password ? PasswordInput : Input;
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#94a3b8]">
        {icon}
      </span>
      <Cmp {...rest} className={`h-10 pl-10 ${className}`} />
    </div>
  );
}

export default function SetupForm({
  suggestedEmail,
  requireToken,
}: {
  suggestedEmail: string;
  requireToken: boolean;
}) {
  const [email, setEmail] = useState(suggestedEmail);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (password !== confirmPassword) {
      toast.error('两次输入的密码不一致');
      return;
    }

    setLoading(true);

    try {
      const result = await setupAdminAccount(email, password, token);

      if (!result.ok) {
        throw new Error(result.error || '初始化失败');
      }

      // 建立浏览器端的 Supabase 会话：后台的数据读写走客户端 supabase，
      // 没有 JWT 会被 RLS 拒绝（只靠服务端 cookie 不够）
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (signInError) {
        throw new Error('初始化成功，但自动登录失败，请前往登录页手动登录');
      }

      toast.success('初始化完成，欢迎使用');
      router.push('/admin/dashboard');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '初始化失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-[100dvh] flex flex-col items-center bg-[#f8fafc] px-6">
      <header className="w-full max-w-[1280px] flex items-center justify-between gap-5 px-2 py-[30px] max-sm:py-6">
        <AdminBrand compact />
        <Link
          href="/"
          className="inline-flex items-center gap-1 py-0.5 text-xs text-[#2563eb] hover:text-[#1d4ed8] transition-colors"
        >
          <span>返回首页</span>
          <IconExternalOpen size={14} aria-hidden="true" />
        </Link>
      </header>
      <div className="flex items-center justify-center flex-1 w-full py-12 pb-20 max-sm:py-8 max-sm:pb-16">
        <section className="w-full max-w-[420px] bg-white border border-[#e8edf3] rounded-[14px] p-9 max-sm:p-7 max-sm:px-6 shadow-[0_8px_32px_rgba(34,51,75,0.04)]">
          <div className="mb-7">
            <h1 className="m-0 text-2xl font-semibold tracking-[-0.5px] text-[#1e293b]">
              初始化管理员
            </h1>
            <p className="mt-[9px] text-xs text-[#94a3b8]">
              第一次部署？设置你的管理员邮箱和密码，只需一次。
            </p>
          </div>
          <form className="grid gap-5" onSubmit={handleSubmit}>
            <label className="grid gap-2 text-xs">
              <span className="text-[#526078] font-medium">管理员邮箱</span>
              <IconField
                icon={<IconMail size={16} aria-hidden="true" />}
                value={email}
                onChange={setEmail}
                placeholder="you@example.com"
                type="email"
                autoComplete="username"
                required
              />
            </label>
            <label className="grid gap-2 text-xs">
              <span className="text-[#526078] font-medium">设置密码</span>
              <IconField
                icon={<IconLock size={16} aria-hidden="true" />}
                password
                value={password}
                onChange={setPassword}
                placeholder="至少 8 位"
                autoComplete="new-password"
                required
              />
            </label>
            <label className="grid gap-2 text-xs">
              <span className="text-[#526078] font-medium">确认密码</span>
              <IconField
                icon={<IconLock size={16} aria-hidden="true" />}
                password
                value={confirmPassword}
                onChange={setConfirmPassword}
                placeholder="再输入一次"
                autoComplete="new-password"
                required
              />
            </label>
            {requireToken && (
              <label className="grid gap-2 text-xs">
                <span className="text-[#526078] font-medium">初始化口令</span>
                <IconField
                  icon={<IconKey size={16} aria-hidden="true" />}
                  password
                  value={token}
                  onChange={setToken}
                  placeholder="环境变量 SETUP_TOKEN 的值"
                  autoComplete="off"
                  required
                />
              </label>
            )}
            <Button
              variant="primary"
              type="submit"
              loading={loading}
              className="w-full h-10 mt-1 text-[13px]"
            >
              完成初始化，进入工作台
              {!loading && <IconArrowRight size={16} aria-hidden="true" />}
            </Button>
            <p className="m-0 mb-1 px-3 py-2.5 rounded-lg bg-[#fef3f2] border border-[#fecdca] text-[#b42318] text-xs leading-[18px]">
              初始化后，此页面将自动失效，只能通过登录页进入后台。
            </p>
          </form>
        </section>
      </div>
      <footer className="text-[#94a3b8] text-[10px] py-5 pb-7 tracking-[0.5px]">
        收藏夹 · 内容管理工作台
      </footer>
    </main>
  );
}
