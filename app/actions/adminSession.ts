'use server';

import { cookies } from 'next/headers';
import { createServerSupabaseClient } from '../lib/supabase-server';
import { getAdminEmail as getDbAdminEmail, getDbAdminUsername } from '../lib/admin-email';
import {
  ADMIN_COOKIE_NAME,
  ADMIN_SESSION_TTL_SECONDS,
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
 * 供后台布局调用：管理员是否已配置、当前会话邮箱是什么。
 * 只返回布尔值和会话中的邮箱，不把数据库里的管理员邮箱暴露给客户端。
 */
export async function getAdminStatus(): Promise<{
  configured: boolean;
  sessionEmail: string | null;
  /** 数据库故障时为 true：此时 configured 仍为 true，避免误导用户进初始化向导 */
  dbError?: boolean;
}> {
  let dbEmail: string | null;
  try {
    dbEmail = await getDbAdminEmail();
  } catch (error) {
    // 数据库故障 ≠ 未初始化：configured 保持 true，由调用方提示服务异常
    console.error('getAdminStatus: 读取管理员邮箱失败:', error);
    return { configured: true, sessionEmail: null, dbError: true };
  }

  if (!dbEmail) {
    return { configured: false, sessionEmail: null };
  }

  let sessionEmail: string | null = null;
  try {
    const store = await cookies();
    sessionEmail = await verifyAdminToken(store.get(ADMIN_COOKIE_NAME)?.value);
  } catch (error) {
    console.error('getAdminStatus: 校验会话失败:', error);
  }

  return { configured: true, sessionEmail };
}

/**
 * 用 Supabase access token 建立管理员会话。
 * 服务端校验：token 有效 + 邮箱等于管理员邮箱（fail closed）。
 * 成功后写入 HttpOnly Cookie，供 middleware 校验。
 */
export async function establishAdminSession(accessToken: string): Promise<AdminSessionResult> {
  try {
    const adminEmail = await getDbAdminEmail();

    if (!adminEmail) {
      return { ok: false, error: '管理员未初始化，请先访问 /admin/setup 完成设置' };
    }

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
    // 异常原文只记服务端日志，不返回客户端
    console.error('establishAdminSession failed:', error);
    return { ok: false, error: '建立管理会话失败，请稍后重试' };
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
    console.error('establishLocalAdminSession failed:', error);
    return { ok: false, error: '建立管理会话失败，请稍后重试' };
  }
}

/** 当前请求是否持有有效的管理员会话 */
export async function hasAdminSession(): Promise<boolean> {
  try {
    const store = await cookies();
    const email = await verifyAdminToken(store.get(ADMIN_COOKIE_NAME)?.value);

    if (email === null) {
      return false;
    }

    // 会话邮箱必须等于当前数据库管理员邮箱：更换管理员后旧 Cookie 即失效
    const adminEmail = await getDbAdminEmail();
    return !!adminEmail && email.toLowerCase() === adminEmail.toLowerCase();
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

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface AdminSignInResult {
  ok: boolean;
  error?: string;
  accessToken?: string;
  refreshToken?: string;
}

/**
 * 管理员登录（支持"邮箱或用户名"）。
 *
 * 流程：标识符 → 解析为邮箱（邮箱格式直接用；否则匹配 app_config.admin_username
 * 映射回管理员邮箱）→ 服务端 signInWithPassword → 校验邮箱等于数据库管理员邮箱
 * （fail closed）→ 签发 HttpOnly Cookie。
 * 成功时把 Supabase 会话 token 交给客户端，由客户端 setSession 建立会话
 * （后台 RLS 依赖客户端 Supabase 会话）。
 * 失败一律返回"账号或密码不正确"，不透露是账号错还是密码错。
 */
export async function adminSignIn(identifier: string, password: string): Promise<AdminSignInResult> {
  try {
    const id = (identifier || '').trim();
    if (!id || !password) {
      return { ok: false, error: '请输入账号和密码' };
    }

    let email: string | null = null;
    if (EMAIL_RE.test(id)) {
      email = id.toLowerCase();
    } else {
      const username = await getDbAdminUsername();
      if (username && id.toLowerCase() === username.toLowerCase()) {
        email = (await getDbAdminEmail()).toLowerCase();
      }
    }

    const dbEmail = (await getDbAdminEmail()).toLowerCase();
    if (!email || !dbEmail || email !== dbEmail) {
      return { ok: false, error: '账号或密码不正确' };
    }

    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !data.user || !data.session) {
      return { ok: false, error: '账号或密码不正确' };
    }

    const token = await signAdminToken(email);
    const store = await cookies();
    store.set(ADMIN_COOKIE_NAME, token, cookieOptions());

    return {
      ok: true,
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
    };
  } catch (error) {
    console.error('adminSignIn failed:', error);
    return { ok: false, error: '登录失败，请稍后重试' };
  }
}
