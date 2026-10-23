import type { MetadataRoute } from 'next'
import { getSiteUrl } from './lib/site-url'

export default async function robots(): Promise<MetadataRoute.Robots> {
  const siteUrl = await getSiteUrl()
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      // 后台与写入接口不给爬虫
      disallow: ['/admin/', '/api/'],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  }
}
