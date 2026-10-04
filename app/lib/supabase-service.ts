import { createClient } from '@supabase/supabase-js';

/**
 * Service Role 客户端：仅服务端使用，绕过 RLS。
 * 用于首页"提交收录"等服务端已鉴权（密码校验）后的写入操作。
 * Key 只存在于服务端环境变量，绝不暴露给客户端。
 */
export function createServiceSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

  if (!url || !key) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not configured');
  }

  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
