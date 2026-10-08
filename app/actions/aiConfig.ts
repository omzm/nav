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
  if (!model) throw new Error('请选择模型');

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

/**
 * 获取模型列表：调 OpenAI 兼容接口的 GET /models。
 * 用表单填写的地址/Key（为空则回退到已保存的），Key 只在服务端瞬时使用，不存储。
 */
export async function fetchAiModels(input: { apiBase: string; apiKey: string }): Promise<string[]> {
  await assertAdmin();

  const stored = await readAiCredentials();
  const apiBase = input.apiBase.trim().replace(/\/+$/, '') || stored.apiBase;
  const apiKey = input.apiKey.trim() || stored.apiKey;

  if (!apiBase) throw new Error('请先填写 API 地址');
  if (!/^https?:\/\//i.test(apiBase)) throw new Error('API 地址须以 http:// 或 https:// 开头');
  if (!apiKey) throw new Error('请先填写 API Key');

  let response: Response;
  try {
    response = await fetch(`${apiBase}/models`, {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(15000),
    });
  } catch {
    throw new Error('无法连接到 API 地址（网络不通或超时），请检查地址是否正确');
  }

  if (!response.ok) {
    await response.body?.cancel().catch(() => {});
    if (response.status === 401 || response.status === 403) {
      throw new Error('API Key 无效或无权限（401/403），请检查 Key 是否正确');
    }
    throw new Error(`获取模型列表失败（${response.status}）：请检查 API 地址和 Key 是否正确`);
  }

  const text = await response.text();
  if (text.length > 1_000_000) {
    throw new Error('接口返回数据过大，疑似中转异常');
  }
  const data = ((): { data?: Array<{ id?: string }> } | null => {
    try {
      return JSON.parse(text);
    } catch {
      return null;
    }
  })();
  const ids = (data?.data || [])
    .map((m) => m?.id)
    .filter((id): id is string => typeof id === 'string' && id.length > 0);

  if (!ids.length) {
    throw new Error('接口没有返回可用模型');
  }

  return [...new Set(ids)].sort();
}
