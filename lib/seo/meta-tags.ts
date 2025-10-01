/**
 * SEO Meta Tags Generation for ContextDS
 * Comprehensive meta tag and Open Graph optimization
 */

import type { Metadata } from "next"

export interface SEOConfig {
  title: string
  description: string
  keywords?: string[]
  canonical?: string
  robots?: string
  author?: string
  image?: string
  type?: 'website' | 'article' | 'product' | 'profile'
  locale?: string
  siteName?: string
  twitterCard?: 'summary' | 'summary_large_image' | 'app' | 'player'
  alternates?: {
    canonical?: string
    languages?: Record<string, string>
  }
}

export interface SiteMetadata {
  domain?: string
  tokens?: number
  scannedAt?: string
  categories?: string[]
  confidence?: number
}

const DEFAULT_CONFIG = {
  siteName: "ContextDS",
  defaultImage: "/images/og-default.png",
  twitterHandle: "@contextds",
  locale: "en_US",
  type: "website" as const
}

export function generateSEOMetadata(config: SEOConfig): Metadata {
  const {
    title,
    description,
    keywords = [],
    canonical,
    robots = "index, follow",
    author = "ContextDS Team",
    image = DEFAULT_CONFIG.defaultImage,
    type = DEFAULT_CONFIG.type,
    locale = DEFAULT_CONFIG.locale,
    siteName = DEFAULT_CONFIG.siteName,
    twitterCard = "summary_large_image",
    alternates
  } = config

  // Ensure title is optimized for SEO
  const optimizedTitle = title.includes(siteName) ? title : `${title} | ${siteName}`

  // Build comprehensive keyword list
  const allKeywords = [
    ...keywords,
    "design tokens",
    "CSS extraction",
    "design systems",
    "web analysis",
    "UI tokens"
  ].filter(Boolean)

  const metadata: Metadata = {
    title: optimizedTitle,
    description,
    keywords: allKeywords,
    authors: [{ name: author }],
    creator: siteName,
    publisher: siteName,
    robots,

    // Open Graph
    openGraph: {
      title: optimizedTitle,
      description,
      url: canonical,
      siteName,
      locale,
      type,
      images: [
        {
          url: image,
          width: 1200,
          height: 630,
          alt: `${title} - ${siteName}`,
        }
      ],
    },

    // Twitter Card
    twitter: {
      card: twitterCard,
      title: optimizedTitle,
      description,
      images: [image],
      creator: DEFAULT_CONFIG.twitterHandle,
      site: DEFAULT_CONFIG.twitterHandle,
    },

    // Additional meta tags
    other: {
      'apple-mobile-web-app-title': siteName,
      'application-name': siteName,
      'msapplication-TileColor': '#3b82f6',
      'theme-color': '#ffffff',
    },

    // Alternates for canonicalization and internationalization
    alternates: {
      canonical,
      ...alternates
    },

    // Verification tags (to be configured with actual values)
    verification: {
      google: process.env.GOOGLE_SITE_VERIFICATION,
      yandex: process.env.YANDEX_VERIFICATION,
      yahoo: process.env.YAHOO_VERIFICATION,
      other: {
        'bing-site-verification': process.env.BING_VERIFICATION,
      }
    },

    // App-specific metadata
    appleWebApp: {
      capable: true,
      title: siteName,
      statusBarStyle: 'default',
    },

    // Format detection
    formatDetection: {
      email: false,
      address: false,
      telephone: false,
    },
  }

  return metadata
}

export function generateHomepageMetadata(): Metadata {
  return generateSEOMetadata({
    title: "ContextDS - Design Tokens Made Fast",
    description: "Extract design tokens from any website instantly. AI-powered CSS analysis, layout DNA profiling, and W3C token generation for modern design systems.",
    keywords: [
      "design token extraction",
      "CSS analyzer",
      "layout DNA",
      "design system analysis",
      "web scraping design",
      "token generator",
      "design automation",
      "component library analysis"
    ],
    canonical: "https://contextds.com",
    image: "/images/og-homepage.png",
    type: "website"
  })
}

export function generateScanPageMetadata(): Metadata {
  return generateSEOMetadata({
    title: "Scan Website - Extract Design Tokens",
    description: "Scan any public website to extract design tokens, analyze layout patterns, and generate W3C-compliant token sets. Fast, accurate, AI-powered analysis.",
    keywords: [
      "website scanner",
      "design token scanner",
      "CSS token extraction",
      "layout analysis tool",
      "design system scanner"
    ],
    canonical: "https://contextds.com/scan",
    image: "/images/og-scan.png"
  })
}

export function generateCommunityMetadata(): Metadata {
  return generateSEOMetadata({
    title: "Community - Design Token Directory",
    description: "Explore design tokens from popular websites. Browse, compare, and analyze design systems from top companies and design-forward sites.",
    keywords: [
      "design token directory",
      "design system examples",
      "token library",
      "design inspiration",
      "component patterns"
    ],
    canonical: "https://contextds.com/community",
    image: "/images/og-community.png"
  })
}

export function generateSiteMetadata(siteData: SiteMetadata & { domain: string }): Metadata {
  const {
    domain,
    tokens = 0,
    scannedAt,
    categories = [],
    confidence = 0
  } = siteData

  const categoryText = categories.length > 0 ? ` including ${categories.slice(0, 3).join(', ')}` : ''
  const tokensText = tokens > 0 ? ` ${tokens} design tokens extracted` : ''

  return generateSEOMetadata({
    title: `${domain} Design Tokens${tokensText ? ` - ${tokensText}` : ''}`,
    description: `Design tokens and layout analysis for ${domain}.${tokensText}${categoryText}. Explore colors, typography, spacing, and component patterns.`,
    keywords: [
      domain,
      "design tokens",
      "design system",
      `${domain} tokens`,
      `${domain} design`,
      ...categories.map(cat => `${domain} ${cat}`)
    ],
    canonical: `https://contextds.com/community/${domain}`,
    image: `/api/og/site?domain=${encodeURIComponent(domain)}&tokens=${tokens}`,
    type: "article"
  })
}

export function generateDocsMetadata(section?: string): Metadata {
  const sectionTitle = section ? ` - ${section}` : ''
  const sectionDesc = section ? ` Learn about ${section.toLowerCase()}.` : ''

  return generateSEOMetadata({
    title: `Documentation${sectionTitle}`,
    description: `Complete documentation for ContextDS design token extraction platform.${sectionDesc} API reference, guides, and integration examples.`,
    keywords: [
      "documentation",
      "API reference",
      "design token API",
      "integration guide",
      "developer docs"
    ],
    canonical: `https://contextds.com/docs${section ? `/${section.toLowerCase()}` : ''}`,
    image: "/images/og-docs.png"
  })
}

export function generatePricingMetadata(): Metadata {
  return generateSEOMetadata({
    title: "Pricing - Design Token Extraction Plans",
    description: "Flexible pricing for design token extraction. Free tier available. Premium features for teams and enterprise. Pay-as-you-scale analysis.",
    keywords: [
      "pricing",
      "design token pricing",
      "subscription plans",
      "free tier",
      "enterprise pricing"
    ],
    canonical: "https://contextds.com/pricing",
    image: "/images/og-pricing.png"
  })
}

export function generateAPIMetadata(): Metadata {
  return generateSEOMetadata({
    title: "API Reference - Design Token Extraction API",
    description: "RESTful API for programmatic design token extraction. Integrate ContextDS into your workflow with our comprehensive API.",
    keywords: [
      "API",
      "REST API",
      "design token API",
      "programmatic access",
      "API documentation",
      "developer tools"
    ],
    canonical: "https://contextds.com/api",
    image: "/images/og-api.png"
  })
}

/**
 * Generate meta tags for dynamic routes
 */
export function generateDynamicMetadata(
  pageType: 'site' | 'scan-result' | 'community-site',
  data: Record<string, any>
): Metadata {
  switch (pageType) {
    case 'site':
      return generateSiteMetadata(data as SiteMetadata & { domain: string })

    case 'scan-result':
      return generateSEOMetadata({
        title: `Scan Results - ${data.domain}`,
        description: `Design token extraction results for ${data.domain}. ${data.tokens || 0} tokens found across ${data.categories?.length || 0} categories.`,
        canonical: `https://contextds.com/scan/${data.domain}`,
        robots: "index, follow",
        image: `/api/og/scan-result?domain=${encodeURIComponent(data.domain)}`
      })

    case 'community-site':
      return generateSiteMetadata(data as SiteMetadata & { domain: string })

    default:
      return generateHomepageMetadata()
  }
}

/**
 * Generate canonical URL with proper domain handling
 */
export function getCanonicalUrl(path: string): string {
  const baseUrl = process.env.NODE_ENV === 'production'
    ? 'https://contextds.com'
    : 'http://localhost:3000'

  // Ensure path starts with /
  const normalizedPath = path.startsWith('/') ? path : `/${path}`

  return `${baseUrl}${normalizedPath}`
}

/**
 * Generate structured breadcrumbs for meta tags
 */
export function generateBreadcrumbs(path: string): Array<{ name: string; url: string }> {
  const segments = path.split('/').filter(Boolean)
  const breadcrumbs = [{ name: 'Home', url: 'https://contextds.com' }]

  let currentPath = ''

  for (const segment of segments) {
    currentPath += `/${segment}`

    // Convert segment to readable name
    const name = segment
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')

    breadcrumbs.push({
      name,
      url: `https://contextds.com${currentPath}`
    })
  }

  return breadcrumbs
}