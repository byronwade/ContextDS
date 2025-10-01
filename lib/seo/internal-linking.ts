/**
 * Internal Linking Strategy for ContextDS
 * Comprehensive internal linking system for improved SEO and user experience
 */

export interface InternalLink {
  href: string
  text: string
  title?: string
  priority: 'high' | 'medium' | 'low'
  category: 'product' | 'feature' | 'resource' | 'community' | 'help'
  context?: string
}

export interface LinkingContext {
  currentPath: string
  pageType: 'homepage' | 'scan' | 'community' | 'site' | 'docs' | 'pricing' | 'feature'
  userIntent?: 'discover' | 'analyze' | 'learn' | 'integrate'
  siteData?: {
    domain: string
    categories: string[]
    popularity: number
  }
}

/**
 * Core navigation links - highest priority for internal linking
 */
export const CORE_NAVIGATION_LINKS: InternalLink[] = [
  {
    href: '/',
    text: 'ContextDS Home',
    title: 'Extract design tokens from any website - ContextDS',
    priority: 'high',
    category: 'product'
  },
  {
    href: '/scan',
    text: 'Scan Website',
    title: 'Extract design tokens from any website URL',
    priority: 'high',
    category: 'product'
  },
  {
    href: '/community',
    text: 'Design Token Directory',
    title: 'Browse design tokens from popular websites',
    priority: 'high',
    category: 'community'
  },
  {
    href: '/docs',
    text: 'Documentation',
    title: 'Complete guide to ContextDS design token extraction',
    priority: 'high',
    category: 'resource'
  },
  {
    href: '/api',
    text: 'API Reference',
    title: 'RESTful API for programmatic design token extraction',
    priority: 'high',
    category: 'resource'
  }
]

/**
 * Feature-specific links for targeted internal linking
 */
export const FEATURE_LINKS: InternalLink[] = [
  {
    href: '/features/token-extraction',
    text: 'Design Token Extraction',
    title: 'AI-powered CSS analysis and token extraction',
    priority: 'medium',
    category: 'feature',
    context: 'Learn how our AI extracts design tokens from any website'
  },
  {
    href: '/features/layout-dna',
    text: 'Layout DNA Analysis',
    title: 'Multi-breakpoint layout pattern analysis',
    priority: 'medium',
    category: 'feature',
    context: 'Analyze layout patterns across different screen sizes'
  },
  {
    href: '/features/w3c-tokens',
    text: 'W3C Design Tokens',
    title: 'Standards-compliant design token format export',
    priority: 'medium',
    category: 'feature',
    context: 'Export tokens in the W3C Design Tokens Community Group format'
  },
  {
    href: '/features/mcp-server',
    text: 'MCP Server Integration',
    title: 'Model Context Protocol server for AI agents',
    priority: 'medium',
    category: 'feature',
    context: 'Integrate ContextDS with Claude and other AI agents'
  }
]

/**
 * Resource and help links
 */
export const RESOURCE_LINKS: InternalLink[] = [
  {
    href: '/docs/getting-started',
    text: 'Getting Started Guide',
    title: 'Quick start guide for extracting design tokens',
    priority: 'medium',
    category: 'help'
  },
  {
    href: '/docs/api/authentication',
    text: 'API Authentication',
    title: 'How to authenticate with the ContextDS API',
    priority: 'low',
    category: 'help'
  },
  {
    href: '/docs/examples',
    text: 'Examples & Use Cases',
    title: 'Real-world examples of design token extraction',
    priority: 'medium',
    category: 'help'
  },
  {
    href: '/pricing',
    text: 'Pricing Plans',
    title: 'Flexible pricing for design token extraction',
    priority: 'medium',
    category: 'product'
  }
]

/**
 * Generate contextual internal links based on current page and user intent
 */
export function generateContextualLinks(context: LinkingContext): InternalLink[] {
  const { currentPath, pageType, userIntent, siteData } = context
  const links: InternalLink[] = []

  // Always include core navigation (except current page)
  const coreLinks = CORE_NAVIGATION_LINKS.filter(link => link.href !== currentPath)
  links.push(...coreLinks)

  // Add contextual links based on page type
  switch (pageType) {
    case 'homepage':
      // Homepage should link to key features and popular community sites
      links.push(...FEATURE_LINKS.slice(0, 3))
      links.push(
        {
          href: '/community/stripe.com',
          text: 'Stripe Design Tokens',
          title: 'Explore design tokens extracted from Stripe.com',
          priority: 'medium',
          category: 'community'
        },
        {
          href: '/community/github.com',
          text: 'GitHub Design System',
          title: 'Browse GitHub\'s design tokens and components',
          priority: 'medium',
          category: 'community'
        }
      )
      break

    case 'scan':
      // Scan page should promote features and examples
      links.push(...FEATURE_LINKS)
      links.push(
        {
          href: '/docs/scan-api',
          text: 'Scan API Documentation',
          title: 'Programmatic website scanning for design tokens',
          priority: 'high',
          category: 'resource'
        }
      )
      break

    case 'community':
      // Community should link to popular sites and related features
      links.push(
        {
          href: '/features/token-extraction',
          text: 'How Token Extraction Works',
          title: 'Learn about our AI-powered extraction process',
          priority: 'high',
          category: 'feature'
        },
        {
          href: '/scan',
          text: 'Extract Your Own Tokens',
          title: 'Scan any website to extract design tokens',
          priority: 'high',
          category: 'product'
        }
      )
      break

    case 'site':
      // Site pages should promote related sites and extraction features
      if (siteData) {
        // Link to similar sites in the same categories
        siteData.categories.forEach(category => {
          links.push({
            href: `/community?category=${category}`,
            text: `${category} Design Systems`,
            title: `Explore other ${category} design systems`,
            priority: 'medium',
            category: 'community'
          })
        })

        // Link to scan functionality
        links.push({
          href: `/scan?url=${siteData.domain}`,
          text: `Re-scan ${siteData.domain}`,
          title: `Extract latest design tokens from ${siteData.domain}`,
          priority: 'high',
          category: 'product'
        })
      }
      break

    case 'docs':
      // Documentation should cross-link between sections
      links.push(...RESOURCE_LINKS)
      break
  }

  // Add intent-based links
  if (userIntent) {
    switch (userIntent) {
      case 'discover':
        links.push({
          href: '/community',
          text: 'Discover Design Systems',
          title: 'Browse design tokens from popular websites',
          priority: 'high',
          category: 'community'
        })
        break

      case 'analyze':
        links.push({
          href: '/features/layout-dna',
          text: 'Layout Analysis',
          title: 'Deep analysis of layout patterns and component structure',
          priority: 'high',
          category: 'feature'
        })
        break

      case 'learn':
        links.push(...RESOURCE_LINKS.filter(link => link.category === 'help'))
        break

      case 'integrate':
        links.push({
          href: '/docs/api',
          text: 'API Integration Guide',
          title: 'Integrate ContextDS into your development workflow',
          priority: 'high',
          category: 'resource'
        })
        break
    }
  }

  // Remove duplicates and sort by priority
  const uniqueLinks = links.filter((link, index, self) =>
    index === self.findIndex(l => l.href === link.href)
  )

  return uniqueLinks.sort((a, b) => {
    const priorityOrder = { high: 3, medium: 2, low: 1 }
    return priorityOrder[b.priority] - priorityOrder[a.priority]
  })
}

/**
 * Generate breadcrumb navigation for SEO
 */
export function generateBreadcrumbs(path: string): Array<{ name: string; href: string }> {
  const segments = path.split('/').filter(Boolean)
  const breadcrumbs = [{ name: 'Home', href: '/' }]

  let currentPath = ''

  const segmentNames: Record<string, string> = {
    community: 'Community',
    scan: 'Scan',
    docs: 'Documentation',
    api: 'API',
    features: 'Features',
    pricing: 'Pricing',
    about: 'About',
    contact: 'Contact'
  }

  for (let i = 0; i < segments.length; i++) {
    currentPath += `/${segments[i]}`
    const segment = segments[i]

    // Handle special cases
    if (i === 1 && segments[0] === 'community') {
      // Community site pages
      breadcrumbs.push({
        name: decodeURIComponent(segment),
        href: currentPath
      })
    } else {
      // Regular pages
      const name = segmentNames[segment] || segment
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ')

      breadcrumbs.push({
        name,
        href: currentPath
      })
    }
  }

  return breadcrumbs
}

/**
 * Generate related links based on content analysis
 */
export function generateRelatedLinks(
  currentContent: {
    title: string
    description: string
    keywords: string[]
    category?: string
  },
  allPages: Array<{
    href: string
    title: string
    description: string
    keywords: string[]
    category?: string
  }>
): InternalLink[] {
  const relatedLinks: InternalLink[] = []

  // Score pages based on keyword overlap and category match
  const scoredPages = allPages.map(page => {
    let score = 0

    // Category match (highest weight)
    if (currentContent.category && page.category === currentContent.category) {
      score += 10
    }

    // Keyword overlap
    const keywordOverlap = currentContent.keywords.filter(keyword =>
      page.keywords.some(pageKeyword =>
        pageKeyword.toLowerCase().includes(keyword.toLowerCase()) ||
        keyword.toLowerCase().includes(pageKeyword.toLowerCase())
      )
    )
    score += keywordOverlap.length * 2

    // Title/description similarity (basic)
    if (page.title.toLowerCase().includes('design') && currentContent.title.toLowerCase().includes('design')) {
      score += 1
    }

    return { ...page, score }
  })

  // Select top related pages
  const topPages = scoredPages
    .filter(page => page.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)

  topPages.forEach(page => {
    relatedLinks.push({
      href: page.href,
      text: page.title,
      title: page.description,
      priority: page.score > 5 ? 'high' : 'medium',
      category: (page.category as any) || 'resource'
    })
  })

  return relatedLinks
}

/**
 * Generate anchor links for better page navigation
 */
export function generateAnchorLinks(headings: Array<{ id: string; text: string; level: number }>): InternalLink[] {
  return headings
    .filter(heading => heading.level <= 3) // Only H1, H2, H3
    .map(heading => ({
      href: `#${heading.id}`,
      text: heading.text,
      title: `Jump to ${heading.text} section`,
      priority: heading.level === 2 ? 'medium' : 'low',
      category: 'resource'
    }))
}

/**
 * Track internal link clicks for SEO analysis
 */
export function trackInternalLinkClick(href: string, text: string, context: string) {
  if (typeof window !== 'undefined' && 'gtag' in window) {
    ;(window as any).gtag('event', 'internal_link_click', {
      event_category: 'Internal Navigation',
      event_label: href,
      value: 1,
      custom_parameter_1: text,
      custom_parameter_2: context
    })
  }

  // Send to analytics API
  fetch('/api/analytics/internal-links', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      href,
      text,
      context,
      referrer: window.location.href,
      timestamp: Date.now()
    })
  }).catch(console.error)
}

/**
 * Automated internal linking component
 */
export function enhanceContentWithLinks(
  content: string,
  availableLinks: InternalLink[]
): string {
  let enhancedContent = content

  // Find potential linking opportunities
  availableLinks.forEach(link => {
    const linkText = link.text.toLowerCase()
    const regex = new RegExp(`\\b${linkText}\\b`, 'gi')

    // Only link first occurrence to avoid over-linking
    if (enhancedContent.toLowerCase().includes(linkText) && !enhancedContent.includes(`href="${link.href}"`)) {
      enhancedContent = enhancedContent.replace(regex, (match) =>
        `<a href="${link.href}" title="${link.title || link.text}" class="internal-link">${match}</a>`
      )
    }
  })

  return enhancedContent
}