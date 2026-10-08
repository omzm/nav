import { redirect } from 'next/navigation';
import { getDbAdminEmail, hasAuthUserByEmail } from '@/app/lib/admin-email';
import SetupForm from './SetupForm';

/**
 * 首次部署的管理员初始化向导。
 *
 * - 数据库无邮箱 → 全新初始化
 * - 数据库有邮箱、且该邮箱的 Auth 用户存在 → 去登录页
 * - 数据库有邮箱、但该邮箱的 Auth 用户缺失 → 恢复流程（补建用户，仍需 SETUP_TOKEN）
 */
export default async function AdminSetupPage() {
  const dbEmail = await getDbAdminEmail();

  // 是否要求初始化口令：配了 SETUP_TOKEN 就要；生产环境强制要求（没配会直接报错提示去配）
  const requireToken =
    Boolean((process.env.SETUP_TOKEN || '').trim()) || process.env.NODE_ENV === 'production';

  if (!dbEmail) {
    return <SetupForm suggestedEmail="" requireToken={requireToken} />;
  }

  if (await hasAuthUserByEmail(dbEmail)) {
    redirect('/admin');
  }

  // 恢复：用已配置的邮箱补建 Auth 用户
  return <SetupForm suggestedEmail={dbEmail} requireToken={requireToken} />;
}
