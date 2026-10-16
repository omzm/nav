import 'server-only';

import { createServiceSupabaseClient } from './supabase-service';

export const ADMIN_EMAIL_KEY = 'admin_email';

/**
 * 管理员邮箱：app_config 是唯一真相来源。
 *
 * RLS 策略与排序 RPC 都从 app_config.admin_email 动态读取（经 is_admin()），
 * 服务端只认数据库里的值。老环境变量 NEXT_PUBLIC_ADMIN_EMAIL 已彻底移除
 * （Vercel 侧已删除，migrate 里的兼容迁移逻辑也已删除）。
 */

/**
 * 管理员配置状态三态：
 * - configured：数据库里有管理员邮箱
 * - not-configured：数据库正常，但确实没配（全新安装）
 * - db-error：数据库读取失败（此时不能当成"未配置"，否则会把用户误导进初始化向导）
 */
export type AdminConfigStatus = 'configured' | 'not-configured' | 'db-error';

export async function getAdminConfigStatus(): Promise<AdminConfigStatus> {
  try {
    const { data, error } = await createServiceSupabaseClient()
      .from('app_config')
      .select('value')
      .eq('key', ADMIN_EMAIL_KEY)
      .maybeSingle();

    if (error) return 'db-error';

    return (data?.value || '').trim() ? 'configured' : 'not-configured';
  } catch {
    return 'db-error';
  }
}

/** 从数据库读管理员邮箱；未配置或读不到时返回空字符串。
 * app_config 不对 anon/authenticated 开放读，这里走 service_role（服务端专用）。
 * 注意：空字符串可能是"未配置"也可能是"读取失败"，需要区分时用 getAdminConfigStatus()。
 * 登录校验路径沿用空字符串（fail-closed：读不到就拒绝登录）。
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
  return (await getAdminConfigStatus()) === 'configured';
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

export const ADMIN_USERNAME_KEY = 'admin_username';

/**
 * 管理员登录用户名（可空）：设置后可用"用户名或邮箱"登录。
 * 只是登录别名，Supabase Auth 侧仍用邮箱；登录时服务端把用户名映射回邮箱。
 */
export async function getDbAdminUsername(): Promise<string> {
  try {
    const { data, error } = await createServiceSupabaseClient()
      .from('app_config')
      .select('value')
      .eq('key', ADMIN_USERNAME_KEY)
      .maybeSingle();

    if (error) return '';

    return (data?.value || '').trim();
  } catch {
    return '';
  }
}

/** 写管理员登录用户名；传空字符串表示清除（只用邮箱登录） */
export async function setDbAdminUsername(username: string): Promise<void> {
  const { error } = await createServiceSupabaseClient()
    .from('app_config')
    .upsert({ key: ADMIN_USERNAME_KEY, value: username.trim() }, { onConflict: 'key' });

  if (error) throw new Error('保存用户名失败：' + error.message);
}
