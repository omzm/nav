'use server';

import { timingSafeEqual } from 'node:crypto';
import { revalidatePath, revalidateTag } from 'next/cache';
import { createServiceSupabaseClient } from '@/app/lib/supabase-service';

/**
 * 首页"提交收录"：访客输入提交密码后，无需进后台即可新增链接。
 *
 * 安全设计：
 * - 密码只存服务端环境变量 SUBMIT_PASSWORD，用 timingSafeEqual 比对，失败直接关闭；
 * - 未配置密码时按钮根本不渲染（page.tsx 控制）；
 * - 写入走 Service Role（绕过 RLS），但入口只有这一个 action，且有频率限制；
 * - 频率限制：全站每小时最多提交 20 条，防止密码泄露后被刷库；
 * - 链接的公开/私密属性继承所选分类（避免"私密分类下出现公开链接"的不一致）。
 */

export type SubmitLinkResult =
  | { ok: true }
  | {
      ok: false;
      error:
        | 'not_configured'
        | 'wrong_password'
        | 'invalid_url'
        | 'invalid_category'
        | 'duplicate'
        | 'rate_limited'
        | 'server_error';
    };

export interface SubmitLinkInput {
  password: string;
  url: string;
  title: string;
  description: string;
  categoryId: string;
}

const MAX_SUBMITS_PER_HOUR = 20;

/**
 * 规范化 URL 用于去重比对：host 小写、去掉末尾斜杠。
 * 与后台链接表单的逻辑保持一致。
 */
function normalizeUrlForCompare(raw: string): string {
  const trimmed = raw.trim();
  try {
    const parsed = new URL(trimmed);
    parsed.hostname = parsed.hostname.toLowerCase();
    let result = parsed.toString();
    if (result.length > 1 && result.endsWith('/')) {
      result = result.slice(0, -1);
    }
    return result;
  } catch {
    return trimmed;
  }
}

function isPasswordValid(input: string, expected: string): boolean {
  if (!input || !expected) return false;
  const a = Buffer.from(input, 'utf8');
  const b = Buffer.from(expected, 'utf8');
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function submitLink(input: SubmitLinkInput): Promise<SubmitLinkResult> {
  const expectedPassword = process.env.SUBMIT_PASSWORD || '';
  if (!expectedPassword) {
    return { ok: false, error: 'not_configured' };
  }
  if (!isPasswordValid(input.password || '', expectedPassword)) {
    return { ok: false, error: 'wrong_password' };
  }

  const rawUrl = (input.url || '').trim();
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(rawUrl);
    if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
      throw new Error('unsupported protocol');
    }
  } catch {
    return { ok: false, error: 'invalid_url' };
  }

  const categoryId = (input.categoryId || '').trim();
  if (!categoryId) {
    return { ok: false, error: 'invalid_category' };
  }
  const title = (input.title || '').trim().slice(0, 100) || parsedUrl.hostname.replace(/^www\./, '');
  const description = (input.description || '').trim().slice(0, 500);

  let supabase;
  try {
    supabase = createServiceSupabaseClient();
  } catch {
    return { ok: false, error: 'server_error' };
  }

  // 分类必须存在；链接继承分类的公开/私密属性
  const { data: category, error: categoryError } = await supabase
    .from('categories')
    .select('id, is_private')
    .eq('id', categoryId)
    .maybeSingle();
  if (categoryError || !category) {
    return { ok: false, error: 'invalid_category' };
  }

  // 频率限制：访客提交通道每小时最多 20 条（只统计 source='public'，
  // 后台管理员添加的不计入，避免管理员批量整理时误封访客提交）
  const oneHourAgo = new Date(Date.now() - 3600_000).toISOString();
  const { count: recentCount, error: countError } = await supabase
    .from('links')
    .select('id', { count: 'exact', head: true })
    .eq('source', 'public')
    .gte('created_at', oneHourAgo);
  if (countError) {
    console.error('提交收录：频率检查失败', countError);
    return { ok: false, error: 'server_error' };
  }
  if ((recentCount || 0) >= MAX_SUBMITS_PER_HOUR) {
    return { ok: false, error: 'rate_limited' };
  }

  // 去重：URL 入库即规范化（host 小写、无尾斜杠），精确匹配即可，无需全表拉取
  const normalized = normalizeUrlForCompare(rawUrl);
  const { data: existing, error: dupError } = await supabase
    .from('links')
    .select('id')
    .eq('url', normalized)
    .limit(1);
  if (dupError) {
    console.error('提交收录：去重检查失败', dupError);
    return { ok: false, error: 'server_error' };
  }
  if ((existing || []).length > 0) {
    return { ok: false, error: 'duplicate' };
  }

  const { count: categoryCount, error: orderError } = await supabase
    .from('links')
    .select('id', { count: 'exact', head: true })
    .eq('category_id', categoryId);
  if (orderError) {
    console.error('提交收录：排序值查询失败', orderError);
    return { ok: false, error: 'server_error' };
  }

  const { error: insertError } = await supabase.from('links').insert({
    category_id: categoryId,
    title,
    url: normalized,
    description,
    icon: '',
    order: (categoryCount || 0) + 1,
    is_private: Boolean(category.is_private),
    source: 'public',
  });
  if (insertError) {
    console.error('提交收录：写入失败', insertError);
    return { ok: false, error: 'server_error' };
  }

  // 直接清快照缓存（不经过需管理员会话的 revalidateNavSnapshot，
  // 提交频率本身已受限，不会被用来打穿缓存）
  revalidateTag('nav-snapshot', { expire: 0 });
  revalidatePath('/');

  return { ok: true };
}
