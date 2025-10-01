import { NextResponse } from 'next/server'
import { db, tokenSets } from '@/lib/db'
import { sql, desc, isNotNull } from 'drizzle-orm'

// Removed edge runtime to support database connections

export async function GET() {
  try {
    // Skip during build time
    if (!process.env.DATABASE_URL) {
      return NextResponse.json([])
    }

    // Get recent color tokens from the database
    const recentColors = await db.execute(sql`
      SELECT DISTINCT
        key,
        value,
        created_at,
        site_domain
      FROM (
        SELECT
          jsonb_object_keys(tokens_json->'color') as key,
          tokens_json->'color'->jsonb_object_keys(tokens_json->'color') as value,
          ts.created_at,
          s.domain as site_domain
        FROM token_sets ts
        JOIN sites s ON s.id = ts.site_id
        WHERE ts.tokens_json->'color' IS NOT NULL
        AND jsonb_typeof(tokens_json->'color') = 'object'
        ORDER BY ts.created_at DESC
        LIMIT 50
      ) recent_tokens
      WHERE value::text LIKE '#%'
      ORDER BY created_at DESC
      LIMIT 20
    `)

    const colors = recentColors.map((row: any) => ({
      name: row.key,
      value: row.value?.replace(/"/g, ''), // Remove quotes from JSON string
      siteDomain: row.site_domain,
      createdAt: row.created_at
    })).filter(color => color.value && color.value.match(/^#[0-9A-Fa-f]{6}$/))

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