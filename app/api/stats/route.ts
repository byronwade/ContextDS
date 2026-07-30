import { NextResponse } from 'next/server'
import { getDirectoryStats, getStorageBackend } from '@/lib/storage/serverless-store'

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
      },
      { status: 200 }
    )
  }
}
