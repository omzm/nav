import { headers } from 'next/headers'

/**
 * 站点规范地址：按当前请求的域名生成——谁在服务这个请求，就用谁的域名。
 * 供 sitemap / robots 使用（协议要求绝对 URL，但域名不写死：
 * 域名搬家或他人部署时自动跟随，不再指向旧域名）。
 * 反代/Vercel 环境优先 x-forwarded-*；拿不到 host 时回落默认域名。
 */
const FALLBACK_SITE_URL = 'https://1.145678.xyz'

export async function getSiteUrl(): Promise<string> {
  try {
    const h = await headers()
    const host = h.get('x-forwarded-host') ?? h.get('host')
    if (!host) return FALLBACK_SITE_URL
    const proto =
      h.get('x-forwarded-proto') ??
      (host.startsWith('localhost') || host.startsWith('127.') ? 'http' : 'https')
    return `${proto}://${host}`
  } catch {
    return FALLBACK_SITE_URL
  }
}
