'use server';

import { createServerSupabaseClient } from '../lib/supabase-server';
import type { NavCategory } from '../types';

export interface UnlockPrivateResult {
  /** 口令是否正确 */
  ok: boolean;
  /** 口令正确时返回的私密分类（含链接） */
  categories: NavCategory[];
  /** 失败原因：口令错误 / 服务异常 */
  reason?: 'mismatch' | 'error';
}

interface PrivateRpcPayload {
  unlocked?: boolean;
  categories?: NavCategory[];
}

/**
 * "开门"口令校验 + 私密数据下发（服务端）。
 *
 * 设计说明（对应安全修复 S1）：
 * - 首页初始快照只含公开数据，私密数据只在口令正确时经由本 action 下发，
 *   不再出现在页面源码、直接 RPC 调用或爬虫抓取结果中。
 * - 口令本身是产品设计的"暗号门"（任何人输入"开门"即可查看），
 *   不做登录态要求；真正的校验发生在数据库函数内。
 */
export async function unlockPrivateLinks(phrase: string): Promise<UnlockPrivateResult> {
  const clean = phrase.trim();

  if (!clean || clean.length > 32) {
    return { ok: false, categories: [], reason: 'mismatch' };
  }

  try {
    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase.rpc('get_nav_private_data', {
      p_phrase: clean,
    });

    if (error) throw error;

    const payload = (data || {}) as PrivateRpcPayload;

    if (!payload.unlocked) {
      return { ok: false, categories: [], reason: 'mismatch' };
    }

    const categories = Array.isArray(payload.categories) ? payload.categories : [];

    return { ok: true, categories };
  } catch (error) {
    console.error('unlockPrivateLinks failed:', error);
    return { ok: false, categories: [], reason: 'error' };
  }
}
