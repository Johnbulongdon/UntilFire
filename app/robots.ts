import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/dashboard', '/transactions', '/expenses', '/api/', '/auth/', '/debug'],
    },
    sitemap: 'https://www.untilfire.com/sitemap.xml',
  }
}
