import { NextResponse } from 'next/server'
import { isProEntitlement } from '@/lib/billing/config'
import { getRequestEntitlement } from '@/lib/billing/entitlements'
import { issueMcpKeyForCustomer } from '@/lib/billing/mcp-keys'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * POST /api/billing/mcp-key
 * Issue (or rotate) a personal MCP API key — Pro only.
 */
export async function POST(): Promise<NextResponse> {
  const entitlement = await getRequestEntitlement()
  if (!isProEntitlement(entitlement) || !entitlement?.customerId) {
    return NextResponse.json(
      {
        error: 'Personal MCP keys require Design Contracts Pro.',
        upgradePath: '/pricing',
      },
      { status: 402 }
    )
  }

  try {
    const { apiKey, fingerprint } = await issueMcpKeyForCustomer(entitlement)
    return NextResponse.json({
      apiKey,
      fingerprint,
      endpoint: 'https://designcontracts.sh/api/mcp',
      note: 'Copy this key now — it is not shown again. Use Authorization: Bearer <key>.',
    })
  } catch (error) {
    console.error('[billing/mcp-key]', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Could not issue key' },
      { status: 500 }
    )
  }
}
