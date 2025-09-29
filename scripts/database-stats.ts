#!/usr/bin/env bun
import { db } from '@/lib/db'
import { sql } from 'drizzle-orm'
import * as dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })

console.log('📊 ContextDS Database Performance Statistics')
console.log('===========================================')

async function generateDatabaseStats() {
  try {
    // 1. Overall database statistics
    console.log('\n🎯 Overall Database Metrics')
    console.log('---------------------------')

    const overallStats = await db.execute(sql`
      SELECT
        (SELECT COUNT(*) FROM sites) as total_sites,
        (SELECT COUNT(*) FROM scans) as total_scans,
        (SELECT COUNT(*) FROM token_sets) as total_token_sets,
        (SELECT COUNT(*) FROM token_sets WHERE is_public = true) as public_token_sets,
        (SELECT AVG(CAST(consensus_score AS DECIMAL)) FROM token_sets WHERE consensus_score IS NOT NULL) as avg_confidence,
        (SELECT COUNT(*) FROM scans WHERE finished_at IS NOT NULL) as completed_scans,
        (SELECT COUNT(*) FROM scans WHERE status = 'failed') as failed_scans
    `)

    const stats = overallStats.rows[0]
    console.log(`📈 Total Sites: ${stats.total_sites}`)
    console.log(`🔍 Total Scans: ${stats.total_scans}`)
    console.log(`🎨 Token Sets: ${stats.total_token_sets} (${stats.public_token_sets} public)`)
    console.log(`✅ Completed Scans: ${stats.completed_scans}`)
    console.log(`❌ Failed Scans: ${stats.failed_scans}`)
    console.log(`📊 Average Confidence: ${Math.round((stats.avg_confidence || 0) * 100)}%`)

    // 2. Token category distribution
    console.log('\n🎨 Token Category Distribution')
    console.log('------------------------------')

    const categoryStats = await db.execute(sql`
      SELECT
        category_type,
        COUNT(*) as token_sets_with_category,
        AVG(token_count) as avg_tokens_per_category
      FROM (
        SELECT
          ts.id,
          CASE
            WHEN ts.tokens_json ? 'color' THEN 'color'
            WHEN ts.tokens_json ? 'typography' THEN 'typography'
            WHEN ts.tokens_json ? 'dimension' THEN 'dimension'
            WHEN ts.tokens_json ? 'shadow' THEN 'shadow'
            ELSE 'other'
          END as category_type,
          CASE
            WHEN ts.tokens_json ? 'color' THEN jsonb_object_length(ts.tokens_json->'color')
            WHEN ts.tokens_json ? 'typography' THEN jsonb_object_length(ts.tokens_json->'typography')
            WHEN ts.tokens_json ? 'dimension' THEN jsonb_object_length(ts.tokens_json->'dimension')
            WHEN ts.tokens_json ? 'shadow' THEN jsonb_object_length(ts.tokens_json->'shadow')
            ELSE 0
          END as token_count
        FROM token_sets ts
        WHERE ts.is_public = true
      ) category_analysis
      GROUP BY category_type
      ORDER BY token_sets_with_category DESC
    `)

    categoryStats.rows.forEach((row: any) => {
      console.log(`🎯 ${row.category_type}: ${row.token_sets_with_category} sets, avg ${Math.round(row.avg_tokens_per_category || 0)} tokens`)
    })

    // 3. Performance benchmarks
    console.log('\n⚡ Performance Benchmarks')
    console.log('-------------------------')

    const performanceTests = [
      {
        name: 'Token search by name',
        query: sql`
          SELECT COUNT(*) as matches
          FROM token_sets ts
          CROSS JOIN LATERAL jsonb_each(ts.tokens_json) AS category(key, value)
          CROSS JOIN LATERAL jsonb_each(category.value) AS token(key, value)
          WHERE ts.is_public = true
            AND token.key ILIKE '%primary%'
            AND category.key != '$schema'
            AND category.key != '$metadata'
        `
      },
      {
        name: 'Token search by value',
        query: sql`
          SELECT COUNT(*) as matches
          FROM token_sets ts
          CROSS JOIN LATERAL jsonb_each(ts.tokens_json) AS category(key, value)
          CROSS JOIN LATERAL jsonb_each(category.value) AS token(key, value)
          WHERE ts.is_public = true
            AND token.value->>'$value' ILIKE '%#%'
            AND category.key = 'color'
        `
      },
      {
        name: 'Site popularity ranking',
        query: sql`
          SELECT domain, popularity
          FROM sites
          WHERE owner_optout = false
          ORDER BY popularity DESC
          LIMIT 5
        `
      },
      {
        name: 'Recent activity',
        query: sql`
          SELECT COUNT(*) as recent_scans
          FROM scans
          WHERE finished_at > NOW() - INTERVAL '1 hour'
        `
      }
    ]

    for (const test of performanceTests) {
      const start = Date.now()
      try {
        const result = await db.execute(test.query)
        const duration = Date.now() - start

        let resultInfo = ''
        if (test.name.includes('search')) {
          const count = result.rows[0]?.matches || result.rows[0]?.token_count || 0
          resultInfo = ` (${count} matches)`
        } else if (test.name.includes('ranking')) {
          const sites = result.rows.length
          resultInfo = ` (${sites} sites)`
        } else if (test.name.includes('activity')) {
          const count = result.rows[0]?.recent_scans || 0
          resultInfo = ` (${count} recent)`
        }

        console.log(`  ⚡ ${test.name}: ${duration}ms${resultInfo}`)

        if (duration < 50) {
          console.log(`    🚀 Excellent performance!`)
        } else if (duration < 200) {
          console.log(`    ✅ Good performance`)
        } else if (duration < 500) {
          console.log(`    ⚠️  Acceptable performance`)
        } else {
          console.log(`    🐌 Slow performance - needs optimization`)
        }

      } catch (error) {
        console.error(`  ❌ ${test.name}: Failed`)
        console.error(`     ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }

    // 4. Index effectiveness analysis
    console.log('\n📈 Index Effectiveness')
    console.log('----------------------')

    try {
      const indexAnalysis = await db.execute(sql`
        SELECT
          schemaname,
          tablename,
          indexname,
          idx_scan,
          idx_tup_read,
          idx_tup_fetch,
          CASE
            WHEN idx_scan = 0 THEN 'Unused'
            WHEN idx_scan < 10 THEN 'Low usage'
            WHEN idx_scan < 100 THEN 'Moderate usage'
            ELSE 'High usage'
          END as usage_level
        FROM pg_stat_user_indexes
        WHERE schemaname = 'public'
        ORDER BY idx_scan DESC
      `)

      if (indexAnalysis.rows.length > 0) {
        const groupedIndexes = indexAnalysis.rows.reduce((acc: any, row: any) => {
          if (!acc[row.usage_level]) acc[row.usage_level] = []
          acc[row.usage_level].push(row)
          return acc
        }, {})

        Object.entries(groupedIndexes).forEach(([level, indexes]: [string, any]) => {
          console.log(`  ${level}: ${indexes.length} indexes`)
          if (level === 'High usage') {
            indexes.slice(0, 3).forEach((idx: any) => {
              console.log(`    📊 ${idx.tablename}.${idx.indexname}: ${idx.idx_scan} scans`)
            })
          }
        })
      } else {
        console.log('  ℹ️  No index usage data available yet')
      }

    } catch (error) {
      console.warn('  ⚠️  Index analysis failed:', error instanceof Error ? error.message : 'Unknown error')
    }

    // 5. Database size and growth
    console.log('\n💾 Storage Analysis')
    console.log('-------------------')

    try {
      const storageStats = await db.execute(sql`
        SELECT
          pg_size_pretty(pg_database_size(current_database())) as database_size,
          pg_size_pretty(SUM(pg_total_relation_size(schemaname||'.'||tablename))) as total_table_size,
          pg_size_pretty(SUM(pg_indexes_size(schemaname||'.'||tablename))) as total_index_size
        FROM pg_stat_user_tables
        WHERE schemaname = 'public'
      `)

      const storage = storageStats.rows[0]
      console.log(`💾 Database Size: ${storage.database_size}`)
      console.log(`📊 Table Data: ${storage.total_table_size}`)
      console.log(`📈 Index Size: ${storage.total_index_size}`)

      // Storage efficiency
      const tableSize = parseFloat(storage.total_table_size?.replace(/[^\d.]/g, '') || '0')
      const indexSize = parseFloat(storage.total_index_size?.replace(/[^\d.]/g, '') || '0')

      if (tableSize > 0) {
        const indexRatio = (indexSize / tableSize) * 100
        console.log(`📊 Index Ratio: ${Math.round(indexRatio)}% of table size`)

        if (indexRatio < 20) {
          console.log('    ✅ Efficient index usage')
        } else if (indexRatio < 50) {
          console.log('    ⚠️  Moderate index overhead')
        } else {
          console.log('    🐌 High index overhead - consider cleanup')
        }
      }

    } catch (error) {
      console.warn('  ⚠️  Storage analysis failed:', error instanceof Error ? error.message : 'Unknown error')
    }

    // 6. Final recommendations
    console.log('\n💡 Optimization Recommendations')
    console.log('--------------------------------')

    const recommendations: string[] = []

    if (connectionHealth.responseTime > 100) {
      recommendations.push('Run `bun db:optimize` to apply performance indexes')
    }

    if (stats.total_scans > 1000) {
      recommendations.push('Consider implementing automatic cleanup of old failed scans')
    }

    if (performanceResults.some(r => !r.success)) {
      recommendations.push('Fix failing queries - check database permissions')
    }

    if (performanceResults.some(r => r.success && r.duration > 200)) {
      recommendations.push('Some queries are slow - verify indexes are being used')
    }

    if (recommendations.length === 0) {
      console.log('🎉 Database is perfectly optimized for ContextDS!')
      console.log('🚀 All performance benchmarks passed')
    } else {
      recommendations.forEach((rec, i) => {
        console.log(`${i + 1}. ${rec}`)
      })
    }

    console.log('\n🎯 Use `bun db:health` to run this check anytime')

  } catch (error) {
    console.error('❌ Database statistics generation failed:', error)
    process.exit(1)
  }
}

// Run statistics generation
generateDatabaseStats()
  .then(() => {
    console.log('\n✅ Database statistics completed!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Statistics script failed:', error)
    process.exit(1)
  })