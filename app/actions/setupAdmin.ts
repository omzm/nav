'use server';

import { cookies } from 'next/headers';
import { createServiceSupabaseClient } from '../lib/supabase-service';
import { ADMIN_EMAIL_KEY } from '../lib/admin-email';
import {
  ADMIN_COOKIE_NAME,
  ADMIN_SESSION_TTL_SECONDS,
  signAdminToken,
  timingSafeEqual,
} from '../lib/admin-auth';

export interface SetupResult {
  ok: boolean;
  error?: string;
}

function isValidEmail(email: string): boolean {
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email);
}

/**
 * 首次部署的管理员初始化（一次性）。
 *
 * 原子占位：app_config.key 是主键，insert 只有一个请求能成功（23505 = 已初始化），
 * 不存在 check-then-act 竞态。没有"收养"分支——用已存在邮箱直接改密码等于账号接管，
 * 故意不支持；migrate 已把老部署的邮箱自动迁入库，收养没有必要。
 *
 * @param token 初始化口令：仅当环境变量 SETUP_TOKEN 配置了才需要
 */
export async function setupAdminAccount(
  email: string,
  password: string,
  token?: string
): Promise<SetupResult> {
  try {
    email = (email || '').trim().toLowerCase();

    if (!isValidEmail(email)) {
      return { ok: false, error: '邮箱格式不正确' };
    }

    if (!password || password.length < 8) {
      return { ok: false, error: '密码至少 8 位' };
    }

    // SETUP_TOKEN 门（可选）：配置了则必须提供正确的口令，防止部署后、
    // 首次打开 /admin 之前的时间窗口里被他人抢先初始化
    const setupToken = (process.env.SETUP_TOKEN || '').trim();
    if (setupToken && (!token || !timingSafeEqual(token.trim(), setupToken))) {
      return { ok: false, error: '初始化口令不正确' };
    }

    const svc = createServiceSupabaseClient();

    // 先占位：只有第一个请求能写入，其余拿到 23505
    const { error: claimError } = await svc
      .from('app_config')
      .insert({ key: ADMIN_EMAIL_KEY, value: email });

    if (claimError) {
      return {
        ok: false,
        error:
          claimError.code === '23505'
            ? '管理员已配置，无需重复初始化'
            : '初始化失败：' + claimError.message,
      };
    }

    // 建 Auth 用户（自动确认邮箱）
    const { data: created, error: createError } = await svc.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (createError || !created.user) {
      // 释放占位，允许重试
      await svc.from('app_config').delete().eq('key', ADMIN_EMAIL_KEY);
      const msg = createError?.message || '创建管理员账号失败';

      if (/already exists|already registered/i.test(msg)) {
        return { ok: false, error: '该邮箱已在认证系统中存在，请先在 Supabase 控制台删除该用户后重试' };
      }

      return { ok: false, error: msg };
    }

    // 签发管理会话 cookie，直接进后台
    const sessionToken = await signAdminToken(email);
    const store = await cookies();
    store.set(ADMIN_COOKIE_NAME, sessionToken, {
      httpOnly: true,
      path: '/',
      sameSite: 'lax' as const,
      secure: process.env.NODE_ENV === 'production',
      maxAge: ADMIN_SESSION_TTL_SECONDS,
    });

    return { ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : '初始化失败';
    console.error('setupAdminAccount failed:', message);
    return { ok: false, error: message };
  }
}
