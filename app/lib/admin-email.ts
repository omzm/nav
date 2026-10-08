import 'server-only';

import { createServiceSupabaseClient } from './supabase-service';

export const ADMIN_EMAIL_KEY = 'admin_email';

/**
 * 管理员邮箱：app_config 是唯一真相来源。
 *
 * RLS 策略与排序 RPC 都从 app_config.admin_email 动态读取（经 is_admin()），
 * 服务端也只认数据库里的值。环境变量 NEXT_PUBLIC_ADMIN_EMAIL 不再参与运行时判断，
 * 只在构建时由 scripts/migrate.mjs 负责一次性迁入数据库（老部署兼容）。
 */

/** 从数据库读管理员邮箱；未配置或读不到时返回空字符串。
 * app_config 不对 anon/authenticated 开放读，这里走 service_role（服务端专用）。
 */
export async function getDbAdminEmail(): Promise<string> {
  try {
    const { data, error } = await createServiceSupabaseClient()
      .from('app_config')
      .select('value')
      .eq('key', ADMIN_EMAIL_KEY)
      .maybeSingle();

    if (error) return '';

    return (data?.value || '').trim();
  } catch {
    return '';
  }
}

/** 管理员邮箱（只读数据库），未配置返回空字符串 */
export async function getAdminEmail(): Promise<string> {
  return getDbAdminEmail();
}

/** 管理员是否已配置（数据库里有邮箱） */
export async function isAdminConfigured(): Promise<boolean> {
  return (await getAdminEmail()) !== '';
}

/**
 * 指定邮箱的 Auth 用户是否存在（server-only，供 setup 页判断恢复场景）。
 * 注意：查的是"该邮箱"的用户，不是"有没有用户"——管理员被删但其他用户存在时，
 * 必须能进恢复流程。用 listUsers 是 UX 判断，真正的安全门在 setupAdminAccount
 * 里（邮箱必须与已配置的一致 + SETUP_TOKEN）。
 */
export async function hasAuthUserByEmail(email: string): Promise<boolean> {
  try {
    const target = (email || '').trim().toLowerCase();
    if (!target) return false;

    const svc = createServiceSupabaseClient();
    // 单管理员站点，用户数极少，一页足以
    const { data, error } = await svc.auth.admin.listUsers({ page: 1, perPage: 100 });

    if (error || !data?.users) return false;

    return data.users.some((u) => (u.email || '').toLowerCase() === target);
  } catch {
    return false;
  }
}
