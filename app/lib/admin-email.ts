import 'server-only';

import { createServiceSupabaseClient } from './supabase-service';

export const ADMIN_EMAIL_KEY = 'admin_email';

/**
 * 管理员邮箱：数据库优先（app_config 表），环境变量兜底。
 *
 * 数据库是唯一真相来源——RLS 策略与排序 RPC 都从 app_config.admin_email
 * 动态读取；环境变量 NEXT_PUBLIC_ADMIN_EMAIL 仅为老部署兼容保留，
 * 其值会在构建时由 scripts/migrate.mjs 自动迁入数据库。
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

/**
 * Auth 中是否已有用户（server-only，供 setup 页判断；不在 'use server' 文件里导出，
 * 避免成为公开可调用的接口）。
 */
export async function hasAnyAuthUser(): Promise<boolean> {
  try {
    const svc = createServiceSupabaseClient();
    const { data, error } = await svc.auth.admin.listUsers({ perPage: 1 });

    if (error) return false;

    return (data?.users?.length || 0) > 0;
  } catch {
    return false;
  }
}
