'use server';

import 'server-only';

import { callChatCompletions } from '@/app/lib/ai-client';
import { assertAdmin } from './adminSession';

/**
 * 用 AI 生成网站描述（供链接表单的"AI 生成"按钮调用）。
 * 管理员鉴权 + Key 全程不出服务端。
 */
export async function generateSiteDescription(input: {
  title: string;
  url: string;
}): Promise<string> {
  await assertAdmin();

  const title = input.title.trim();
  const url = input.url.trim();
  if (!title) throw new Error('请先填写网站名称');
  if (!url) throw new Error('请先填写网站 URL');

  const prompt =
    `网站名称：${title}\n网站地址：${url}\n` +
    `请用一句话（50 字以内）介绍这个网站是做什么的、适合谁用。`;
  return callChatCompletions(prompt, 200);
}
