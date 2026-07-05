import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { sites, tokenSets, scans } from '@/lib/db/schema'
import { count, sql, isNotNull, eq, and } from 'drizzle-orm'

/**
 * Ultra-fast real-time stats endpoint
 * Optimized for header display with Neon's connection pooling
 * No caching - always fresh data
 */
export async function GET() {
  try {
    const db = await getDb()

    // Skip during build time
    if (!process.env.DATABASE_URL && !process.env.DB) {
      return NextResponse.json({
        sites: 0,
        tokens: 0,
        scans: 0
      })
    }

    console.log('🔴 Live stats query...')
    const startTime = Date.now()

    // Parallel queries for maximum speed
    const [siteCount, scanCount, tokenSetRows] = await Promise.all([
      db.select({ count: count() }).from(sites),
      db.select({ count: count() }).from(scans),
      db.select({ tokensJson: tokenSets.tokensJson })
        .from(tokenSets)
        .where(and(eq(tokenSets.isPublic, true), isNotNull(tokenSets.tokensJson)))
    ])

    // Count tokens in JS (SQLite has no jsonb_object_keys)
    let totalTokens = 0
    for (const row of tokenSetRows) {
      const tj = row.tokensJson as any
      if (!tj || typeof tj !== 'object') continue
      for (const cat of ['color', 'typography', 'dimension', 'shadow', 'radius', 'motion']) {
        if (tj[cat] && typeof tj[cat] === 'object') {
          totalTokens += Object.keys(tj[cat]).length
        }
      }
    }

    const queryTime = Date.now() - startTime

    const result = {
      sites: Number(siteCount[0]?.count || 0),
      scans: Number(scanCount[0]?.count || 0),
      tokens: totalTokens,
      queryTime,
      timestamp: new Date().toISOString()
    }

    console.log(`✅ Live stats: ${result.sites} sites, ${result.tokens} tokens, ${result.scans} scans (${queryTime}ms)`)

    return NextResponse.json(result, {
      headers: {
        'Cache-Control': 'no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    })

  } catch (error) {
    console.error('❌ Realtime stats failed:', error)

    return NextResponse.json({
      sites: 0,
      tokens: 0,
      scans: 0,
      error: 'Stats unavailable'
    }, {
      headers: {
        'Cache-Control': 'no-store'
      }
    })
  }
}