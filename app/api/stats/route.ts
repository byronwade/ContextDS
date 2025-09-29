import { NextResponse } from 'next/server'
import { db, sites, tokenSets, scans } from '@/lib/db'
import { count, sql, desc, eq } from 'drizzle-orm'

export async function GET() {
  try {
    console.log('📊 Loading database statistics...')

    // Get basic counts
    const [siteCount] = await db.select({ count: count() }).from(sites)
    const [tokenSetCount] = await db.select({ count: count() }).from(tokenSets)
    const [scanCount] = await db.select({ count: count() }).from(scans)

    // Get recent activity
    const recentScans = await db
      .select({
        id: scans.id,
        domain: sites.domain,
        finishedAt: scans.finishedAt,
        tokenCount: sql<number>`
          COALESCE(
            (SELECT COUNT(*) FROM ${tokenSets} WHERE ${tokenSets.scanId} = ${scans.id}),
            0
          )
        `
      })
      .from(scans)
      .leftJoin(sites, eq(scans.siteId, sites.id))
      .where(sql`${scans.finishedAt} IS NOT NULL`)
      .orderBy(desc(scans.finishedAt))
      .limit(10)

    // Get popular sites
    const popularSites = await db
      .select({
        domain: sites.domain,
        popularity: sites.popularity,
        lastScanned: sites.lastScanned,
        tokenCount: sql<number>`
          COALESCE(
            (SELECT COUNT(*) FROM ${tokenSets} WHERE ${tokenSets.siteId} = ${sites.id}),
            0
          )
        `
      })
      .from(sites)
      .orderBy(desc(sites.popularity))
      .limit(5)

    // Calculate token statistics by extracting from JSON
    const tokenStats = await db
      .select({
        tokensJson: tokenSets.tokensJson,
        consensusScore: tokenSets.consensusScore
      })
      .from(tokenSets)
      .where(eq(tokenSets.isPublic, true))

    // Process token statistics
    const categoryStats = {
      colors: 0,
      typography: 0,
      spacing: 0,
      shadows: 0,
      radius: 0,
      motion: 0
    }

    let totalTokens = 0
    let totalConfidence = 0
    let confidenceCount = 0

    type TokenStatsRow = {
      tokensJson: unknown
      consensusScore: string | number | null
    }

    ;(tokenStats as TokenStatsRow[]).forEach((tokenSet) => {
      if (!isRecord(tokenSet.tokensJson)) {
        return
      }

      const tokensRecord = tokenSet.tokensJson as Record<string, unknown>

      const colorCount = countTokenGroup(tokensRecord['color'])
      const typographyCount = countTokenGroup(tokensRecord['typography'])
      const spacingCount = countTokenGroup(tokensRecord['dimension'])
      const shadowCount = countTokenGroup(tokensRecord['shadow'])

      categoryStats.colors += colorCount
      categoryStats.typography += typographyCount
      categoryStats.spacing += spacingCount
      categoryStats.shadows += shadowCount

      totalTokens += colorCount + typographyCount + spacingCount + shadowCount

      if (tokenSet.consensusScore !== null && tokenSet.consensusScore !== undefined) {
        totalConfidence += toNumber(tokenSet.consensusScore)
        confidenceCount += 1
      }
    })

    const averageConfidence = confidenceCount > 0 ? totalConfidence / confidenceCount : 0

    const stats = {
      sites: toNumber(siteCount.count),
      tokens: totalTokens,
      scans: toNumber(scanCount.count),
      tokenSets: toNumber(tokenSetCount.count),
      categories: categoryStats,
      averageConfidence: Math.round(averageConfidence * 100),
      recentActivity: recentScans.map((scan) => ({
        domain: scan.domain,
        scannedAt: scan.finishedAt,
        tokens: toNumber(scan.tokenCount)
      })),
      popularSites: popularSites.map((site) => ({
        domain: site.domain,
        popularity: site.popularity ?? 0,
        tokens: toNumber(site.tokenCount),
        lastScanned: site.lastScanned
      }))
    }

    console.log(`✅ Database stats: ${stats.sites} sites, ${stats.tokens} tokens, ${stats.scans} scans`)

    return NextResponse.json(stats)

  } catch (error) {
    console.error('❌ Failed to load database statistics:', error)

    // Return empty stats on error
    return NextResponse.json({
      sites: 0,
      tokens: 0,
      scans: 0,
      tokenSets: 0,
      categories: { colors: 0, typography: 0, spacing: 0, shadows: 0, radius: 0, motion: 0 },
      averageConfidence: 0,
      recentActivity: [],
      popularSites: [],
      error: error instanceof Error ? error.message : 'Stats loading failed'
    })
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function countTokenGroup(value: unknown): number {
  return isRecord(value) ? Object.keys(value).length : 0
}

function toNumber(value: unknown, fallback = 0): number {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : fallback
}
