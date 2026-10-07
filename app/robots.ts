import type { MetadataRoute } from 'next'

const SITE_URL = 'https://1.145678.xyz'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      // 后台与写入接口不给爬虫
      disallow: ['/admin/', '/api/'],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  }
}
