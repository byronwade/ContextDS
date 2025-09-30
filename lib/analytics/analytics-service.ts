/**
 * Analytics Service
 * Easy-to-use functions for extracting any metric from any corner of the database
 */

import { db } from '@/lib/db'
import { sql, eq, desc, and, gte, lte, count, avg, sum } from 'drizzle-orm'
import {
  analyticsEvents,
  tokenAnalytics,
  domainAnalytics,
  searchAnalytics,
  vercelAnalytics,
  type NewAnalyticsEvent,
  type NewSearchAnalytic
} from '@/lib/db/analytics-schema'
import { sites, tokenSets, scans } from '@/lib/db/schema'

// ============================================================================
// EVENT TRACKING
// ============================================================================

export async function trackEvent(event: NewAnalyticsEvent) {
  return await db.insert(analyticsEvents).values(event).returning()
}

export async function trackPageView(url: string, sessionId: string, properties?: any) {
  return await trackEvent({
    eventType: 'page_view',
    eventName: 'Page Viewed',
    url,
    sessionId,
    properties
  })
}

export async function trackSearch(query: string, sessionId: string, userId?: string) {
  const normalized = query.toLowerCase().trim()

  return await db.insert(searchAnalytics).values({
    query,
    queryNormalized: normalized,
    sessionId,
    userId: userId || null
  }).returning()
}

// ============================================================================
// TOKEN ANALYTICS QUERIES
// ============================================================================

/**
 * Get sites with neutral colors
 */
export async function getSitesWithNeutralColors(minCount: number = 5) {
  return await db
    .select({
      domain: sites.domain,
      neutralColors: tokenAnalytics.neutralColors,
      totalColors: tokenAnalytics.totalColors,
      percentage: sql<number>`ROUND((${tokenAnalytics.neutralColors}::DECIMAL / NULLIF(${tokenAnalytics.totalColors}, 0)) * 100, 2)`
    })
    .from(tokenAnalytics)
    .innerJoin(sites, eq(tokenAnalytics.siteId, sites.id))
    .where(gte(tokenAnalytics.neutralColors, minCount))
    .orderBy(desc(tokenAnalytics.neutralColors))
}

/**
 * Get sites with specific color (e.g., blue)
 */
export async function getSitesByColorType(colorType: 'blue' | 'red' | 'green', minCount: number = 1) {
  const colorField = colorType === 'blue' ? tokenAnalytics.blueColors :
                     colorType === 'red' ? tokenAnalytics.redColors :
                     tokenAnalytics.greenColors

  return await db
    .select({
      domain: sites.domain,
      colorCount: colorField,
      totalColors: tokenAnalytics.totalColors,
      siteId: sites.id
    })
    .from(tokenAnalytics)
    .innerJoin(sites, eq(tokenAnalytics.siteId, sites.id))
    .where(gte(colorField, minCount))
    .orderBy(desc(colorField))
}

/**
 * Get sites with rounded corners
 */
export async function getSitesWithRoundedCorners() {
  return await db
    .select({
      domain: sites.domain,
      roundedCorners: tokenAnalytics.roundedCorners,
      pillCorners: tokenAnalytics.pillCorners,
      sharpCorners: tokenAnalytics.sharpCorners,
      totalRadius: tokenAnalytics.totalRadiusValues
    })
    .from(tokenAnalytics)
    .innerJoin(sites, eq(tokenAnalytics.siteId, sites.id))
    .where(gte(tokenAnalytics.roundedCorners, 1))
    .orderBy(desc(tokenAnalytics.roundedCorners))
}

/**
 * Get design system maturity scores
 */
export async function getDesignSystemMaturity() {
  return await db
    .select({
      domain: sites.domain,
      maturityScore: tokenAnalytics.maturityScore,
      consistencyScore: tokenAnalytics.consistencyScore,
      totalTokens: sql<number>`(${tokenAnalytics.totalColors} + ${tokenAnalytics.totalFonts} + ${tokenAnalytics.totalSpacingValues})`
    })
    .from(tokenAnalytics)
    .innerJoin(sites, eq(tokenAnalytics.siteId, sites.id))
    .orderBy(desc(tokenAnalytics.maturityScore))
}

// ============================================================================
// DOMAIN ANALYTICS QUERIES
// ============================================================================

/**
 * Get domains by TLD (e.g., .com, .org)
 */
export async function getDomainsByTLD(tld: string) {
  return await db
    .select()
    .from(domainAnalytics)
    .where(eq(domainAnalytics.tld, tld))
    .orderBy(desc(domainAnalytics.viewCount))
}

/**
 * Get all TLD statistics
 */
export async function getTLDStatistics() {
  return await db
    .select({
      tld: domainAnalytics.tld,
      domainCount: count(),
      totalScans: sum(domainAnalytics.totalScans),
      avgTokens: avg(domainAnalytics.avgTokensExtracted)
    })
    .from(domainAnalytics)
    .groupBy(domainAnalytics.tld)
    .orderBy(desc(count()))
}

/**
 * Get most searched websites
 */
export async function getMostSearchedWebsites(limit: number = 100) {
  return await db
    .select()
    .from(domainAnalytics)
    .orderBy(desc(domainAnalytics.searchCount))
    .limit(limit)
}

/**
 * Get most viewed websites
 */
export async function getMostViewedWebsites(limit: number = 100) {
  return await db
    .select()
    .from(domainAnalytics)
    .orderBy(desc(domainAnalytics.viewCount))
    .limit(limit)
}

// ============================================================================
// SEARCH ANALYTICS QUERIES
// ============================================================================

/**
 * Get search trends for a period
 */
export async function getSearchTrends(days: number = 30) {
  const since = new Date()
  since.setDate(since.getDate() - days)

  return await db
    .select({
      query: searchAnalytics.queryNormalized,
      searchCount: count(),
      avgResults: avg(searchAnalytics.resultsCount),
      clickThroughRate: sql<number>`
        ROUND((COUNT(*) FILTER (WHERE ${searchAnalytics.clickedSiteId} IS NOT NULL)::DECIMAL / COUNT(*)) * 100, 2)
      `
    })
    .from(searchAnalytics)
    .where(gte(searchAnalytics.createdAt, since))
    .groupBy(searchAnalytics.queryNormalized)
    .orderBy(desc(count()))
    .limit(100)
}

/**
 * Get searches for a specific website
 */
export async function getSearchesForWebsite(domain: string) {
  return await db
    .select({
      query: searchAnalytics.query,
      count: count(),
      lastSearched: sql<Date>`MAX(${searchAnalytics.createdAt})`
    })
    .from(searchAnalytics)
    .where(sql`${searchAnalytics.query} ILIKE ${'%' + domain + '%'}`)
    .groupBy(searchAnalytics.query)
    .orderBy(desc(count()))
}

// ============================================================================
// VERCEL ANALYTICS QUERIES
// ============================================================================

/**
 * Get performance metrics for a page
 */
export async function getPagePerformanceMetrics(pageUrl: string, days: number = 30) {
  const since = new Date()
  since.setDate(since.getDate() - days)

  return await db
    .select({
      avgCLS: avg(vercelAnalytics.cls),
      avgFCP: avg(vercelAnalytics.fcp),
      avgLCP: avg(vercelAnalytics.lcp),
      avgTTFB: avg(vercelAnalytics.ttfb),
      avgINP: avg(vercelAnalytics.inp),
      sampleSize: count()
    })
    .from(vercelAnalytics)
    .where(and(
      eq(vercelAnalytics.pageUrl, pageUrl),
      gte(vercelAnalytics.createdAt, since)
    ))
}

/**
 * Get geographic distribution
 */
export async function getGeographicDistribution(days: number = 30) {
  const since = new Date()
  since.setDate(since.getDate() - days)

  return await db
    .select({
      country: vercelAnalytics.country,
      visitors: count(),
      avgLCP: avg(vercelAnalytics.lcp)
    })
    .from(vercelAnalytics)
    .where(gte(vercelAnalytics.createdAt, since))
    .groupBy(vercelAnalytics.country)
    .orderBy(desc(count()))
}

/**
 * Get device distribution
 */
export async function getDeviceDistribution(days: number = 30) {
  const since = new Date()
  since.setDate(since.getDate() - days)

  return await db
    .select({
      deviceType: vercelAnalytics.deviceType,
      count: count(),
      avgLCP: avg(vercelAnalytics.lcp),
      avgFCP: avg(vercelAnalytics.fcp)
    })
    .from(vercelAnalytics)
    .where(gte(vercelAnalytics.createdAt, since))
    .groupBy(vercelAnalytics.deviceType)
    .orderBy(desc(count()))
}

// ============================================================================
// COMPLEX ANALYTICS QUERIES
// ============================================================================

/**
 * Get comprehensive site analytics
 */
export async function getSiteAnalytics(domain: string) {
  const [siteData] = await db
    .select()
    .from(sites)
    .where(eq(sites.domain, domain))
    .limit(1)

  if (!siteData) return null

  const [domainStats] = await db
    .select()
    .from(domainAnalytics)
    .where(eq(domainAnalytics.domain, domain))
    .limit(1)

  const [tokenStats] = await db
    .select()
    .from(tokenAnalytics)
    .where(eq(tokenAnalytics.siteId, siteData.id))
    .orderBy(desc(tokenAnalytics.createdAt))
    .limit(1)

  const searches = await getSearchesForWebsite(domain)

  return {
    site: siteData,
    domain: domainStats,
    tokens: tokenStats,
    searches,
    searchCount: searches.reduce((sum, s) => sum + Number(s.count), 0)
  }
}

/**
 * Get dashboard overview statistics
 */
export async function getDashboardOverview() {
  const [totalSites] = await db.select({ count: count() }).from(sites)
  const [totalScans] = await db.select({ count: count() }).from(scans)
  const [totalTokenSets] = await db.select({ count: count() }).from(tokenSets)

  const [avgTokens] = await db
    .select({
      avg: avg(tokenAnalytics.totalColors)
    })
    .from(tokenAnalytics)

  const recentScans = await db
    .select({
      domain: sites.domain,
      finishedAt: scans.finishedAt,
      tokensExtracted: sql<number>`(${tokenAnalytics.totalColors} + ${tokenAnalytics.totalFonts})`
    })
    .from(scans)
    .innerJoin(sites, eq(scans.siteId, sites.id))
    .leftJoin(tokenAnalytics, eq(tokenAnalytics.siteId, sites.id))
    .where(sql`${scans.finishedAt} IS NOT NULL`)
    .orderBy(desc(scans.finishedAt))
    .limit(10)

  return {
    totalSites: totalSites.count,
    totalScans: totalScans.count,
    totalTokenSets: totalTokenSets.count,
    avgTokensPerSite: Number(avgTokens.avg || 0),
    recentScans
  }
}

/**
 * Get token distribution statistics
 */
export async function getTokenDistribution() {
  const colorStats = await db
    .select({
      avg: avg(tokenAnalytics.totalColors),
      min: sql<number>`MIN(${tokenAnalytics.totalColors})`,
      max: sql<number>`MAX(${tokenAnalytics.totalColors})`,
      stddev: sql<number>`STDDEV(${tokenAnalytics.totalColors})`
    })
    .from(tokenAnalytics)

  const fontStats = await db
    .select({
      avg: avg(tokenAnalytics.totalFonts),
      min: sql<number>`MIN(${tokenAnalytics.totalFonts})`,
      max: sql<number>`MAX(${tokenAnalytics.totalFonts})`
    })
    .from(tokenAnalytics)

  return {
    colors: colorStats[0],
    fonts: fontStats[0]
  }
}

// ============================================================================
// REFRESH MATERIALIZED VIEWS
// ============================================================================

export async function refreshAnalyticsViews() {
  await db.execute(sql`SELECT refresh_analytics_views()`)
}

// ============================================================================
// EXPORTS
// ============================================================================

export const analytics = {
  // Event tracking
  trackEvent,
  trackPageView,
  trackSearch,

  // Token analytics
  getSitesWithNeutralColors,
  getSitesByColorType,
  getSitesWithRoundedCorners,
  getDesignSystemMaturity,

  // Domain analytics
  getDomainsByTLD,
  getTLDStatistics,
  getMostSearchedWebsites,
  getMostViewedWebsites,

  // Search analytics
  getSearchTrends,
  getSearchesForWebsite,

  // Vercel analytics
  getPagePerformanceMetrics,
  getGeographicDistribution,
  getDeviceDistribution,

  // Complex queries
  getSiteAnalytics,
  getDashboardOverview,
  getTokenDistribution,

  // Maintenance
  refreshAnalyticsViews
}