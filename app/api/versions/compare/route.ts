/**
 * Legacy Postgres compare — superseded by serverless:
 *   POST /api/sites/[domain]/versions/compare
 *
 * Kept as a redirect shim so old clients get a clear migration path.
 */

import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

export async function POST() {
  return NextResponse.json(
    {
      error:
        'Postgres version compare is retired. Use POST /api/sites/{domain}/versions/compare with { oldScanId, newScanId }.',
      migrateTo: '/api/sites/{domain}/versions/compare',
    },
    { status: 410 }
  )
}
