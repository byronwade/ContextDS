/**
 * Cache Warming API
 * Pre-populates ultra-cache with popular sites for instant scanning
 */

import { NextRequest, NextResponse } from 'next/server'
import { ultraCache } from '@/lib/cache/ultra-cache'

export const runtime = 'nodejs'
export const maxDuration = 30

// Popular sites to warm cache with
const POPULAR_SITES = [
  'vercel.com',
  'github.com',
  'tailwindcss.com',
  'stripe.com',
  'openai.com',
  'anthropic.com',
  'linear.app',
  'figma.com',
  'notion.so',
  'discord.com',
  'slack.com',
  'apple.com',
  'google.com',
  'microsoft.com',
  'netflix.com'
]

export async function POST(request: NextRequest) {
  try {
    const { sites } = await request.json()
    const sitesToWarm = sites || POPULAR_SITES

    console.log(`🔥 [cache-warm] Starting cache warming for ${sitesToWarm.length} sites`)
    const startTime = Date.now()

    await ultraCache.warmCache(sitesToWarm)

    const duration = Date.now() - startTime
    const stats = ultraCache.getCacheStats()

    return NextResponse.json({
      success: true,
      message: `Cache warmed with ${sitesToWarm.length} sites`,
      duration,
      sitesWarmed: sitesToWarm,
      cacheStats: stats
    })

  } catch (error) {
    console.error('[cache-warm] Failed:', error)

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const stats = ultraCache.getCacheStats()

    return NextResponse.json({
      success: true,
      cacheStats: stats,
      recommendations: generateCacheRecommendations(stats)
    })

  } catch (error) {
    console.error('[cache-warm] Stats failed:', error)

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

function generateCacheRecommendations(stats: any): string[] {
  const recommendations: string[] = []

  Object.entries(stats).forEach(([cache, data]: [string, any]) => {
    const utilizationPercent = (data.size / data.max) * 100

    if (utilizationPercent > 90) {
      recommendations.push(`🔥 ${cache}: High utilization (${Math.round(utilizationPercent)}%) - consider increasing cache size`)
    } else if (utilizationPercent < 20) {
      recommendations.push(`❄️ ${cache}: Low utilization (${Math.round(utilizationPercent)}%) - cache size may be too large`)
    } else if (utilizationPercent > 60) {
      recommendations.push(`✅ ${cache}: Good utilization (${Math.round(utilizationPercent)}%)`)
    }

    if (data.hitRatio && data.hitRatio > 0.8) {
      recommendations.push(`⚡ ${cache}: Excellent hit ratio (${Math.round(data.hitRatio * 100)}%)`)
    } else if (data.hitRatio && data.hitRatio < 0.4) {
      recommendations.push(`🎯 ${cache}: Low hit ratio (${Math.round(data.hitRatio * 100)}%) - consider cache warming`)
    }
  })

  if (recommendations.length === 0) {
    recommendations.push('🚀 All caches operating within normal parameters')
  }

  return recommendations
}

export async function DELETE(request: NextRequest) {
  try {
    ultraCache.clearAll()

    return NextResponse.json({
      success: true,
      message: 'All caches cleared'
    })

  } catch (error) {
    console.error('[cache-warm] Clear failed:', error)

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}