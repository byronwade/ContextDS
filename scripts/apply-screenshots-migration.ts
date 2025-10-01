#!/usr/bin/env bun
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as dotenv from 'dotenv'
import { readFileSync } from 'fs'
import { join } from 'path'

// Load environment variables
dotenv.config({ path: '.env.local' })

const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) {
  console.error('❌ DATABASE_URL environment variable is required')
  process.exit(1)
}

async function applyScreenshotsMigration() {
  console.log('🔄 Connecting to database...')
  const client = postgres(databaseUrl, { max: 1 })
  const db = drizzle(client)

  try {
    console.log('📝 Applying screenshot deduplication migration...')

    // Read migration file
    const migrationPath = join(process.cwd(), 'lib/db/migrations/0012_screenshot_deduplication.sql')
    const migrationSQL = readFileSync(migrationPath, 'utf-8')

    // Execute migration
    await client.unsafe(migrationSQL)

    console.log('✅ Screenshot deduplication migration completed')
    console.log('📊 Benefits:')
    console.log('   - Duplicate screenshots are automatically detected by SHA-256 hash')
    console.log('   - Identical screenshots across scans share storage')
    console.log('   - Reference counting tracks screenshot usage')
    console.log('   - Automatic cleanup of orphaned screenshots after 90 days')

  } catch (error) {
    console.error('❌ Migration failed:', error)
    process.exit(1)
  } finally {
    await client.end()
  }
}

applyScreenshotsMigration()