import { MetadataRoute } from 'next'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NODE_ENV === 'production'
    ? 'https://contextds.com'
    : 'http://localhost:3000'

  // Fetch dynamic sites from the community API with better error handling
  let communitySites: Array<{ domain: string; lastScanned: string | null; popularity?: number }> = []

  // Skip community sites during build time to prevent timeouts
  if (false) {
    try {
      const response = await fetch(`${baseUrl}/api/community/sites?sort=votes&limit=2000`, {
        next: { revalidate: 1800 }, // Revalidate every 30 minutes for better freshness
        headers: {
          'User-Agent': 'ContextDS-Sitemap-Generator/1.0'
        }
      })

      if (response.ok) {
        const data = await response.json()
        communitySites = data.sites || []
      }
    } catch (error) {
      console.error('Error fetching sites for sitemap:', error)
      // Fallback to empty array to prevent sitemap failure
    }
  }

  // Static routes with enhanced SEO priorities
  const staticRoutes: MetadataRoute.Sitemap = [
    // Core pages
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${baseUrl}/scan`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/community`,
      lastModified: new Date(),
      changeFrequency: 'hourly',
      priority: 0.9,
    },

    // Documentation and API
    {
      url: `${baseUrl}/docs`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/docs/getting-started`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/docs/api`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/docs/mcp-server`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/api`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.7,
    },

    // Business pages
    {
      url: `${baseUrl}/pricing`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.6,
    },
    {
      url: `${baseUrl}/about`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${baseUrl}/contact`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },

    // Features and capabilities
    {
      url: `${baseUrl}/features`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.6,
    },
    {
      url: `${baseUrl}/features/token-extraction`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.6,
    },
    {
      url: `${baseUrl}/features/layout-dna`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.6,
    },

    // Legal pages
    {
      url: `${baseUrl}/privacy`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.3,
    },
    {
      url: `${baseUrl}/terms`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.3,
    },
  ]

  // Dynamic community site routes with enhanced prioritization
  const dynamicRoutes: MetadataRoute.Sitemap = communitySites.map((site) => {
    // Calculate priority based on popularity and recency
    let priority = 0.6
    if (site.popularity && site.popularity > 100) priority = 0.7
    if (site.popularity && site.popularity > 500) priority = 0.8

    // Boost priority for recently scanned sites
    const lastScanned = site.lastScanned ? new Date(site.lastScanned) : new Date()
    const daysSinceScanned = (Date.now() - lastScanned.getTime()) / (1000 * 60 * 60 * 24)
    if (daysSinceScanned < 7) priority = Math.min(priority + 0.1, 0.9)

    return {
      url: `${baseUrl}/community/${encodeURIComponent(site.domain)}`,
      lastModified: lastScanned,
      changeFrequency: daysSinceScanned < 30 ? 'weekly' as const : 'monthly' as const,
      priority,
    }
  })

  // Site-specific token routes for high-value sites
  const tokenRoutes: MetadataRoute.Sitemap = communitySites
    .filter(site => site.popularity && site.popularity > 200)
    .slice(0, 100) // Limit to top 100 to avoid huge sitemaps
    .map((site) => ({
      url: `${baseUrl}/site/${encodeURIComponent(site.domain)}`,
      lastModified: site.lastScanned ? new Date(site.lastScanned) : new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    }))

  return [...staticRoutes, ...dynamicRoutes, ...tokenRoutes]
}