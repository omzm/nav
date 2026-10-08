import { redirect } from 'next/navigation';
import { getDbAdminEmail, hasAnyAuthUser } from '@/app/lib/admin-email';
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

  // 是否要求初始化口令：配了 SETUP_TOKEN 就要；生产环境强制要求（没配会直接报错提示去配）
  const requireToken =
    Boolean((process.env.SETUP_TOKEN || '').trim()) || process.env.NODE_ENV === 'production';

  // 全新初始化，或补建 Auth 用户（dbEmail 预填邮箱）
  return <SetupForm suggestedEmail={dbEmail} requireToken={requireToken} />;
}
