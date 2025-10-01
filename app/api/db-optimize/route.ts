/**
 * Database Optimization API
 * Manually trigger database optimizations and check performance metrics
 */

import { NextRequest, NextResponse } from 'next/server'
import {
  initializeDatabaseOptimizations,
  createPerformanceIndexes,
  analyzeSlowQueries,
  checkDatabaseHealth,
  getDatabaseMetrics,
  resetDatabaseMetrics
} from '@/lib/db/optimizations'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(request: NextRequest) {
  try {
    const { action } = await request.json().catch(() => ({ action: 'optimize' }))

    console.log(`🚀 [db-optimize] Starting database optimization: ${action}`)
    const startTime = Date.now()

    let result

    switch (action) {
      case 'optimize':
        await initializeDatabaseOptimizations()
        result = {
          action: 'optimize',
          message: 'Database optimizations initialized successfully',
          optimizations: [
            '⚡ Critical performance indexes created',
            '🔧 Connection settings optimized',
            '📊 Slow query analysis completed',
            '🎯 Sub-100ms response target configured'
          ]
        }
        break

      case 'indexes':
        await createPerformanceIndexes()
        result = {
          action: 'indexes',
          message: 'Performance indexes created successfully',
          indexes: [
            'idx_sites_domain_hash (O(1) site lookups)',
            'idx_scans_site_finished (fast scan queries)',
            'idx_css_content_sha_hash (CSS deduplication)',
            'idx_token_sets_site_version (version tracking)',
            'idx_layout_profiles_site_id (layout queries)',
            '... and 10 more critical indexes'
          ]
        }
        break

      case 'analyze':
        const slowQueries = await analyzeSlowQueries()
        result = {
          action: 'analyze',
          message: `Found ${slowQueries.length} slow queries`,
          slowQueries: slowQueries.slice(0, 5), // Top 5 for brevity
          recommendations: slowQueries.length > 0 ? [
            '📈 Consider adding indexes for frequently queried columns',
            '🔄 Review query patterns and optimize joins',
            '💾 Ensure proper use of prepared statements',
            '📊 Monitor query performance regularly'
          ] : [
            '✅ No slow queries detected - excellent performance!'
          ]
        }
        break

      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid action. Use: optimize, indexes, or analyze'
        }, { status: 400 })
    }

    const duration = Date.now() - startTime
    const metrics = getDatabaseMetrics()

    return NextResponse.json({
      success: true,
      duration,
      result,
      metrics: {
        totalQueries: metrics.totalQueries,
        averageQueryTime: metrics.totalQueries > 0 ? Math.round(metrics.queryTime / metrics.totalQueries) : 0,
        slowQueries: metrics.slowQueries,
        queryTime: Math.round(metrics.queryTime)
      }
    })

  } catch (error) {
    console.error('[db-optimize] Failed:', error)

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      errorType: error instanceof Error ? error.constructor.name : 'Error'
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action') || 'health'

    switch (action) {
      case 'health':
        const health = await checkDatabaseHealth()
        const metrics = getDatabaseMetrics()

        return NextResponse.json({
          success: true,
          health,
          metrics: {
            totalQueries: metrics.totalQueries,
            averageQueryTime: metrics.totalQueries > 0 ? Math.round(metrics.queryTime / metrics.totalQueries * 100) / 100 : 0,
            slowQueries: metrics.slowQueries,
            totalQueryTime: Math.round(metrics.queryTime * 100) / 100,
            performance: health.responseTime < 50 ? 'excellent' : health.responseTime < 100 ? 'good' : 'needs_optimization'
          },
          recommendations: generateHealthRecommendations(health, metrics)
        })

      case 'metrics':
        const currentMetrics = getDatabaseMetrics()
        return NextResponse.json({
          success: true,
          metrics: currentMetrics,
          performance: {
            averageResponseTime: currentMetrics.totalQueries > 0 ? Math.round(currentMetrics.queryTime / currentMetrics.totalQueries * 100) / 100 : 0,
            slowQueryPercentage: currentMetrics.totalQueries > 0 ? Math.round((currentMetrics.slowQueries / currentMetrics.totalQueries) * 100) : 0,
            grade: calculatePerformanceGrade(currentMetrics)
          }
        })

      case 'reset':
        resetDatabaseMetrics()
        return NextResponse.json({
          success: true,
          message: 'Database metrics reset successfully'
        })

      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid action. Use: health, metrics, or reset'
        }, { status: 400 })
    }

  } catch (error) {
    console.error('[db-optimize] Health check failed:', error)

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

function generateHealthRecommendations(health: any, metrics: any): string[] {
  const recommendations: string[] = []

  if (health.responseTime > 100) {
    recommendations.push('🐌 Database response time >100ms - consider running POST /api/db-optimize')
  }

  if (metrics.slowQueries > 5) {
    recommendations.push('📊 Multiple slow queries detected - review query patterns')
  }

  if (metrics.totalQueries > 1000 && metrics.slowQueries / metrics.totalQueries > 0.1) {
    recommendations.push('⚠️ >10% of queries are slow - indexes may need optimization')
  }

  if (health.responseTime < 50 && metrics.slowQueries === 0) {
    recommendations.push('✅ Excellent database performance - ultra-fast responses achieved!')
  }

  if (recommendations.length === 0) {
    recommendations.push('🚀 Database performance is within optimal range')
  }

  return recommendations
}

function calculatePerformanceGrade(metrics: any): string {
  const avgTime = metrics.totalQueries > 0 ? metrics.queryTime / metrics.totalQueries : 0
  const slowPercentage = metrics.totalQueries > 0 ? (metrics.slowQueries / metrics.totalQueries) * 100 : 0

  if (avgTime < 50 && slowPercentage < 5) return 'A'
  if (avgTime < 100 && slowPercentage < 10) return 'B'
  if (avgTime < 200 && slowPercentage < 20) return 'C'
  return 'D'
}