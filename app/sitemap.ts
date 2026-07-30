import type { MetadataRoute } from 'next'
import { listSites } from '@/lib/storage/serverless-store'

const BASE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ||
  'https://designcontracts.sh'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  let communitySites: Array<{ domain: string; lastScanned: string | null; popularity?: number }> =
    []

  try {
    const sites = await listSites({ sort: 'popular', limit: 500 })
    communitySites = sites.map((site) => ({
      domain: site.domain,
      lastScanned: site.lastScanned,
      popularity: site.popularity,
    }))
  } catch (error) {
    console.error('Error loading sites for sitemap:', error)
  }

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: BASE_URL, lastModified: new Date(), changeFrequency: 'daily', priority: 1.0 },
    { url: `${BASE_URL}/scan`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.9 },
    {
      url: `${BASE_URL}/agent`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.85,
    },
    {
      url: `${BASE_URL}/community`,
      lastModified: new Date(),
      changeFrequency: 'hourly',
      priority: 0.8,
    },
    { url: `${BASE_URL}/docs`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.7 },
    {
      url: `${BASE_URL}/features`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.6,
    },
    {
      url: `${BASE_URL}/pricing`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.6,
    },
    {
      url: `${BASE_URL}/about`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${BASE_URL}/contact`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${BASE_URL}/privacy`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.3,
    },
    {
      url: `${BASE_URL}/terms`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.3,
    },
  ]

  const siteRoutes: MetadataRoute.Sitemap = communitySites.map((site) => ({
    url: `${BASE_URL}/site/${encodeURIComponent(site.domain)}`,
    lastModified: site.lastScanned ? new Date(site.lastScanned) : new Date(),
    changeFrequency: 'weekly' as const,
    priority: site.popularity && site.popularity > 50 ? 0.75 : 0.65,
  }))

  return [...staticRoutes, ...siteRoutes]
}
