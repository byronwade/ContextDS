#!/usr/bin/env bun
import { db } from '@/lib/db'
import { sql } from 'drizzle-orm'
import { readFileSync } from 'fs'
import { join } from 'path'

async function applyInstantStatsMigration() {
  console.log('🚀 Applying instant stats migration...')

  try {
    const migrationSQL = readFileSync(
      join(process.cwd(), 'lib/db/migrations/0006_instant_stats.sql'),
      'utf-8'
    )

    // Execute the migration
    await db.execute(sql.raw(migrationSQL))

    console.log('✅ Instant stats migration applied successfully!')
    console.log('📊 Stats will now load instantly from materialized cache')
    console.log('🔄 Cache auto-updates on scan completion')

    // Verify the stats table exists and has data
    const result = await db.execute(sql`
      SELECT total_sites, total_tokens, updated_at
      FROM stats_cache
      WHERE id = 1
    `)

    if (result && result.length > 0) {
      const stats = result[0]
      console.log('\n📈 Current cached stats:')
      console.log(`   Sites: ${stats.total_sites}`)
      console.log(`   Tokens: ${stats.total_tokens}`)
      console.log(`   Updated: ${stats.updated_at}`)
    }

    process.exit(0)
  } catch (error) {
    console.error('❌ Migration failed:', error)
    process.exit(1)
  }
}

applyInstantStatsMigration()