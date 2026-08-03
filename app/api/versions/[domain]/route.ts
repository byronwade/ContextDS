/**
 * Legacy Postgres version list — superseded by:
 *   GET /api/sites/[domain]/versions
 */

import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ domain: string }> }
) {
  const { domain: rawDomain } = await params
  const domain = decodeURIComponent(rawDomain || '').trim()
  return NextResponse.json(
    {
      error:
        'Postgres version listing is retired. Use GET /api/sites/{domain}/versions.',
      migrateTo: domain
        ? `/api/sites/${encodeURIComponent(domain)}/versions`
        : '/api/sites/{domain}/versions',
    },
    { status: 410 }
  )
}
