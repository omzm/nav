import 'server-only';

import { createServiceSupabaseClient } from './supabase-service';

export const AI_API_BASE_KEY = 'ai_api_base';
export const AI_API_KEY_KEY = 'ai_api_key';
export const AI_MODEL_KEY = 'ai_model';

export interface AiCredentials {
  apiBase: string;
  apiKey: string;
  model: string;
}

/**
 * 从 app_config 读取 AI 配置（service_role，服务端专用）。
 * Key 只在服务端使用，绝不返回给前端。
 */
export async function readAiCredentials(): Promise<AiCredentials> {
  const { data, error } = await createServiceSupabaseClient()
    .from('app_config')
    .select('key, value')
    .in('key', [AI_API_BASE_KEY, AI_API_KEY_KEY, AI_MODEL_KEY]);

  if (error) {
    throw new Error('读取 AI 配置失败');
  }

  const map = new Map((data || []).map((row) => [row.key as string, row.value as string]));
  return {
    apiBase: (map.get(AI_API_BASE_KEY) || '').trim(),
    apiKey: (map.get(AI_API_KEY_KEY) || '').trim(),
    model: (map.get(AI_MODEL_KEY) || '').trim(),
  };
}

/**
 * 调用 OpenAI 兼容接口的 chat completions。
 * 仅服务端调用，API Key 不出服务端。
 */
export async function callChatCompletions(userPrompt: string, maxTokens = 200): Promise<string> {
  const { apiBase, apiKey, model } = await readAiCredentials();

  if (!apiBase || !apiKey || !model) {
    throw new Error('AI 未配置：请先在后台「AI 设置」中填写 API 地址、Key 和模型');
  }

  const response = await fetch(`${apiBase}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: 'system',
          content:
            '你是一个网站导航站的中文编辑。请用简体中文写网站描述，只输出描述正文，不要解释、不要加引号、不要用 markdown。',
        },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: maxTokens,
      temperature: 0.7,
    }),
    signal: AbortSignal.timeout(30000),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`AI 接口返回 ${response.status}${body ? `：${body.slice(0, 150)}` : ''}`);
  }

  const data = (await response.json().catch(() => null)) as {
    choices?: Array<{ message?: { content?: string } }>;
  } | null;
  const text = data?.choices?.[0]?.message?.content?.trim();

  if (!text) {
    throw new Error('AI 没有返回有效内容');
  }

  return text;
}
