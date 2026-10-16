import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { getAdminConfigStatus } from '@/app/lib/admin-email';
import LoginForm from './LoginForm';
import DbErrorNotice from './DbErrorNotice';

/**
 * 管理员登录页（服务端）。
 * 尚未初始化管理员时直接跳转 setup 向导；
 * 数据库读取失败时展示服务错误（不能当成"未配置"误导进向导）。
 */
export default async function AdminLoginPage() {
  const status = await getAdminConfigStatus();

  if (status === 'db-error') {
    return <DbErrorNotice />;
  }

  if (status === 'not-configured') {
    redirect('/admin/setup');
  }

  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
