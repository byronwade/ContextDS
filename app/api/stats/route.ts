import { NextResponse } from 'next/server'
import { getScannerServiceUrl, isBrowserServiceConfigured } from '@/lib/scanner/browser-service'
import { getDirectoryStats, getStorageBackend } from '@/lib/storage/serverless-store'

function scannerStatus() {
  const url = getScannerServiceUrl()
  let host: string | null = null
  if (url) {
    try {
      host = new URL(url).host
    } catch {
      host = 'configured'
    }
  }
  return {
    configured: isBrowserServiceConfigured(),
    host,
    computedCssDisabled: process.env.DISABLE_COMPUTED_CSS === '1',
    defaultAgentMode:
      isBrowserServiceConfigured() && process.env.DISABLE_COMPUTED_CSS !== '1'
        ? 'accurate'
        : 'fast',
  }
}

export async function GET() {
  try {
    const [stats, backend] = await Promise.all([
      getDirectoryStats(),
      Promise.resolve(getStorageBackend()),
    ])

    return NextResponse.json(
      {
        ...stats,
        storage: backend,
        scanner: scannerStatus(),
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
        },
      }
    )
  } catch (error) {
    console.error('Stats error:', error)
    return NextResponse.json(
      {
        sites: 0,
        tokens: 0,
        scans: 0,
        tokenSets: 0,
        categories: {},
        averageConfidence: 0,
        recentActivity: [],
        popularSites: [],
        storage: getStorageBackend(),
        scanner: scannerStatus(),
      },
      { status: 200 }
    )
  }
}
