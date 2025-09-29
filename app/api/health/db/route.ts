import { NextRequest, NextResponse } from 'next/server'
import { checkDatabaseHealth, queryWithMetrics, db, sites, tokenSets, scans, sql } from '@/lib/db'

export async function GET(request: NextRequest) {
  const startTime = Date.now()

  try {
    console.log('🏥 API health check initiated...')

    // 1. Basic connection health
    const connectionHealth = await checkDatabaseHealth()

    if (!connectionHealth.healthy) {
      return NextResponse.json({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        checks: {
          connection: {
            status: 'fail',
            responseTime: connectionHealth.responseTime,
            error: 'Database connection failed'
          }
        }
      }, { status: 503 })
    }

    // 2. Critical query performance tests
    const queryTests = [
      {
        name: 'sites-lookup',
        description: 'Site domain lookup performance',
        test: () => queryWithMetrics(
          () => db.select().from(sites).limit(1),
          'health-check-sites'
        )
      },
      {
        name: 'token-search',
        description: 'Token search performance',
        test: () => queryWithMetrics(
          () => db.select().from(tokenSets).where(sql`is_public = true`).limit(5),
          'health-check-tokens'
        )
      },
      {
        name: 'scan-status',
        description: 'Scan status query performance',
        test: () => queryWithMetrics(
          () => db.select().from(scans).where(sql`finished_at IS NOT NULL`).limit(5),
          'health-check-scans'
        )
      }
    ]

    const testResults: any = {}

    for (const test of queryTests) {
      const testStart = Date.now()
      try {
        await test.test()
        const duration = Date.now() - testStart

        testResults[test.name] = {
          status: 'pass',
          responseTime: duration,
          description: test.description
        }

      } catch (error) {
        testResults[test.name] = {
          status: 'fail',
          error: error instanceof Error ? error.message : 'Unknown error',
          description: test.description
        }
      }
    }

    // 3. Database statistics
    let dbStats: any = {}
    try {
      const statsQuery = await db.execute(sql`
        SELECT
          (SELECT COUNT(*) FROM sites) as sites_count,
          (SELECT COUNT(*) FROM token_sets WHERE is_public = true) as public_tokens,
          (SELECT COUNT(*) FROM scans WHERE finished_at > NOW() - INTERVAL '24 hours') as recent_scans,
          pg_size_pretty(pg_database_size(current_database())) as database_size
      `)

      dbStats = statsQuery[0] || {}

    } catch (error) {
      console.warn('Statistics query failed:', error)
    }

    // 4. Overall health assessment
    const allTestsPassed = Object.values(testResults).every((test: any) => test.status === 'pass')
    const avgResponseTime = Object.values(testResults)
      .filter((test: any) => test.responseTime)
      .reduce((sum: number, test: any) => sum + test.responseTime, 0) / Object.keys(testResults).length

    const healthStatus = allTestsPassed && avgResponseTime < 500 ? 'healthy' :
                        allTestsPassed ? 'degraded' : 'unhealthy'

    const totalTime = Date.now() - startTime

    const healthReport = {
      status: healthStatus,
      timestamp: new Date().toISOString(),
      responseTime: totalTime,
      checks: {
        connection: {
          status: 'pass',
          responseTime: connectionHealth.responseTime,
          queryCount: connectionHealth.queryCount,
          errorCount: connectionHealth.errorCount
        },
        ...testResults
      },
      database: {
        sitesCount: dbStats.sites_count || 0,
        publicTokens: dbStats.public_tokens || 0,
        recentScans: dbStats.recent_scans || 0,
        databaseSize: dbStats.database_size || 'Unknown'
      },
      performance: {
        averageQueryTime: Math.round(avgResponseTime),
        allTestsPassed,
        healthScore: allTestsPassed ? (avgResponseTime < 100 ? 100 : Math.max(50, 100 - avgResponseTime / 10)) : 25
      },
      recommendations: generateHealthRecommendations(testResults, avgResponseTime, dbStats)
    }

    console.log(`✅ Health check completed in ${totalTime}ms - Status: ${healthStatus}`)

    const statusCode = healthStatus === 'healthy' ? 200 : healthStatus === 'degraded' ? 200 : 503

    return NextResponse.json(healthReport, { status: statusCode })

  } catch (error) {
    console.error('❌ Health check failed:', error)

    return NextResponse.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Health check failed',
      responseTime: Date.now() - startTime
    }, { status: 503 })
  }
}

function generateHealthRecommendations(
  testResults: any,
  avgResponseTime: number,
  dbStats: any
): string[] {
  const recommendations: string[] = []

  // Performance recommendations
  if (avgResponseTime > 200) {
    recommendations.push('Database queries are slow - run optimization script')
  }

  if (avgResponseTime > 500) {
    recommendations.push('Critical performance issue - check database indexes')
  }

  // Test failure recommendations
  const failedTests = Object.entries(testResults).filter(([, test]: [string, any]) => test.status === 'fail')
  if (failedTests.length > 0) {
    recommendations.push(`${failedTests.length} database tests failed - check permissions and schema`)
  }

  // Data recommendations
  if (dbStats.sites_count === 0) {
    recommendations.push('No sites in database - run seeding script to add sample data')
  }

  if (dbStats.public_tokens === 0) {
    recommendations.push('No public tokens available - scan some websites to populate database')
  }

  // Success recommendations
  if (recommendations.length === 0) {
    recommendations.push('Database is healthy and optimized!')
    recommendations.push('All performance benchmarks passed')
  }

  return recommendations
}