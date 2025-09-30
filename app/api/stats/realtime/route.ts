import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { sites, tokenSets, scans } from '@/lib/db/schema'
import { count, sql } from 'drizzle-orm'

/**
 * Ultra-fast real-time stats endpoint
 * Optimized for header display with Neon's connection pooling
 * No caching - always fresh data
 */
export async function GET() {
  try {
    // Skip during build time
    if (!process.env.DATABASE_URL) {
      return NextResponse.json({
        sites: 0,
        tokens: 0,
        scans: 0
      })
    }

    console.log('🔴 Live stats query...')
    const startTime = Date.now()

    // Parallel queries for maximum speed
    const [siteCount, scanCount, tokenCount] = await Promise.all([
      // Count sites
      db.select({ count: count() }).from(sites),

      // Count scans
      db.select({ count: count() }).from(scans),

      // Fast token count using database aggregation
      db.execute(sql`
        SELECT
          (
            SUM(
              COALESCE((SELECT COUNT(*) FROM jsonb_object_keys(tokens_json->'color')), 0) +
              COALESCE((SELECT COUNT(*) FROM jsonb_object_keys(tokens_json->'typography')), 0) +
              COALESCE((SELECT COUNT(*) FROM jsonb_object_keys(tokens_json->'dimension')), 0) +
              COALESCE((SELECT COUNT(*) FROM jsonb_object_keys(tokens_json->'shadow')), 0) +
              COALESCE((SELECT COUNT(*) FROM jsonb_object_keys(tokens_json->'radius')), 0) +
              COALESCE((SELECT COUNT(*) FROM jsonb_object_keys(tokens_json->'motion')), 0)
            )
          )::int as total_tokens
        FROM token_sets
        WHERE is_public = true AND tokens_json IS NOT NULL
      `)
    ])

    const queryTime = Date.now() - startTime

    const result = {
      sites: Number(siteCount[0]?.count || 0),
      scans: Number(scanCount[0]?.count || 0),
      tokens: Number(tokenCount[0]?.total_tokens || 0),
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