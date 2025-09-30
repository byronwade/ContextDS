import { MetadataRoute } from 'next'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://contextds.com'

  // Fetch dynamic sites from the community API
  let communitySites: Array<{ domain: string; lastScanned: string | null }> = []
  try {
    const response = await fetch(`${baseUrl}/api/community/sites?sort=votes&limit=1000`, {
      next: { revalidate: 3600 } // Revalidate every hour
    })
    if (response.ok) {
      const data = await response.json()
      communitySites = data.sites || []
    }
  } catch (error) {
    console.error('Error fetching sites for sitemap:', error)
  }

  // Static routes
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${baseUrl}/community`,
      lastModified: new Date(),
      changeFrequency: 'hourly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/scan`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/docs`,
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
    {
      url: `${baseUrl}/pricing`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.6,
    },
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

  // Dynamic community site routes
  const dynamicRoutes: MetadataRoute.Sitemap = communitySites.map((site) => ({
    url: `${baseUrl}/community/${encodeURIComponent(site.domain)}`,
    lastModified: site.lastScanned ? new Date(site.lastScanned) : new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.6,
  }))

  return [...staticRoutes, ...dynamicRoutes]
}