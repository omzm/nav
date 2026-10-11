'use server';

import { cookies } from 'next/headers';
import { createServerSupabaseClient } from '../lib/supabase-server';
import { createServiceSupabaseClient } from '../lib/supabase-service';
import { ADMIN_EMAIL_KEY, getDbAdminEmail } from '../lib/admin-email';
import {
  ADMIN_COOKIE_NAME,
  ADMIN_SESSION_TTL_SECONDS,
  signAdminToken,
  verifyAdminToken,
} from '../lib/admin-auth';

export interface UpdateAdminAccountResult {
  ok: boolean;
  error?: string;
  emailChanged?: boolean;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function cookieOptions() {
  return {
    httpOnly: true,
    path: '/',
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    maxAge: ADMIN_SESSION_TTL_SECONDS,
  };
}

/**
 * 修改管理员登录邮箱 / 密码（服务端）。
 *
 * 安全设计：
 * 1. 必须持有有效的管理员会话 Cookie（登录态）。
 * 2. 必须提供当前密码——服务端用它重新做一次 signInWithPassword，
 *    既校验密码正确性，又拿到 Auth 用户 id。
 * 3. 邮箱修改走 service_role 的 admin.updateUserById 并 email_confirm: true，
 *    跳过邮件确认（单管理员站点，避免确认链路失败把自己锁在外面）；
 *    同时同步 app_config.admin_email（登录校验以它为准），两处都成功才算成功，
 *    app_config 写失败时回滚 Auth 邮箱，保证两边一致。
 * 4. 邮箱变更后按新邮箱重签会话 Cookie，当前登录态不断。
 */
export async function updateAdminAccount(input: {
  currentPassword: string;
  newEmail?: string;
  newPassword?: string;
}): Promise<UpdateAdminAccountResult> {
  try {
    const cleanEmail = (input.newEmail || '').trim().toLowerCase();
    const cleanPassword = input.newPassword || '';

    if (!input.currentPassword) {
      return { ok: false, error: '请输入当前密码以确认身份' };
    }
    if (!cleanEmail && !cleanPassword) {
      return { ok: false, error: '没有要修改的内容' };
    }
    if (cleanEmail && !EMAIL_RE.test(cleanEmail)) {
      return { ok: false, error: '新邮箱格式不正确' };
    }
    if (cleanPassword && cleanPassword.length < 6) {
      return { ok: false, error: '新密码至少 6 位' };
    }

    // 1. 管理员会话校验
    const store = await cookies();
    const sessionEmail = await verifyAdminToken(store.get(ADMIN_COOKIE_NAME)?.value);
    if (!sessionEmail) {
      return { ok: false, error: '登录已过期，请重新登录后再试' };
    }
    const dbEmail = (await getDbAdminEmail()).toLowerCase();
    if (!dbEmail || sessionEmail.toLowerCase() !== dbEmail) {
      return { ok: false, error: '管理员身份校验失败' };
    }
    if (cleanEmail && cleanEmail === dbEmail) {
      return { ok: false, error: '新邮箱与当前邮箱相同，无需修改' };
    }

    // 2. 当前密码重新鉴权（拿用户 id，密码错直接拒绝）
    const supabase = createServerSupabaseClient();
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: dbEmail,
      password: input.currentPassword,
    });
    if (signInError || !signInData.user) {
      return { ok: false, error: '当前密码不正确' };
    }
    const userId = signInData.user.id;

    // 3. service_role 修改
    const svc = createServiceSupabaseClient();

    if (cleanEmail) {
      const { error: emailError } = await svc.auth.admin.updateUserById(userId, {
        email: cleanEmail,
        email_confirm: true,
      });
      if (emailError) {
        return { ok: false, error: '邮箱修改失败：' + emailError.message };
      }
      const { error: dbError } = await svc
        .from('app_config')
        .upsert({ key: ADMIN_EMAIL_KEY, value: cleanEmail }, { onConflict: 'key' });
      if (dbError) {
        // Auth 已改但配置没写上：回滚邮箱，保证两边一致
        await svc.auth.admin.updateUserById(userId, { email: dbEmail, email_confirm: true });
        return { ok: false, error: '邮箱修改失败（数据未保持一致），请重试' };
      }
      store.set(ADMIN_COOKIE_NAME, await signAdminToken(cleanEmail), cookieOptions());
    }

    if (cleanPassword) {
      const { error: pwError } = await svc.auth.admin.updateUserById(userId, {
        password: cleanPassword,
      });
      if (pwError) {
        return { ok: false, error: '密码修改失败：' + pwError.message };
      }
    }

    return { ok: true, emailChanged: !!cleanEmail };
  } catch (error) {
    console.error('updateAdminAccount failed:', error);
    return { ok: false, error: '修改失败，请稍后重试' };
  }
}
