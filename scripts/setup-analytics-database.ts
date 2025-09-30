#!/usr/bin/env bun

/**
 * Setup Analytics Database Tables
 * Applies the comprehensive analytics schema migration
 */

import { readFileSync } from 'fs'
import { join } from 'path'
import { Pool } from '@neondatabase/serverless'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
})

async function main() {
  console.log('🚀 Setting up analytics database tables...\n')

  if (!process.env.DATABASE_URL) {
    console.error('❌ ERROR: DATABASE_URL environment variable is not set')
    console.error('   Please set it in your .env file')
    process.exit(1)
  }

  try {
    console.log('📊 Reading analytics schema migration...')
    const migrationPath = join(__dirname, '../lib/db/migrations/0003_analytics_schema.sql')
    const migrationSQL = readFileSync(migrationPath, 'utf-8')

    console.log('🔧 Applying analytics schema migration...')
    await pool.query(migrationSQL)
    console.log('✅ Analytics schema applied successfully')

    // Verify tables exist
    console.log('\n📋 Verifying analytics tables...')
    const result = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name IN (
        'analytics_events',
        'token_analytics',
        'domain_analytics',
        'search_analytics',
        'vercel_analytics'
      )
      ORDER BY table_name
    `)

    console.log('   Tables found:')
    result.rows.forEach(row => {
      console.log(`   ✓ ${row.table_name}`)
    })

    // Verify materialized views
    console.log('\n📊 Verifying materialized views...')
    const viewsResult = await pool.query(`
      SELECT matviewname
      FROM pg_matviews
      WHERE schemaname = 'public'
      AND matviewname LIKE 'mv_%'
      ORDER BY matviewname
    `)

    console.log('   Views found:')
    viewsResult.rows.forEach(row => {
      console.log(`   ✓ ${row.matviewname}`)
    })

    console.log('\n✨ Analytics database setup complete!')
    console.log('   Run `SELECT refresh_analytics_views();` to populate views')

  } catch (error) {
    console.error('❌ Error setting up analytics database:', error)
    process.exit(1)
  } finally {
    await pool.end()
  }
}

main()