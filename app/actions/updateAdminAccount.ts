'use server';

import { cookies } from 'next/headers';
import { createServerSupabaseClient } from '../lib/supabase-server';
import { createServiceSupabaseClient } from '../lib/supabase-service';
import {
  ADMIN_EMAIL_KEY,
  getDbAdminEmail,
  getDbAdminUsername,
  setDbAdminUsername,
} from '../lib/admin-email';
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
/** 用户名：2–32 位，字母/数字/下划线/连字符/中文 */
const USERNAME_RE = /^[\w\u4e00-\u9fa5-]{2,32}$/;

function cookieOptions() {
  return {
    httpOnly: true,
    path: '/',
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    maxAge: ADMIN_SESSION_TTL_SECONDS,
  };
}

interface AdminIdentity {
  ok: boolean;
  error?: string;
  userId?: string;
  dbEmail?: string;
}

/**
 * 管理员身份双校验：会话 Cookie 有效 + 当前密码正确。
 * 通过时返回 Auth 用户 id 与数据库中的管理员邮箱。
 */
async function verifyAdminIdentity(currentPassword: string): Promise<AdminIdentity> {
  if (!currentPassword) {
    return { ok: false, error: '请输入当前密码以确认身份' };
  }

  const store = await cookies();
  const sessionEmail = await verifyAdminToken(store.get(ADMIN_COOKIE_NAME)?.value);
  if (!sessionEmail) {
    return { ok: false, error: '登录已过期，请重新登录后再试' };
  }

  const dbEmail = (await getDbAdminEmail()).toLowerCase();
  if (!dbEmail || sessionEmail.toLowerCase() !== dbEmail) {
    return { ok: false, error: '管理员身份校验失败' };
  }

  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: dbEmail,
    password: currentPassword,
  });
  if (error || !data.user) {
    return { ok: false, error: '当前密码不正确' };
  }

  return { ok: true, userId: data.user.id, dbEmail };
}

/** 当前管理员的邮箱与用户名（会话校验后返回） */
export async function getAdminAccount(): Promise<{ email: string; username: string }> {
  const store = await cookies();
  const sessionEmail = await verifyAdminToken(store.get(ADMIN_COOKIE_NAME)?.value);
  if (!sessionEmail) return { email: '', username: '' };
  const dbEmail = await getDbAdminEmail();
  if (!dbEmail || sessionEmail.toLowerCase() !== dbEmail.toLowerCase()) {
    return { email: '', username: '' };
  }
  return { email: dbEmail, username: await getDbAdminUsername() };
}

/**
 * 设置/清除管理员登录用户名。设置后可用"用户名或邮箱"登录；
 * 传空字符串表示清除，恢复为仅邮箱登录。
 */
export async function setAdminUsername(input: {
  currentPassword: string;
  username: string;
}): Promise<UpdateAdminAccountResult> {
  try {
    const clean = (input.username || '').trim();
    if (clean && !USERNAME_RE.test(clean)) {
      return { ok: false, error: '用户名为 2–32 位，可用字母、数字、下划线、连字符、中文' };
    }

    const identity = await verifyAdminIdentity(input.currentPassword);
    if (!identity.ok) return { ok: false, error: identity.error };

    await setDbAdminUsername(clean);
    return { ok: true };
  } catch (error) {
    console.error('setAdminUsername failed:', error);
    return { ok: false, error: '保存失败，请稍后重试' };
  }
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

    if (!cleanEmail && !cleanPassword) {
      return { ok: false, error: '没有要修改的内容' };
    }
    if (cleanEmail && !EMAIL_RE.test(cleanEmail)) {
      return { ok: false, error: '新邮箱格式不正确' };
    }
    if (cleanPassword && cleanPassword.length < 6) {
      return { ok: false, error: '新密码至少 6 位' };
    }

    const identity = await verifyAdminIdentity(input.currentPassword);
    if (!identity.ok) return { ok: false, error: identity.error };
    const { userId, dbEmail } = identity as { userId: string; dbEmail: string };

    if (cleanEmail && cleanEmail === dbEmail) {
      return { ok: false, error: '新邮箱与当前邮箱相同，无需修改' };
    }

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
      const store = await cookies();
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
