import { NextResponse } from 'next/server'
import { getDb, tokenSets, sites } from '@/lib/db'
import { desc, isNotNull, eq } from 'drizzle-orm'

// Removed edge runtime to support database connections

export async function GET() {
  try {
    const db = await getDb()

    // Skip during build time
    if (process.env.CONTEXTDS_USE_BUILD_STUB === 'true') {
      return NextResponse.json([])
    }

    // Fetch recent token sets with site domain, then extract colors in JS
    const tokenSetRows = await db
      .select({
        tokensJson: tokenSets.tokensJson,
        createdAt: tokenSets.createdAt,
        domain: sites.domain,
      })
      .from(tokenSets)
      .innerJoin(sites, eq(tokenSets.siteId, sites.id))
      .where(isNotNull(tokenSets.tokensJson))
      .orderBy(desc(tokenSets.createdAt))
      .limit(50)

    const hexColorRe = /^#[0-9A-Fa-f]{6}$/
    const colorMap = new Map<string, { name: string; value: string; siteDomain: string | null; createdAt: Date | null }>()

    for (const row of tokenSetRows) {
      const tj = row.tokensJson as any
      const colorObj = tj?.color
      if (!colorObj || typeof colorObj !== 'object') continue
      for (const [key, val] of Object.entries(colorObj)) {
        const rawValue = typeof val === 'string' ? val : (val as any)?.$value
        if (typeof rawValue === 'string' && hexColorRe.test(rawValue)) {
          if (!colorMap.has(key)) {
            colorMap.set(key, { name: key, value: rawValue, siteDomain: row.domain, createdAt: row.createdAt })
          }
        }
      }
      if (colorMap.size >= 20) break
    }

    const colors = Array.from(colorMap.values()).slice(0, 20)

    return NextResponse.json(colors, {
      headers: {
        'Cache-Control': 'public, max-age=30, stale-while-revalidate=60',
        'Content-Type': 'application/json'
      }
    })
  } catch (error) {
    console.error('Recent colors API error:', error)

    // Return fallback colors
    return NextResponse.json([
      { name: 'primary', value: '#0070f3', siteDomain: 'vercel.com', createdAt: new Date().toISOString() },
      { name: 'secondary', value: '#7928ca', siteDomain: 'github.com', createdAt: new Date().toISOString() },
      { name: 'accent', value: '#ff0080', siteDomain: 'stripe.com', createdAt: new Date().toISOString() },
      { name: 'success', value: '#50e3c2', siteDomain: 'linear.app', createdAt: new Date().toISOString() }
    ])
  }
}