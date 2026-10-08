import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { isAdminConfigured } from '@/app/lib/admin-email';
import LoginForm from './LoginForm';

/**
 * 管理员登录页（服务端）。
 * 尚未初始化管理员时直接跳转 setup 向导。
 */
export default async function AdminLoginPage() {
  if (!(await isAdminConfigured())) {
    redirect('/admin/setup');
  }

  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
