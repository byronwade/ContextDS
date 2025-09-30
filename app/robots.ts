import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  const baseUrl = 'https://contextds.com'

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',
          '/admin/',
          '/_next/',
          '/private/',
          '*.json$',
        ],
      },
      // Allow search engines to crawl API documentation
      {
        userAgent: '*',
        allow: ['/api/docs', '/api/reference'],
      },
      // Specific rules for AI crawlers
      {
        userAgent: 'GPTBot',
        allow: '/community/',
        disallow: '/api/',
      },
      {
        userAgent: 'ChatGPT-User',
        allow: '/community/',
        disallow: '/api/',
      },
      {
        userAgent: 'anthropic-ai',
        allow: '/',
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  }
}