#!/usr/bin/env bun
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })

const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) {
  console.error('❌ DATABASE_URL environment variable is required')
  process.exit(1)
}

async function cleanupOrphanedScreenshots() {
  console.log('🔄 Connecting to database...')
  const client = postgres(databaseUrl, { max: 1 })
  const db = drizzle(client)

  try {
    console.log('🧹 Cleaning up orphaned screenshot content...')
    console.log('   (Screenshots with zero references and not accessed for 90+ days)')

    const result = await client.unsafe(`
      SELECT cleanup_orphaned_screenshots() as deleted_count;
    `)

    const deletedCount = result[0]?.deleted_count || 0

    if (deletedCount > 0) {
      console.log(`✅ Deleted ${deletedCount} orphaned screenshot(s)`)
      console.log('💾 Storage space freed!')
    } else {
      console.log('✨ No orphaned screenshots to clean up')
    }

    // Also show current stats
    const stats = await client.unsafe(`
      SELECT
        COUNT(*) as total_screenshots,
        SUM(file_size) as total_size,
        SUM(reference_count) as total_references,
        COUNT(CASE WHEN reference_count = 0 THEN 1 END) as orphaned_count
      FROM screenshot_content;
    `)

    if (stats[0]) {
      const { total_screenshots, total_size, total_references, orphaned_count } = stats[0]
      console.log('\n📊 Screenshot Storage Stats:')
      console.log(`   Total unique screenshots: ${total_screenshots}`)
      console.log(`   Total storage used: ${(total_size / 1024 / 1024).toFixed(2)} MB`)
      console.log(`   Total references: ${total_references}`)
      console.log(`   Orphaned (zero refs): ${orphaned_count}`)

      if (total_screenshots > 0) {
        const avgReferences = total_references / total_screenshots
        console.log(`   Average reuse per screenshot: ${avgReferences.toFixed(2)}x`)
        const savings = ((1 - 1 / avgReferences) * 100).toFixed(1)
        console.log(`   💰 Storage savings from deduplication: ~${savings}%`)
      }
    }

  } catch (error) {
    console.error('❌ Cleanup failed:', error)
    process.exit(1)
  } finally {
    await client.end()
  }
}

cleanupOrphanedScreenshots()
