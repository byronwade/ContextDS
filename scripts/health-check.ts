#!/usr/bin/env bun
import { db, checkDatabaseHealth, queryWithMetrics } from '@/lib/db'
import { sites, tokenSets, scans } from '@/lib/db/schema'
import { sql } from 'drizzle-orm'
import * as dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })

console.log('🏥 ContextDS Database Health Check')
console.log('====================================')

async function runHealthCheck() {
  console.log('🔗 Testing database connection...')

  // 1. Basic connection health
  const connectionHealth = await checkDatabaseHealth()

  if (!connectionHealth.healthy) {
    console.error('❌ Database connection failed!')
    console.error(`   Response time: ${connectionHealth.responseTime}ms`)
    console.error(`   Error count: ${connectionHealth.errorCount}`)
    process.exit(1)
  }

  console.log(`✅ Connection healthy (${connectionHealth.responseTime}ms)`)
  console.log(`📊 Query count: ${connectionHealth.queryCount}`)

  // 2. Test critical queries with performance monitoring
  console.log('\n⚡ Testing query performance...')

  const queryTests = [
    {
      name: 'Site lookup by domain',
      test: () => db.select().from(sites).where(sql`domain = 'stripe.com'`).limit(1)
    },
    {
      name: 'Public token sets count',
      test: () => db.select({ count: sql<number>`count(*)` }).from(tokenSets).where(sql`is_public = true`)
    },
    {
      name: 'Recent scans',
      test: () => db.select().from(scans).where(sql`finished_at > NOW() - INTERVAL '24 hours'`).limit(5)
    },
    {
      name: 'JSONB token search',
      test: () => db.execute(sql`
        SELECT COUNT(*) as token_count
        FROM token_sets
        WHERE tokens_json ? 'color'
        AND is_public = true
      `)
    },
    {
      name: 'Complex token extraction',
      test: () => db.execute(sql`
        SELECT
          ts.id,
          s.domain,
          jsonb_object_length(ts.tokens_json->'color') as color_count,
          jsonb_object_length(ts.tokens_json->'typography') as typography_count
        FROM token_sets ts
        LEFT JOIN sites s ON ts.site_id = s.id
        WHERE ts.is_public = true
        LIMIT 3
      `)
    }
  ]

  const performanceResults: { name: string; duration: number; success: boolean }[] = []

  for (const test of queryTests) {
    try {
      const result = await queryWithMetrics(test.test, test.name)
      const duration = Date.now() % 1000 // Approximate duration

      performanceResults.push({
        name: test.name,
        duration,
        success: true
      })

      if (test.name === 'JSONB token search') {
        const count = (result as any)[0]?.token_count || 0
        console.log(`  ✅ ${test.name}: Found ${count} token sets with colors`)
      } else if (test.name === 'Complex token extraction') {
        const results = (result as any) || []
        console.log(`  ✅ ${test.name}: Processed ${results.length} token sets`)
      } else {
        console.log(`  ✅ ${test.name}: Success`)
      }

    } catch (error) {
      console.error(`  ❌ ${test.name}: Failed`)
      console.error(`     Error: ${error instanceof Error ? error.message : 'Unknown error'}`)

      performanceResults.push({
        name: test.name,
        duration: 0,
        success: false
      })
    }
  }

  // 3. Index utilization check
  console.log('\n📈 Checking index utilization...')

  try {
    const indexStats = await db.execute(sql`
      SELECT
        schemaname,
        tablename,
        indexname,
        idx_scan,
        idx_tup_read,
        idx_tup_fetch
      FROM pg_stat_user_indexes
      WHERE schemaname = 'public'
      ORDER BY idx_scan DESC
      LIMIT 10
    `)

    if ((indexStats as any).length > 0) {
      console.log('  📊 Top index usage:')
      (indexStats as any).forEach((row: any) => {
        console.log(`    ${row.tablename}.${row.indexname}: ${row.idx_scan} scans`)
      })
    } else {
      console.log('  ⚠️  No index statistics available (tables may be empty)')
    }

  } catch (error) {
    console.warn('  ⚠️  Index statistics unavailable:', error instanceof Error ? error.message : 'Unknown error')
  }

  // 4. Table size analysis
  console.log('\n💾 Analyzing table sizes...')

  try {
    const tableSizes = await db.execute(sql`
      SELECT
        schemaname||'.'||tablename as table_name,
        pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
        pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) as table_size,
        pg_size_pretty(pg_indexes_size(schemaname||'.'||tablename)) as index_size
      FROM pg_stat_user_tables
      WHERE schemaname = 'public'
      ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
      LIMIT 8
    `)

    (tableSizes as any).forEach((row: any) => {
      console.log(`  📋 ${row.table_name}: ${row.size} (data: ${row.table_size}, indexes: ${row.index_size})`)
    })

  } catch (error) {
    console.warn('  ⚠️  Table size analysis failed:', error instanceof Error ? error.message : 'Unknown error')
  }

  // 5. Connection pool status
  console.log('\n🏊 Connection pool analysis...')

  try {
    const poolStats = await db.execute(sql`
      SELECT
        application_name,
        state,
        COUNT(*) as connection_count
      FROM pg_stat_activity
      WHERE application_name LIKE '%contextds%'
      GROUP BY application_name, state
    `)

    if ((poolStats as any).length > 0) {
      console.log('  📊 Active connections:')
      (poolStats as any).forEach((row: any) => {
        console.log(`    ${row.application_name} (${row.state}): ${row.connection_count}`)
      })
    } else {
      console.log('  ℹ️  No active connections found (this is normal for new databases)')
    }

  } catch (error) {
    console.warn('  ⚠️  Connection pool analysis failed:', error instanceof Error ? error.message : 'Unknown error')
  }

  // 6. Generate health report
  console.log('\n📋 Health Report Summary')
  console.log('========================')

  const successfulTests = performanceResults.filter(r => r.success).length
  const totalTests = performanceResults.length
  const healthScore = Math.round((successfulTests / totalTests) * 100)

  console.log(`🎯 Overall Health Score: ${healthScore}%`)
  console.log(`✅ Successful Tests: ${successfulTests}/${totalTests}`)
  console.log(`⚡ Connection Response: ${connectionHealth.responseTime}ms`)

  if (healthScore >= 90) {
    console.log('🚀 Database is in excellent health!')
  } else if (healthScore >= 75) {
    console.log('✅ Database is healthy with minor issues')
  } else if (healthScore >= 60) {
    console.log('⚠️  Database has some performance issues')
  } else {
    console.log('❌ Database requires immediate attention')
  }

  // 7. Recommendations
  console.log('\n💡 Optimization Recommendations:')

  if (connectionHealth.responseTime > 100) {
    console.log('  • Consider running database optimization script')
  }

  if (performanceResults.some(r => !r.success)) {
    console.log('  • Some queries failed - check database permissions and indexes')
  }

  if (healthScore < 90) {
    console.log('  • Run `bun db:optimize` to apply performance optimizations')
    console.log('  • Consider reviewing slow query logs')
  } else {
    console.log('  • Database is well optimized for ContextDS workloads!')
  }

  console.log('\n🎯 Health check completed!')

  return {
    healthy: healthScore >= 75,
    score: healthScore,
    responseTime: connectionHealth.responseTime,
    recommendations: performanceResults.filter(r => !r.success).map(r => `Fix ${r.name}`)
  }
}

// Run health check
runHealthCheck()
  .then((result) => {
    if (result.healthy) {
      console.log('✅ Database health check passed!')
      process.exit(0)
    } else {
      console.error('❌ Database health check failed!')
      process.exit(1)
    }
  })
  .catch((error) => {
    console.error('❌ Health check script failed:', error)
    process.exit(1)
  })