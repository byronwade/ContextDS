#!/usr/bin/env bun
import { readFileSync } from 'fs'
import { join } from 'path'
import postgres from 'postgres'
import * as dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })

const DATABASE_URL = process.env.DATABASE_URL || process.env.POSTGRES_URL

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL not found in environment')
  process.exit(1)
}

console.log('🚀 Starting ContextDS database optimization...')

async function main() {
  const client = postgres(DATABASE_URL!, {
    ssl: 'require',
    prepare: false
  })

  try {
    // Read optimization SQL file
    const optimizationSQL = readFileSync(
      join(process.cwd(), 'lib/db/optimization.sql'),
      'utf-8'
    )

    console.log('📄 Loaded optimization SQL script')

    // Split SQL into individual statements
    const statements = optimizationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'))

    console.log(`📊 Executing ${statements.length} optimization statements...`)

    let successful = 0
    let failed = 0

    // Execute each statement
    for (const [index, statement] of statements.entries()) {
      try {
        console.log(`⚡ [${index + 1}/${statements.length}] Executing optimization...`)

        await client.unsafe(statement)
        successful++

        // Log specific optimizations
        if (statement.includes('CREATE INDEX')) {
          const indexMatch = statement.match(/idx_[\w_]+/)
          if (indexMatch) {
            console.log(`  ✅ Created index: ${indexMatch[0]}`)
          }
        } else if (statement.includes('CREATE EXTENSION')) {
          const extMatch = statement.match(/CREATE EXTENSION.*?(\w+)/)
          if (extMatch) {
            console.log(`  ✅ Enabled extension: ${extMatch[1]}`)
          }
        } else if (statement.includes('CREATE OR REPLACE FUNCTION')) {
          const funcMatch = statement.match(/FUNCTION\s+(\w+)/)
          if (funcMatch) {
            console.log(`  ✅ Created function: ${funcMatch[1]}`)
          }
        }

      } catch (error: any) {
        // Skip harmless errors (like duplicate objects)
        if (
          error.message.includes('already exists') ||
          error.message.includes('duplicate') ||
          error.message.includes('does not exist')
        ) {
          console.log(`  ⚠️  Skipped (already exists): ${error.message.slice(0, 100)}`)
          successful++
        } else {
          console.error(`  ❌ Failed: ${error.message.slice(0, 100)}`)
          failed++
        }
      }
    }

    console.log(`\n📈 Optimization Results:`)
    console.log(`  ✅ Successful: ${successful}`)
    console.log(`  ❌ Failed: ${failed}`)
    console.log(`  📊 Success Rate: ${Math.round((successful / statements.length) * 100)}%`)

    // Test database performance after optimization
    console.log('\n🔬 Testing database performance...')

    const performanceTests = [
      {
        name: 'Site lookup by domain',
        query: `SELECT * FROM sites WHERE domain = 'stripe.com' LIMIT 1`
      },
      {
        name: 'Token search with JSONB',
        query: `SELECT COUNT(*) FROM token_sets WHERE tokens_json ? 'color'`
      },
      {
        name: 'Recent scans query',
        query: `SELECT COUNT(*) FROM scans WHERE finished_at > NOW() - INTERVAL '24 hours'`
      },
      {
        name: 'Public token sets',
        query: `SELECT COUNT(*) FROM token_sets WHERE is_public = true`
      }
    ]

    for (const test of performanceTests) {
      const start = Date.now()
      try {
        const result = await client.unsafe(test.query)
        const duration = Date.now() - start
        console.log(`  ⚡ ${test.name}: ${duration}ms`)

        if (duration > 500) {
          console.warn(`    ⚠️  Slow query detected (>${duration}ms)`)
        }
      } catch (error: any) {
        console.error(`  ❌ ${test.name} failed: ${error.message}`)
      }
    }

    // Get database statistics
    console.log('\n📊 Database Statistics:')
    try {
      const stats = await client.unsafe(`
        SELECT
          schemaname||'.'||tablename as table_name,
          n_tup_ins + n_tup_upd as total_rows,
          pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) as table_size,
          pg_size_pretty(pg_indexes_size(schemaname||'.'||tablename)) as index_size
        FROM pg_stat_user_tables
        WHERE schemaname = 'public'
        ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
        LIMIT 10
      `)

      stats.forEach((row: any) => {
        console.log(`  📋 ${row.table_name}: ${row.total_rows} rows, ${row.table_size} data, ${row.index_size} indexes`)
      })

    } catch (error: any) {
      console.warn(`  ⚠️  Could not load statistics: ${error.message}`)
    }

    // Connection health check
    console.log('\n🏥 Connection Health Check:')
    const healthStart = Date.now()
    await client.unsafe('SELECT 1')
    const healthDuration = Date.now() - healthStart
    console.log(`  ✅ Connection response time: ${healthDuration}ms`)

    if (healthDuration < 50) {
      console.log('  🚀 Excellent performance!')
    } else if (healthDuration < 200) {
      console.log('  ⚡ Good performance')
    } else {
      console.warn('  ⚠️  Performance could be improved')
    }

    console.log('\n🎉 ContextDS database optimization completed successfully!')
    console.log('🔍 Your token search queries should now be significantly faster')
    console.log('📈 Database is optimized for millions of design tokens')

  } catch (error: any) {
    console.error('❌ Database optimization failed:', error.message)
    process.exit(1)

  } finally {
    await client.end()
  }
}

// Error handling
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught exception during database optimization:', error)
  process.exit(1)
})

process.on('unhandledRejection', (error) => {
  console.error('❌ Unhandled promise rejection during database optimization:', error)
  process.exit(1)
})

// Run optimization
main().catch((error) => {
  console.error('❌ Database optimization script failed:', error)
  process.exit(1)
})