import 'server-only';

import { createServerSupabaseClient } from './supabase-server';

export const ADMIN_EMAIL_KEY = 'admin_email';

/**
 * 管理员邮箱：数据库优先（app_config 表），环境变量兜底。
 *
 * 数据库是唯一真相来源——RLS 策略与排序 RPC 都从 app_config.admin_email
 * 动态读取；环境变量 NEXT_PUBLIC_ADMIN_EMAIL 仅为老部署兼容保留，
 * 其值会在构建时由 scripts/migrate.mjs 自动迁入数据库。
 */

/** 从数据库读管理员邮箱；未配置或表不存在时返回空字符串 */
export async function getDbAdminEmail(): Promise<string> {
  try {
    // 复用 supabase-server 的 anon 客户端（无会话持久化）；app_config 对所有人开放读
    const { data, error } = await createServerSupabaseClient()
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

/** 管理员邮箱（数据库优先，环境变量兜底），未配置返回空字符串 */
export async function getAdminEmail(): Promise<string> {
  const dbEmail = await getDbAdminEmail();

  if (dbEmail) return dbEmail;

  return (process.env.NEXT_PUBLIC_ADMIN_EMAIL || '').trim();
}

/** 管理员是否已配置（数据库或环境变量任一有值） */
export async function isAdminConfigured(): Promise<boolean> {
  return (await getAdminEmail()) !== '';
}
