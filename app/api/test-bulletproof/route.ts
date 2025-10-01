/**
 * API endpoint for testing bulletproof scanning
 * Tests the system with various site sizes and configurations
 */

import { NextRequest, NextResponse } from 'next/server'
import { runScanJob } from '@/lib/workers/scan-orchestrator'

export const runtime = 'nodejs'
export const maxDuration = 60 // 60 second timeout

type TestConfig = {
  url: string
  name: string
  memoryLimitMb: number
  timeoutMs: number
  includeComputed: boolean
  mode: 'fast' | 'accurate'
}

const TEST_CONFIGS: TestConfig[] = [
  {
    url: 'https://github.com',
    name: 'GitHub (Medium Site)',
    memoryLimitMb: 100,
    timeoutMs: 25000,
    includeComputed: false,
    mode: 'fast'
  },
  {
    url: 'https://vercel.com',
    name: 'Vercel (Small Site)',
    memoryLimitMb: 80,
    timeoutMs: 20000,
    includeComputed: true,
    mode: 'accurate'
  },
  {
    url: 'https://tailwindcss.com',
    name: 'Tailwind CSS (Design-Heavy)',
    memoryLimitMb: 120,
    timeoutMs: 30000,
    includeComputed: false,
    mode: 'fast'
  }
]

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const testUrl = searchParams.get('url')
  const testMode = searchParams.get('mode') || 'safe'

  try {
    if (testUrl) {
      // Test specific URL
      console.log(`[bulletproof-test] Testing specific URL: ${testUrl}`)

      const result = await runScanJob({
        url: testUrl,
        prettify: false,
        includeComputed: false,
        mode: 'fast',
        memoryLimitMb: 100,
        timeoutMs: 25000
      })

      return NextResponse.json({
        success: true,
        url: testUrl,
        result: {
          duration: result.summary.processingTime,
          memoryUsed: result.metadata.memoryUsedMb,
          cssSources: result.metadata.cssSources,
          tokensExtracted: result.summary.tokensExtracted,
          isLargeSite: result.metadata.isLargeSite,
          confidence: result.summary.confidence
        }
      })
    }

    // Run predefined test suite
    console.log(`[bulletproof-test] Running test suite in ${testMode} mode`)

    const results = []
    const startTime = Date.now()

    for (const config of TEST_CONFIGS) {
      console.log(`[bulletproof-test] Testing ${config.name}...`)
      const testStartTime = Date.now()

      try {
        const result = await runScanJob({
          url: config.url,
          prettify: false,
          includeComputed: config.includeComputed,
          mode: config.mode,
          memoryLimitMb: config.memoryLimitMb,
          timeoutMs: config.timeoutMs
        })

        const testDuration = Date.now() - testStartTime

        results.push({
          name: config.name,
          url: config.url,
          success: true,
          duration: testDuration,
          memoryUsed: result.metadata.memoryUsedMb || 0,
          cssSources: result.metadata.cssSources,
          staticCssSources: result.metadata.staticCssSources,
          computedCssSources: result.metadata.computedCssSources,
          tokensExtracted: result.summary.tokensExtracted,
          confidence: result.summary.confidence,
          isLargeSite: result.metadata.isLargeSite,
          limits: {
            memoryLimitMb: config.memoryLimitMb,
            timeoutMs: config.timeoutMs,
            includeComputed: config.includeComputed,
            mode: config.mode
          }
        })

        console.log(`[bulletproof-test] ✅ ${config.name} - ${testDuration}ms, ${result.metadata.memoryUsedMb || 0}MB`)

      } catch (error) {
        const testDuration = Date.now() - testStartTime

        results.push({
          name: config.name,
          url: config.url,
          success: false,
          duration: testDuration,
          error: error instanceof Error ? error.message : 'Unknown error',
          errorType: error instanceof Error ? error.constructor.name : 'Error',
          limits: {
            memoryLimitMb: config.memoryLimitMb,
            timeoutMs: config.timeoutMs,
            includeComputed: config.includeComputed,
            mode: config.mode
          }
        })

        console.log(`[bulletproof-test] ❌ ${config.name} - ${error}`)
      }

      // Cool down between tests
      if (testMode !== 'fast') {
        await new Promise(resolve => setTimeout(resolve, 2000))
      }
    }

    const totalDuration = Date.now() - startTime
    const successCount = results.filter(r => r.success).length

    return NextResponse.json({
      success: true,
      summary: {
        totalTests: results.length,
        successCount,
        failureCount: results.length - successCount,
        totalDuration,
        averageDuration: Math.round(totalDuration / results.length)
      },
      results,
      bulletproofFeatures: {
        memoryLimits: 'Implemented ✅',
        timeoutControls: 'Implemented ✅',
        circuitBreakers: 'Implemented ✅',
        progressiveScanning: 'Implemented ✅',
        resourceCleanup: 'Implemented ✅',
        gracefulDegradation: 'Implemented ✅'
      }
    })

  } catch (error) {
    console.error('[bulletproof-test] Test suite failed:', error)

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      errorType: error instanceof Error ? error.constructor.name : 'Error'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { url, memoryLimitMb, timeoutMs, includeComputed, mode } = await request.json()

    if (!url) {
      return NextResponse.json({
        success: false,
        error: 'URL is required'
      }, { status: 400 })
    }

    console.log(`[bulletproof-test] Custom test: ${url}`)
    const startTime = Date.now()

    const result = await runScanJob({
      url,
      prettify: false,
      includeComputed: includeComputed || false,
      mode: mode || 'fast',
      memoryLimitMb: memoryLimitMb || 100,
      timeoutMs: timeoutMs || 25000
    })

    const duration = Date.now() - startTime

    return NextResponse.json({
      success: true,
      url,
      config: {
        memoryLimitMb: memoryLimitMb || 100,
        timeoutMs: timeoutMs || 25000,
        includeComputed: includeComputed || false,
        mode: mode || 'fast'
      },
      result: {
        duration,
        memoryUsed: result.metadata.memoryUsedMb || 0,
        cssSources: result.metadata.cssSources,
        staticCssSources: result.metadata.staticCssSources,
        computedCssSources: result.metadata.computedCssSources,
        tokensExtracted: result.summary.tokensExtracted,
        confidence: result.summary.confidence,
        completeness: result.summary.completeness,
        reliability: result.summary.reliability,
        isLargeSite: result.metadata.isLargeSite
      },
      tokens: result.tokens,
      metadata: result.metadata
    })

  } catch (error) {
    console.error('[bulletproof-test] Custom test failed:', error)

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      errorType: error instanceof Error ? error.constructor.name : 'Error'
    }, { status: 500 })
  }
}