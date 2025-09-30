#!/usr/bin/env bun
import { db } from '@/lib/db'
import { sql } from 'drizzle-orm'
import { readFileSync } from 'fs'
import { join } from 'path'

async function applyQueryHints() {
  console.log('🎯 Applying query optimization functions...')

  try {
    const migrationSQL = readFileSync(
      join(process.cwd(), 'lib/db/migrations/0008_query_hints.sql'),
      'utf-8'
    )

    await db.execute(sql.raw(migrationSQL))

    console.log('✅ Query optimization functions created!')
    console.log('')

    // Benchmark the new functions
    console.log('📊 Benchmarking optimized functions...')

    const iterations = 10
    const times: number[] = []

    for (let i = 0; i < iterations; i++) {
      const start = performance.now()

      await Promise.all([
        db.execute(sql`SELECT * FROM get_instant_stats()`),
        db.execute(sql`SELECT * FROM get_recent_activity()`),
        db.execute(sql`SELECT * FROM get_popular_sites()`)
      ])

      const duration = performance.now() - start
      times.push(duration)
    }

    const avgTime = times.reduce((a, b) => a + b, 0) / times.length
    const minTime = Math.min(...times)
    const maxTime = Math.max(...times)

    console.log('')
    console.log('⚡ Performance Results:')
    console.log(`   Average: ${avgTime.toFixed(2)}ms`)
    console.log(`   Min: ${minTime.toFixed(2)}ms`)
    console.log(`   Max: ${maxTime.toFixed(2)}ms`)
    console.log('')
    console.log('🎯 Functions are STABLE and PARALLEL SAFE')
    console.log('   - Execution plans are cached')
    console.log('   - Can run in parallel workers')
    console.log('   - No transaction overhead')

    process.exit(0)
  } catch (error) {
    console.error('❌ Migration failed:', error)
    process.exit(1)
  }
}

applyQueryHints()