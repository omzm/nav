'use server';

import { cookies } from 'next/headers';
import { createServiceSupabaseClient } from '../lib/supabase-service';
import { ADMIN_EMAIL_KEY, getDbAdminEmail } from '../lib/admin-email';
import { ADMIN_COOKIE_NAME, ADMIN_SESSION_TTL_SECONDS, signAdminToken } from '../lib/admin-auth';

export interface SetupResult {
  ok: boolean;
  error?: string;
}

function isValidEmail(email: string): boolean {
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email);
}

/** Auth 中是否已有用户（service_role 查询） */
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

/**
 * 首次部署的管理员初始化（一次性）。
 *
 * - 数据库已有管理员邮箱且 Auth 已有用户 → 拒绝（已初始化过）。
 * - 同邮箱的 Auth 用户已存在（部署者曾在控制台手动建过）→ 更新密码后收养为管理员。
 * - 否则新建 Auth 用户，并把邮箱写入 app_config（RLS 策略与 RPC 由此读取）。
 * 成功后直接签发会话，跳过登录页。
 */
export async function setupAdminAccount(email: string, password: string): Promise<SetupResult> {
  try {
    email = (email || '').trim().toLowerCase();

    if (!isValidEmail(email)) {
      return { ok: false, error: '邮箱格式不正确' };
    }

    if (!password || password.length < 8) {
      return { ok: false, error: '密码至少 8 位' };
    }

    const svc = createServiceSupabaseClient();

    const { data: listed } = await svc.auth.admin.listUsers();
    const existingUser = listed?.users?.find((u) => (u.email || '').toLowerCase() === email);
    const dbEmail = await getDbAdminEmail();

    // 已完整初始化过：拒绝重复执行
    if (dbEmail && listed && listed.users.length > 0) {
      return { ok: false, error: '管理员已配置，无需重复初始化' };
    }

    let userId: string;

    if (existingUser) {
      // 收养：更新密码并确认邮箱
      const { error } = await svc.auth.admin.updateUserById(existingUser.id, {
        password,
        email_confirm: true,
      });

      if (error) {
        return { ok: false, error: '更新管理员密码失败：' + error.message };
      }

      userId = existingUser.id;
    } else {
      const { data: created, error } = await svc.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });

      if (error || !created.user) {
        return { ok: false, error: createError(error) };
      }

      userId = created.user.id;
    }

    // 写入管理员邮箱（RLS 策略与排序 RPC 由此动态读取）
    const { error: cfgError } = await svc
      .from('app_config')
      .upsert({ key: ADMIN_EMAIL_KEY, value: email }, { onConflict: 'key' });

    if (cfgError) {
      // 回滚：删掉刚建的用户，避免半初始化状态（收养的不删）
      if (!existingUser) {
        await svc.auth.admin.deleteUser(userId);
      }

      return { ok: false, error: '写入配置失败：' + cfgError.message };
    }

    // 直接建立会话，跳过登录页
    const token = await signAdminToken(email);
    const store = await cookies();
    store.set(ADMIN_COOKIE_NAME, token, {
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

function createError(error: { message?: string } | null): string {
  return error?.message || '创建管理员账号失败';
}
