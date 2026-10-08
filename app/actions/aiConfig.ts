'use server';

import 'server-only';

import { createServiceSupabaseClient } from '@/app/lib/supabase-service';
import {
  AI_API_BASE_KEY,
  AI_API_KEY_KEY,
  AI_MODEL_KEY,
  callChatCompletions,
  readAiCredentials,
} from '@/app/lib/ai-client';
import { assertAdmin } from './adminSession';

export interface AiConfigStatus {
  apiBase: string;
  model: string;
  hasApiKey: boolean;
}

/** 读取 AI 配置状态（Key 本体不返回给前端，只返回是否已配置） */
export async function getAiConfigStatus(): Promise<AiConfigStatus> {
  await assertAdmin();
  const { apiBase, apiKey, model } = await readAiCredentials();
  return { apiBase, model, hasApiKey: apiKey !== '' };
}

function normalizeBase(input: string): string {
  return input.trim().replace(/\/+$/, '');
}

/**
 * 保存 AI 配置。apiKey 为空字符串时保留原值（不覆盖），
 * 避免编辑其它字段时把已配置的 Key 洗掉。
 */
export async function saveAiConfig(input: {
  apiBase: string;
  apiKey: string;
  model: string;
}): Promise<void> {
  await assertAdmin();

  const apiBase = normalizeBase(input.apiBase);
  const model = input.model.trim();
  const apiKey = input.apiKey.trim();

  if (!apiBase) throw new Error('请填写 API 地址');
  if (!/^https?:\/\//i.test(apiBase)) throw new Error('API 地址须以 http:// 或 https:// 开头');
  if (!model) throw new Error('请填写模型名称');

  const now = new Date().toISOString();
  const rows: Array<{ key: string; value: string; updated_at: string }> = [
    { key: AI_API_BASE_KEY, value: apiBase, updated_at: now },
    { key: AI_MODEL_KEY, value: model, updated_at: now },
  ];
  if (apiKey) {
    rows.push({ key: AI_API_KEY_KEY, value: apiKey, updated_at: now });
  }

  const { error } = await createServiceSupabaseClient()
    .from('app_config')
    .upsert(rows, { onConflict: 'key' });

  if (error) {
    throw new Error('保存失败，请稍后重试');
  }
}

/** 测试 AI 连接：发一条最小请求验证地址/Key/模型是否可用 */
export async function testAiConnection(): Promise<{ ok: boolean; message: string }> {
  await assertAdmin();
  try {
    const reply = await callChatCompletions('请只回复"连接正常"四个字。', 32);
    return { ok: true, message: `连接成功，模型回复：${reply.slice(0, 80)}` };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : '连接失败' };
  }
}
