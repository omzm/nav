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
 * 初始化前置环境校验：在任何写入之前执行。
 * 必需变量缺一不可，否则写到一半才抛错会留下半初始化状态
 * （占位行已写 / Auth 用户已建，但会话签发失败）。
 */
function checkSetupEnv(): string | null {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return '服务端数据库配置缺失，请检查环境变量后重新部署';
  }
  if (!process.env.ADMIN_SESSION_SECRET) {
    return '服务端未配置 ADMIN_SESSION_SECRET，请配置后重新部署';
  }
  return null;
}

async function issueAdminSession(email: string): Promise<void> {
  const sessionToken = await signAdminToken(email);
  const store = await cookies();
  store.set(ADMIN_COOKIE_NAME, sessionToken, {
    httpOnly: true,
    path: '/',
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    maxAge: ADMIN_SESSION_TTL_SECONDS,
  });
}

/**
 * 首次部署的管理员初始化（一次性）。
 *
 * 原子占位：app_config.key 是主键，insert 只有一个请求能成功（23505 = 已初始化），
 * 不存在 check-then-act 竞态。没有"收养"分支——用已存在邮箱直接改密码等于账号接管，
 * 故意不支持；migrate 已把老部署的邮箱自动迁入库，收养没有必要。
 *
 * 恢复场景：app_config 已有邮箱但 Auth 用户缺失（比如用户被误删）时，
 * 允许用"已配置的邮箱"补建 Auth 用户；邮箱对不上的一律拒绝。
 *
 * 生产环境强制要求 SETUP_TOKEN：部署前配好该环境变量，向导必须输入正确的口令，
 * 堵住"部署后、首次打开 /admin 之前"的时间窗口。
 */
export async function setupAdminAccount(
  email: string,
  password: string,
  token?: string
): Promise<SetupResult> {
  try {
    // 环境先行：任何写入之前先确认必需变量都在
    const envError = checkSetupEnv();
    if (envError) {
      return { ok: false, error: envError };
    }

    email = (email || '').trim().toLowerCase();

    if (!isValidEmail(email)) {
      return { ok: false, error: '邮箱格式不正确' };
    }

    if (!password || password.length < 8) {
      return { ok: false, error: '密码至少 8 位' };
    }

    // 生产环境强制 SETUP_TOKEN：没配就直接拒绝，提示配好后重新部署
    const isProd = process.env.NODE_ENV === 'production';
    const setupToken = (process.env.SETUP_TOKEN || '').trim();
    if (isProd && !setupToken) {
      return { ok: false, error: '生产环境必须先配置 SETUP_TOKEN 环境变量并重新部署，才能初始化管理员' };
    }
    if (setupToken && !timingSafeEqual((token || '').trim(), setupToken)) {
      return { ok: false, error: '初始化口令不正确' };
    }

    const svc = createServiceSupabaseClient();

    // 先占位：只有第一个请求能写入，其余拿到 23505
    const { error: claimError } = await svc
      .from('app_config')
      .insert({ key: ADMIN_EMAIL_KEY, value: email });

    if (!claimError) {
      // 全新初始化：建 Auth 用户（自动确认邮箱）
      const { data: created, error: createError } = await svc.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });

      if (createError || !created.user) {
        // 释放占位，允许重试
        await svc.from('app_config').delete().eq('key', ADMIN_EMAIL_KEY);
        const msg = (createError?.message || '').toLowerCase();

        if (/already exists|already registered/i.test(msg)) {
          return { ok: false, error: '该邮箱已在认证系统中存在，请先在 Supabase 控制台删除该用户后重试' };
        }

        // 内部错误只记服务端日志，不向客户端泄露细节
        console.error('setupAdminAccount createUser failed:', createError?.message);
        return { ok: false, error: '初始化失败，请稍后重试' };
      }

      await issueAdminSession(email);
      return { ok: true };
    }

    if (claimError.code !== '23505') {
      console.error('setupAdminAccount claim failed:', claimError.message);
      return { ok: false, error: '初始化失败，请稍后重试' };
    }

    // 已配置：只允许"恢复"——库里有邮箱但 Auth 用户缺失时，用已配置的邮箱补建用户。
    // 输入邮箱必须和已配置的一致，否则一律视为已初始化。
    const { data: row } = await svc
      .from('app_config')
      .select('value')
      .eq('key', ADMIN_EMAIL_KEY)
      .maybeSingle();
    const configuredEmail = (row?.value || '').trim().toLowerCase();

    if (!configuredEmail || configuredEmail !== email) {
      return { ok: false, error: '管理员已配置，请直接登录' };
    }

    const { data: recovered, error: recoverError } = await svc.auth.admin.createUser({
      email: configuredEmail,
      password,
      email_confirm: true,
    });

    if (recoverError || !recovered.user) {
      const msg = (recoverError?.message || '').toLowerCase();
      // 用户其实已存在 → 初始化是完整的，去登录
      if (/already exists|already registered/i.test(msg)) {
        return { ok: false, error: '管理员已配置，请直接登录' };
      }
      console.error('setupAdminAccount recover failed:', recoverError?.message);
      return { ok: false, error: '初始化失败，请稍后重试' };
    }

    await issueAdminSession(configuredEmail);
    return { ok: true };
  } catch (error) {
    // 兜底：内部错误只记日志，客户端一律通用提示
    console.error('setupAdminAccount failed:', error instanceof Error ? error.message : error);
    return { ok: false, error: '初始化失败，请稍后重试' };
  }
}
