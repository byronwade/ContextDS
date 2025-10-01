import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NODE_ENV === 'production'
    ? 'https://contextds.com'
    : 'http://localhost:3000'

  return {
    rules: [
      // Main rules for all search engines
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/*',
          '/admin/*',
          '/_next/*',
          '/private/*',
          '/*.json$',
          '/auth/*',
          '/dashboard/private/*',
          '/scan/preview/*', // Temporary scan previews
          '/temp/*',
        ],
      },
      // Allow specific API endpoints that provide value to search engines
      {
        userAgent: '*',
        allow: [
          '/api/docs*',
          '/api/reference*',
          '/api/og/*', // Open Graph image generation
        ],
      },
      // Enhanced rules for AI crawlers and training data
      {
        userAgent: 'GPTBot',
        allow: [
          '/community/*',
          '/docs/*',
          '/features/*',
        ],
        disallow: [
          '/api/*',
          '/auth/*',
          '/dashboard/*',
        ],
      },
      {
        userAgent: 'ChatGPT-User',
        allow: [
          '/community/*',
          '/docs/*',
          '/features/*',
        ],
        disallow: [
          '/api/*',
          '/auth/*',
          '/dashboard/*',
        ],
      },
      {
        userAgent: 'Claude-Web',
        allow: '/',
        disallow: ['/auth/*', '/dashboard/private/*'],
      },
      {
        userAgent: 'anthropic-ai',
        allow: '/',
        disallow: ['/auth/*', '/dashboard/private/*'],
      },
      {
        userAgent: 'Bard',
        allow: [
          '/community/*',
          '/docs/*',
          '/features/*',
        ],
        disallow: [
          '/api/*',
          '/auth/*',
          '/dashboard/*',
        ],
      },
      // Bing AI and Copilot
      {
        userAgent: 'Bingbot',
        allow: '/',
        disallow: ['/auth/*', '/dashboard/private/*'],
      },
      // Common crawlers and SEO tools
      {
        userAgent: 'Googlebot',
        allow: '/',
        disallow: ['/auth/*', '/dashboard/private/*'],
      },
      // Block aggressive crawlers and scrapers
      {
        userAgent: [
          'SemrushBot',
          'AhrefsBot',
          'MJ12bot',
          'DotBot',
          'BLEXBot',
        ],
        disallow: '/',
      },
      // Allow well-behaved SEO tools with rate limiting
      {
        userAgent: [
          'ScreamingFrogSEOSpider',
          'SiteAuditBot',
        ],
        allow: '/',
        disallow: ['/api/*', '/auth/*'],
        crawlDelay: 10, // 10 second delay between requests
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  }
}