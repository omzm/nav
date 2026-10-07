import type { MetadataRoute } from 'next'

const SITE_URL = 'https://1.145678.xyz'

// 单页导航站：全站只有一个公开页面，sitemap 只收录首页。
// 私密链接走客户端"开门"获取，不进 sitemap、不进搜索引擎。
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: SITE_URL,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
  ]
}
