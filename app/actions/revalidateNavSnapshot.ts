'use server';

import { revalidatePath, revalidateTag } from 'next/cache';
import { assertAdmin } from './adminSession';

/**
 * 刷新首页导航快照缓存（对应安全修复 S4）。
 *
 * 此前该 action 无鉴权且挂在首页公开刷新按钮上，任何人可循环调用
 * 打穿缓存、制造数据库负载。现已：
 * 1. 移除首页公开刷新按钮（后台保存时已主动刷新缓存）；
 * 2. 保留 action 供后台内部使用，但要求有效的管理员会话。
 */
export async function revalidateNavSnapshot() {
  await assertAdmin();

  revalidateTag('nav-snapshot', { expire: 0 });
  revalidatePath('/');
}
