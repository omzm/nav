'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button, Field, Input, PasswordInput } from '@/app/admin/_components/ui';
import { toast } from '@/app/admin/_components/ui/toast';
import {
  IconArrowRight,
  IconExternalOpen,
  IconLock,
  IconMail,
} from '@/app/admin/_components/ui/icons';
import { supabase, isSupabaseConfigured } from '@/app/lib/supabase';
// 本地测试账号逻辑不静态导入：只在开发环境动态加载，
// 生产构建的 bundle 里不包含测试账号常量（纵深防御；服务端本就硬拒绝非开发环境）
import { establishAdminSession, establishLocalAdminSession, hasAdminSession } from '@/app/actions/adminSession';
import AdminBrand from './_components/AdminBrand';

export default function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const authError = searchParams.get('error');

  // 开发环境预填本地测试账号（动态导入，生产包无此代码）
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      import('@/app/lib/local-admin')
        .then(({ LOCAL_ADMIN_EMAIL, LOCAL_ADMIN_PASSWORD }) => {
          setEmail(LOCAL_ADMIN_EMAIL);
          setPassword(LOCAL_ADMIN_PASSWORD);
        })
        .catch(() => {});
    }
  }, []);

  // 已登录直接进工作台，不用重复登录
  useEffect(() => {
    let active = true;
    hasAdminSession()
      .then((ok) => {
        if (active && ok) router.replace('/admin/dashboard');
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [router]);

  const handleLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);

    try {
      // 本地测试账号只在开发环境判定（动态导入，生产包不含该模块）
      let isLocalCredentials = false;
      if (process.env.NODE_ENV === 'development') {
        const { isLocalAdminCredentials } = await import('@/app/lib/local-admin');
        isLocalCredentials = isLocalAdminCredentials(email, password);
      }

      if (!isLocalCredentials || isSupabaseConfigured) {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (!isLocalCredentials && error) throw error;
        if (data.user) {
          // 服务端建立管理员会话（校验邮箱 + 签发 HttpOnly Cookie），失败则拒绝进入后台
          const { data: sessionData } = await supabase.auth.getSession();
          const sessionResult = await establishAdminSession(sessionData.session?.access_token || '');

          if (!sessionResult.ok) {
            await supabase.auth.signOut();
            throw new Error(sessionResult.error || '管理员身份校验失败');
          }

          toast.success('登录成功');
          router.push('/admin/dashboard');
          return;
        }
      }

      if (isLocalCredentials) {
        // 本地测试账号同样需要服务端会话（仅开发环境可签发）：
        // 先完成服务端校验，成功后再写本地登录标记，避免失败时残留
        const localResult = await establishLocalAdminSession();

        if (!localResult.ok) {
          throw new Error(localResult.error || '本地管理会话建立失败');
        }

        const { signInLocalAdmin } = await import('@/app/lib/local-admin');
        signInLocalAdmin();
        toast.success('本地测试登录成功');
        router.push('/admin/dashboard');
      }
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : '登录失败，请检查账号和密码');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#f8fafc] flex flex-col">
      <header className="flex items-center justify-between px-5 sm:px-8 py-4">
        <AdminBrand compact />
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-xs text-[#2563eb] hover:text-[#1d4ed8] transition-colors"
        >
          <span>返回首页</span>
          <IconExternalOpen size={13} />
        </Link>
      </header>

      <div className="flex-1 flex items-center justify-center px-4 py-10">
        <section className="w-full max-w-[400px] bg-white border border-[#e8edf3] rounded-[14px] px-6 sm:px-8 py-8">
          <div className="mb-6">
            <h1 className="text-xl font-semibold text-[#1e293b]">管理员登录</h1>
            <p className="mt-1.5 text-[13px] text-[#64748b]">欢迎回来，登录后继续整理你的收藏。</p>
          </div>

          {authError === 'auth' && (
            <p className="mb-4 px-3 py-2 text-xs text-[#b45309] bg-[#fffbeb] border border-[#fde68a] rounded-lg">
              需要管理员登录后才能访问后台。
            </p>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <Field label="邮箱地址">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94a3b8] pointer-events-none">
                  <IconMail size={15} />
                </span>
                <Input
                  value={email}
                  onChange={setEmail}
                  placeholder="请输入管理员邮箱"
                  type="email"
                  autoComplete="username"
                  required
                  className="pl-9"
                />
              </div>
            </Field>

            <Field label="登录密码">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94a3b8] pointer-events-none z-10">
                  <IconLock size={15} />
                </span>
                <PasswordInput
                  value={password}
                  onChange={setPassword}
                  placeholder="请输入密码"
                  autoComplete="current-password"
                  required
                  className="pl-9"
                />
              </div>
            </Field>

            <Button variant="primary" type="submit" loading={loading} className="w-full !h-10 !text-sm">
              登录工作台
              <IconArrowRight size={15} />
            </Button>

            {process.env.NODE_ENV === 'development' && (
              <p className="text-center text-xs text-[#94a3b8]">开发环境 · 本地测试账号已预填</p>
            )}
          </form>
        </section>
      </div>

      <footer className="py-5 text-center text-xs text-[#94a3b8]">收藏夹 · 内容管理工作台</footer>
    </main>
  );
}
