#!/usr/bin/env bun
import { db } from '@/lib/db'
import { sql } from 'drizzle-orm'
import { readFileSync } from 'fs'
import { join } from 'path'

async function applyExtremePerformance() {
  console.log('🚀 Applying extreme performance optimizations...')
  console.log('⚡ This includes:')
  console.log('   - BRIN indexes for time-series data')
  console.log('   - Partial indexes for filtered queries')
  console.log('   - Covering indexes to avoid lookups')
  console.log('   - Materialized views for instant reads')
  console.log('   - Parallel query execution')
  console.log('')

  try {
    const migrationSQL = readFileSync(
      join(process.cwd(), 'lib/db/migrations/0007_extreme_performance.sql'),
      'utf-8'
    )

    // Execute the migration
    await db.execute(sql.raw(migrationSQL))

    console.log('✅ Extreme performance optimizations applied successfully!')
    console.log('')

    // Verify the optimizations
    const statsResult = await db.execute(sql`
      SELECT total_sites, total_tokens, updated_at
      FROM stats_cache
      WHERE id = 1
    `)

    const recentActivityCheck = await db.execute(sql`
      SELECT COUNT(*) as count FROM recent_activity_cache
    `)

    const popularSitesCheck = await db.execute(sql`
      SELECT COUNT(*) as count FROM popular_sites_cache
    `)

    if (statsResult && statsResult.length > 0) {
      const stats = statsResult[0]
      console.log('📊 Cached stats verified:')
      console.log(`   Sites: ${stats.total_sites}`)
      console.log(`   Tokens: ${stats.total_tokens}`)
      console.log(`   Updated: ${stats.updated_at}`)
      console.log('')
    }

    console.log('📈 Materialized views created:')
    console.log(`   Recent activity: ${recentActivityCheck[0]?.count || 0} rows`)
    console.log(`   Popular sites: ${popularSitesCheck[0]?.count || 0} rows`)
    console.log('')

    // Test query performance
    const start = Date.now()
    await db.execute(sql`
      SELECT * FROM stats_cache WHERE id = 1
    `)
    await db.execute(sql`
      SELECT * FROM recent_activity_cache LIMIT 10
    `)
    await db.execute(sql`
      SELECT * FROM popular_sites_cache LIMIT 5
    `)
    const duration = Date.now() - start

    console.log(`⚡ Combined query time: ${duration}ms`)
    console.log('')
    console.log('🎯 Expected API response time: <50ms (excluding network)')

    process.exit(0)
  } catch (error) {
    console.error('❌ Migration failed:', error)
    process.exit(1)
  }
}

applyExtremePerformance()