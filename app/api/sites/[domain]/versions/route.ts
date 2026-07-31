import { NextRequest, NextResponse } from 'next/server'
import { listScanVersions } from '@/lib/storage/serverless-store'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ domain: string }> }
) {
  try {
    const { domain } = await params
    const versions = await listScanVersions(decodeURIComponent(domain))
    return NextResponse.json({ domain, count: versions.length, versions })
  } catch (error) {
    console.error('Error loading scan versions:', error)
    return NextResponse.json({ error: 'Failed to load versions' }, { status: 500 })
  }
}
