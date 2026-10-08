import { redirect } from 'next/navigation';
import { getDbAdminEmail } from '@/app/lib/admin-email';
import { hasAnyAuthUser } from '@/app/actions/setupAdmin';
import SetupForm from './SetupForm';

/**
 * 首次部署的管理员初始化向导。
 * 已完整初始化（数据库有邮箱且 Auth 有用户）则去登录页。
 */
export default async function AdminSetupPage() {
  const [dbEmail, hasUser] = await Promise.all([getDbAdminEmail(), hasAnyAuthUser()]);

  if (dbEmail && hasUser) {
    redirect('/admin');
  }

  // 全新初始化，或补建 Auth 用户（dbEmail 预填邮箱）
  return <SetupForm suggestedEmail={dbEmail} />;
}
