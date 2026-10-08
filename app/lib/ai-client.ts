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
    throw new Error('AI 未配置：请先在后台「AI 设置」中填写 API 地址、Key 并选择模型');
  }

  let response: Response;
  try {
    response = await fetch(`${apiBase}/chat/completions`, {
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
      signal: AbortSignal.timeout(25000),
    });
  } catch {
    throw new Error('无法连接到 API 地址（网络不通或超时），请检查地址是否正确');
  }

  if (!response.ok) {
    // 出错时不读 body：某些中转返回超大/流式内容，直接读会拖垮函数
    await response.body?.cancel().catch(() => {});
    if (response.status === 401 || response.status === 403) {
      throw new Error('API Key 无效或无权限（401/403），请检查 Key 是否正确');
    }
    if (response.status === 404) {
      throw new Error('接口地址不存在（404），请检查 API 地址是否正确');
    }
    throw new Error(`AI 接口返回 ${response.status}，请检查 API 地址和 Key`);
  }

  const data = await readJsonBounded(response);
  const text = data?.choices?.[0]?.message?.content?.trim();

  if (!text) {
    throw new Error('AI 没有返回有效内容');
  }

  return text;
}

/**
 * 有界读取 JSON：防止异常中转返回超大 body 拖垮服务端函数。
 * 超过上限直接抛错，不做无界缓冲。
 */
async function readJsonBounded(response: Response, maxBytes = 1_000_000): Promise<any> {
  const declared = Number(response.headers.get('content-length') || 0);
  if (declared > maxBytes) {
    await response.body?.cancel().catch(() => {});
    throw new Error('AI 接口返回数据过大，疑似中转异常');
  }
  const text = await response.text();
  if (text.length > maxBytes) {
    throw new Error('AI 接口返回数据过大，疑似中转异常');
  }
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}
