'use server';

import 'server-only';

import { createServiceSupabaseClient } from '@/app/lib/supabase-service';
import { assertAdmin } from './adminSession';

const UNLOCK_PHRASE_KEY = 'unlock_phrase';
const DEFAULT_UNLOCK_PHRASE = '开门';

export interface UnlockPhraseStatus {
  /** 当前生效口令（未配置时为默认值） */
  phrase: string;
  /** 是否为默认值（从未在后台配置过） */
  isDefault: boolean;
}

/**
 * 读取解锁口令状态（管理员）。
 * 口令本体只返回给已鉴权管理员；注意这不是高安全口令，
 * 而是"暗号门"产品设计（见 unlockPrivate.ts 注释）。
 */
export async function getUnlockPhrase(): Promise<UnlockPhraseStatus> {
  await assertAdmin();

  const { data, error } = await createServiceSupabaseClient()
    .from('app_config')
    .select('value')
    .eq('key', UNLOCK_PHRASE_KEY)
    .maybeSingle();

  if (error) {
    throw new Error('读取解锁口令失败');
  }

  const phrase = (data?.value || '').trim();
  return { phrase: phrase || DEFAULT_UNLOCK_PHRASE, isDefault: !phrase };
}

/** 保存解锁口令（管理员）：写入 app_config，get_nav_private_data 下次调用即生效 */
export async function saveUnlockPhrase(phrase: string): Promise<void> {
  await assertAdmin();

  const clean = phrase.trim();
  if (!clean) {
    throw new Error('口令不能为空');
  }
  if (clean.length > 32) {
    throw new Error('口令不能超过 32 个字符');
  }

  const { error } = await createServiceSupabaseClient()
    .from('app_config')
    .upsert(
      { key: UNLOCK_PHRASE_KEY, value: clean, updated_at: new Date().toISOString() },
      { onConflict: 'key' }
    );

  if (error) {
    throw new Error('保存失败，请稍后重试');
  }
}
