import 'server-only';

import { createClient } from '@supabase/supabase-js';

export const ADMIN_EMAIL_KEY = 'admin_email';

/**
 * 管理员邮箱：数据库优先（app_config 表），环境变量兜底。
 *
 * 数据库是唯一真相来源——RLS 策略与排序 RPC 都从 app_config.admin_email
 * 动态读取；环境变量 NEXT_PUBLIC_ADMIN_EMAIL 仅为老部署兼容保留，
 * 其值会在构建时由 scripts/migrate.mjs 自动迁入数据库。
 */

/** anon 客户端读 app_config（该表对所有人开放读） */
function createAnonClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

  if (!url || !key) {
    throw new Error('Supabase 环境变量未配置');
  }

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** 从数据库读管理员邮箱；表不存在或未配置时返回空字符串 */
export async function getDbAdminEmail(): Promise<string> {
  try {
    const { data, error } = await createAnonClient()
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
