/**
 * MCP auth + write gating.
 *
 * Public read tools stay open (rate-limited). Write / costly tools require a
 * Pro personal key (`dc_live_…`) or the shared `MCP_API_KEY`.
 */

import type { NextRequest } from 'next/server'
import {
  customerHasValidProForMcp,
  resolveMcpKey,
} from '@/lib/billing/mcp-keys'

/** Tools that mutate state, burn vision credits, or start heavy work. */
export const MCP_WRITE_TOOLS = new Set([
  'scan_site',
  'contract_from_screenshot',
  'refine_design_md',
  'compose_design_artifacts',
  'blend_systems',
  'generate_from_brief',
  'import_design_tokens',
  'restyle_page',
  'open_canvas',
  'update_canvas',
])

export type McpAuthContext = {
  authorized: boolean
  /** Shared env key or Pro personal key */
  authenticated: boolean
  isPro: boolean
  customerId?: string
  identity: string
}

export async function resolveMcpAuth(request: NextRequest): Promise<McpAuthContext> {
  const header = request.headers.get('authorization') ?? ''
  const bearer = header.startsWith('Bearer ') ? header.slice(7).trim() : ''
  const required = process.env.MCP_API_KEY?.trim()
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'anonymous'

  if (required && bearer === required) {
    return {
      authorized: true,
      authenticated: true,
      isPro: true,
      identity: `env-key:${ip}`,
    }
  }

  if (bearer.startsWith('dc_live_')) {
    const resolved = await resolveMcpKey(bearer)
    if (!resolved) {
      return {
        authorized: false,
        authenticated: false,
        isPro: false,
        identity: `invalid-key:${ip}`,
      }
    }
    const isPro = await customerHasValidProForMcp(resolved.customerId)
    return {
      authorized: isPro,
      authenticated: isPro,
      isPro,
      customerId: resolved.customerId,
      identity: `pro:${resolved.customerId}`,
    }
  }

  // No shared key configured — public reads stay open
  if (!required) {
    return {
      authorized: true,
      authenticated: false,
      isPro: false,
      identity: `anon:${ip}`,
    }
  }

  return {
    authorized: false,
    authenticated: false,
    isPro: false,
    identity: `missing-key:${ip}`,
  }
}

export function mcpWriteRequiresPro(toolName: string): boolean {
  return MCP_WRITE_TOOLS.has(toolName)
}
