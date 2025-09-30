import { NextRequest, NextResponse } from 'next/server'
import { db, cssContent } from '@/lib/db'
import { sql } from 'drizzle-orm'

/**
 * Cron job to cleanup old CSS content (keep tokens forever, delete CSS after TTL)
 *
 * Schedule: Daily at 3 AM UTC
 * Vercel Cron: 0 3 * * *
 *
 * Purpose: Saves storage by deleting deduplicated CSS after 30 days while keeping tokens indefinitely
 */
export async function GET(request: NextRequest) {
  // Verify cron secret to prevent unauthorized access
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const startTime = Date.now()

    // Delete CSS content that:
    // 1. Is older than TTL days since last access
    // 2. Has zero references (or is orphaned)
    // Uses idx_css_content_cleanup index for performance
    const result = await db.execute(sql`
      DELETE FROM css_content
      WHERE (
        last_accessed < NOW() - INTERVAL '1 day' * ttl_days
        OR reference_count = 0
      )
      AND content IS NOT NULL
      RETURNING sha, bytes, compressed_bytes, reference_count
    `)

    const deletedCount = result.rowCount || 0
    const duration = Date.now() - startTime

    // Calculate storage freed
    let bytesFreed = 0
    let compressedBytesFreed = 0
    if (result.rows) {
      bytesFreed = result.rows.reduce((sum: number, row: any) => sum + (row.bytes || 0), 0)
      compressedBytesFreed = result.rows.reduce((sum: number, row: any) => sum + (row.compressed_bytes || 0), 0)
    }

    console.log(`✅ CSS cleanup completed:`)
    console.log(`   Deleted: ${deletedCount} deduplicated CSS files`)
    console.log(`   Storage freed: ${(compressedBytesFreed / 1024 / 1024).toFixed(2)}MB (${(bytesFreed / 1024 / 1024).toFixed(2)}MB uncompressed)`)
    console.log(`   Duration: ${duration}ms`)

    return NextResponse.json({
      success: true,
      deletedCount,
      bytesFreed,
      compressedBytesFreed,
      duration,
      message: `Cleaned up ${deletedCount} CSS files (${(compressedBytesFreed / 1024 / 1024).toFixed(2)}MB freed)`
    })

  } catch (error) {
    console.error('CSS cleanup failed:', error)

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Cleanup failed'
      },
      { status: 500 }
    )
  }
}

// Allow manual cleanup via POST (for testing/emergency)
export async function POST(request: NextRequest) {
  return GET(request)
}