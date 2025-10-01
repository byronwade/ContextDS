#!/usr/bin/env bun
import { config } from 'dotenv'
import postgres from 'postgres'
import { readFileSync } from 'fs'
import { join } from 'path'

// Load environment variables
config({ path: join(process.cwd(), '.env.local') })

const DATABASE_URL = process.env.DATABASE_URL

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL not found in environment variables')
  process.exit(1)
}

console.log('🔗 Connecting to database...')

const sql = postgres(DATABASE_URL, {
  max: 1,
  ssl: 'require'
})

async function runMigration() {
  try {
    console.log('📋 Reading migration script...')
    const migrationSQL = readFileSync(
      join(process.cwd(), 'scripts', 'migrate-css-content.sql'),
      'utf-8'
    )

    console.log('🚀 Running migration...')
    console.log('')

    // Execute the migration
    await sql.unsafe(migrationSQL)

    console.log('')
    console.log('✅ Migration completed successfully!')

  } catch (error) {
    console.error('❌ Migration failed:', error)
    throw error
  } finally {
    await sql.end()
  }
}

runMigration()
  .then(() => {
    console.log('✨ Done!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('Fatal error:', error)
    process.exit(1)
  })
