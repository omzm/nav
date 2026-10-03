'use server';

import { cookies } from 'next/headers';
import { createServerSupabaseClient } from '../lib/supabase-server';
import {
  ADMIN_COOKIE_NAME,
  ADMIN_SESSION_TTL_SECONDS,
  getRequiredAdminEmail,
  signAdminToken,
  verifyAdminToken,
} from '../lib/admin-auth';

export interface AdminSessionResult {
  ok: boolean;
  error?: string;
}

function cookieOptions() {
  return {
    httpOnly: true,
    path: '/',
    sameSite: 'lax' as const,
    // 本地开发为 http，生产必须 secure
    secure: process.env.NODE_ENV === 'production',
    maxAge: ADMIN_SESSION_TTL_SECONDS,
  };
}

/**
 * 用 Supabase access token 建立管理员会话。
 * 服务端校验：token 有效 + 邮箱等于管理员邮箱（fail closed）。
 * 成功后写入 HttpOnly Cookie，供 middleware 校验。
 */
export async function establishAdminSession(accessToken: string): Promise<AdminSessionResult> {
  try {
    const adminEmail = getRequiredAdminEmail();

    if (!accessToken) {
      return { ok: false, error: '缺少登录凭证' };
    }

    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase.auth.getUser(accessToken);

    if (error || !data.user) {
      return { ok: false, error: '登录会话无效，请重新登录' };
    }

    const email = (data.user.email || '').toLowerCase();

    if (email !== adminEmail.toLowerCase()) {
      return { ok: false, error: '该账号不是管理员' };
    }

    const token = await signAdminToken(email);
    const store = await cookies();
    store.set(ADMIN_COOKIE_NAME, token, cookieOptions());

    return { ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : '建立管理会话失败';
    console.error('establishAdminSession failed:', message);
    return { ok: false, error: message };
  }
}

/**
 * 本地测试账号的管理员会话（仅开发环境可用）。
 * 生产环境调用直接抛错，不存在绕过可能。
 */
export async function establishLocalAdminSession(): Promise<AdminSessionResult> {
  if (process.env.NODE_ENV !== 'development') {
    throw new Error('本地测试登录仅在开发环境可用');
  }

  try {
    const token = await signAdminToken('local-admin@development');
    const store = await cookies();
    store.set(ADMIN_COOKIE_NAME, token, cookieOptions());

    return { ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : '建立本地管理会话失败';
    console.error('establishLocalAdminSession failed:', message);
    return { ok: false, error: message };
  }
}

/** 当前请求是否持有有效的管理员会话 */
export async function hasAdminSession(): Promise<boolean> {
  try {
    const store = await cookies();
    const email = await verifyAdminToken(store.get(ADMIN_COOKIE_NAME)?.value);

    return email !== null;
  } catch {
    return false;
  }
}

/** 供 server action 使用的断言：无有效会话时抛错 */
export async function assertAdmin(): Promise<void> {
  const ok = await hasAdminSession();

  if (!ok) {
    throw new Error('未授权：需要管理员登录');
  }
}

/** 清除管理员会话（退出登录时调用） */
export async function clearAdminSession(): Promise<void> {
  const store = await cookies();
  store.delete(ADMIN_COOKIE_NAME);
}
