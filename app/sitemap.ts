import type { MetadataRoute } from 'next'
import { getSiteUrl } from './lib/site-url'

// 单页导航站：全站只有一个公开页面，sitemap 只收录首页。
// 私密链接走客户端"开门"获取，不进 sitemap、不进搜索引擎。
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = await getSiteUrl()
  return [
    {
      url: siteUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
  ]
}
