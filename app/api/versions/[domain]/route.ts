import { NextRequest, NextResponse } from 'next/server'
import { db, tokenSets, tokenVersions, sites } from '@/lib/db'
import { eq, desc } from 'drizzle-orm'

/**
 * GET /api/versions/[domain]
 * List all versions for a domain
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { domain: string } }
) {
  try {
    const domain = decodeURIComponent(params.domain)

    // Find site
    const [site] = await db
      .select()
      .from(sites)
      .where(eq(sites.domain, domain))
      .limit(1)

    if (!site) {
      return NextResponse.json(
        { error: 'Site not found' },
        { status: 404 }
      )
    }

    // Get all token sets for this site with version info
    const versions = await db
      .select({
        id: tokenSets.id,
        versionNumber: tokenSets.versionNumber,
        createdAt: tokenSets.createdAt,
        tokensJson: tokenSets.tokensJson,
        packJson: tokenSets.packJson,
        consensusScore: tokenSets.consensusScore
      })
      .from(tokenSets)
      .where(eq(tokenSets.siteId, site.id))
      .orderBy(desc(tokenSets.versionNumber))

    // Count tokens in each version
    const versionsWithCounts = versions.map(v => ({
      id: v.id,
      versionNumber: v.versionNumber,
      createdAt: v.createdAt.toISOString(),
      tokenCount: countTokens(v.tokensJson),
      confidence: v.consensusScore ? parseFloat(v.consensusScore) * 100 : 0,
      isCurrent: v.versionNumber === versions[0]?.versionNumber
    }))

    return NextResponse.json({
      domain,
      siteId: site.id,
      versions: versionsWithCounts,
      totalVersions: versions.length
    })
  } catch (error) {
    console.error('Failed to fetch versions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch versions' },
      { status: 500 }
    )
  }
}

/**
 * Helper: Count tokens in a token set
 */
function countTokens(tokensJson: any): number {
  let count = 0

  function traverse(obj: any) {
    if (!obj || typeof obj !== 'object') return

    for (const [key, value] of Object.entries(obj)) {
      if (key.startsWith('$')) continue

      if (value && typeof value === 'object' && '$value' in value) {
        count++
      } else if (value && typeof value === 'object') {
        traverse(value)
      }
    }
  }

  traverse(tokensJson)
  return count
}