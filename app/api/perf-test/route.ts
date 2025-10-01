/**
 * Performance Test API
 * Tests scanning performance to identify bottlenecks for ultra-fast optimization
 */

import { NextRequest, NextResponse } from 'next/server'
import { runScanJob } from '@/lib/workers/scan-orchestrator'

export const runtime = 'nodejs'
export const maxDuration = 30

const PERF_TEST_SITES = [
  {
    url: 'https://vercel.com',
    name: 'Vercel (Small)',
    expectedMs: 500
  },
  {
    url: 'https://tailwindcss.com',
    name: 'Tailwind (Medium)',
    expectedMs: 800
  },
  {
    url: 'https://github.com',
    name: 'GitHub (Large)',
    expectedMs: 1200
  }
]

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const testUrl = searchParams.get('url') || 'https://vercel.com'
  const mode = searchParams.get('mode') || 'fast'
  const skipAI = searchParams.get('skipAI') === 'true'

  console.log(`🚀 [perf-test] Testing ${testUrl} (mode: ${mode}, skipAI: ${skipAI})`)

  // Track if this is a cache hit for performance analysis
  let cacheHit = false
  const startTime = performance.now()

  try {
    const result = await runScanJob({
      url: testUrl,
      prettify: false,
      includeComputed: mode === 'accurate',
      mode: mode as 'fast' | 'accurate',
      memoryLimitMb: 80,
      timeoutMs: 15000
    })

    const totalDuration = performance.now() - startTime
    const performanceReport = result.metadata.performanceReport

    // Check if this was a cache hit
    cacheHit = result.cacheInfo?.cached === true
    const cacheType = result.cacheInfo?.cacheHit || 'none'

    // Analyze bottlenecks
    const bottlenecks = performanceReport?.bottlenecks || []
    const slowOperations = bottlenecks.filter(b => b.duration > 50)
    const recommendations = performanceReport?.recommendations || []

    // Add cache-specific recommendations
    if (cacheHit) {
      recommendations.unshift(`⚡ CACHE HIT: Ultra-fast result from ${cacheType} cache (${Math.round(totalDuration)}ms)`)
    } else {
      recommendations.unshift(`🔄 CACHE MISS: Full scan performed - result will be cached for next time`)
    }

    // Calculate target achievement with cache context
    const targetMs = cacheHit ? 50 : 200  // Stricter target for cached results
    const isUnderTarget = totalDuration <= targetMs
    const overBy = totalDuration - targetMs

    return NextResponse.json({
      success: true,
      summary: {
        url: testUrl,
        mode,
        totalDuration: Math.round(totalDuration * 100) / 100,
        target: targetMs,
        isUnderTarget,
        overBy: isUnderTarget ? 0 : Math.round(overBy * 100) / 100,
        grade: isUnderTarget ? 'A' : totalDuration < 400 ? 'B' : totalDuration < 800 ? 'C' : 'D',
        cacheHit,
        cacheType,
        ultraFast: cacheHit && totalDuration < 50
      },
      bottlenecks: slowOperations,
      recommendations,
      performanceReport,
      scanResults: {
        cssSources: result.metadata.cssSources,
        tokensExtracted: result.summary.tokensExtracted,
        confidence: result.summary.confidence,
        memoryUsed: result.metadata.memoryUsedMb
      }
    })

  } catch (error) {
    const totalDuration = performance.now() - startTime

    console.error(`❌ [perf-test] Failed after ${totalDuration}ms:`, error)

    return NextResponse.json({
      success: false,
      summary: {
        url: testUrl,
        mode,
        totalDuration: Math.round(totalDuration * 100) / 100,
        target: 200,
        isUnderTarget: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        grade: 'F'
      },
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log(`🔬 [perf-test] Running comprehensive performance test suite`)
    const startTime = performance.now()

    const results = []

    for (const site of PERF_TEST_SITES) {
      console.log(`🎯 Testing ${site.name}...`)
      const siteStartTime = performance.now()

      try {
        const result = await runScanJob({
          url: site.url,
          prettify: false,
          includeComputed: false, // Fast mode only for perf testing
          mode: 'fast',
          memoryLimitMb: 60, // Conservative for performance testing
          timeoutMs: 10000 // 10s timeout
        })

        const siteDuration = performance.now() - siteStartTime
        const performanceReport = result.metadata.performanceReport

        results.push({
          site: site.name,
          url: site.url,
          success: true,
          duration: Math.round(siteDuration * 100) / 100,
          expected: site.expectedMs,
          isUnderExpected: siteDuration <= site.expectedMs,
          isUnderTarget: siteDuration <= 200,
          bottlenecks: performanceReport?.bottlenecks?.filter(b => b.duration > 30) || [],
          topBottleneck: performanceReport?.bottlenecks?.[0] || null,
          cssSources: result.metadata.cssSources,
          tokensExtracted: result.summary.tokensExtracted,
          memoryUsed: result.metadata.memoryUsedMb
        })

      } catch (error) {
        const siteDuration = performance.now() - siteStartTime

        results.push({
          site: site.name,
          url: site.url,
          success: false,
          duration: Math.round(siteDuration * 100) / 100,
          expected: site.expectedMs,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }

      // Cool down between tests
      await new Promise(resolve => setTimeout(resolve, 1000))
    }

    const totalDuration = performance.now() - startTime
    const successCount = results.filter(r => r.success).length
    const underTargetCount = results.filter(r => r.success && r.isUnderTarget).length

    // Generate overall recommendations
    const allBottlenecks = results
      .filter(r => r.success && r.bottlenecks)
      .flatMap(r => r.bottlenecks)
      .sort((a, b) => b.duration - a.duration)

    const topBottlenecks = allBottlenecks.slice(0, 5)

    const overallRecommendations = [
      `🎯 TARGET: ${underTargetCount}/${successCount} sites under 200ms target`,
      ...topBottlenecks.map(b => `⚡ OPTIMIZE: ${b.operation} (${b.duration}ms average)`),
      `📊 OVERALL: ${Math.round(totalDuration)}ms for ${results.length} sites`
    ]

    return NextResponse.json({
      success: true,
      summary: {
        totalTests: results.length,
        successCount,
        underTargetCount,
        totalDuration: Math.round(totalDuration * 100) / 100,
        averageDuration: Math.round((totalDuration / results.length) * 100) / 100,
        grade: underTargetCount === successCount ? 'A' : underTargetCount > successCount * 0.7 ? 'B' : 'C'
      },
      results,
      topBottlenecks,
      recommendations: overallRecommendations,
      nextSteps: [
        '1. 🗄️ Implement aggressive caching for CSS sources',
        '2. ⚡ Skip heavy operations, use skeletons for UI',
        '3. 🔄 Parallelize all independent operations',
        '4. 📦 Pre-compute tokens for popular sites',
        '5. 🚀 Stream results as they become available'
      ]
    })

  } catch (error) {
    console.error(`❌ [perf-test] Test suite failed:`, error)

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}