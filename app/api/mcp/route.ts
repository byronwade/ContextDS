/**
 * MCP endpoint — Streamable HTTP transport.
 *
 * Point any MCP client here:
 *   claude mcp add --transport http designcontracts https://designcontracts.sh/api/mcp
 *
 * Auth:
 * - Public read tools work without a key when MCP_API_KEY is unset.
 * - Write tools require Pro (`Authorization: Bearer dc_live_…`) or MCP_API_KEY.
 * - Real Upstash rate limits apply (anon 60/min, Pro 120/min, writes 20/min).
 */

import { NextResponse, type NextRequest } from 'next/server'
import { handleMessage, PROTOCOL_VERSION, SERVER_INFO, listTools } from '@/lib/mcp/protocol'
import { mcpWriteRequiresPro, resolveMcpAuth } from '@/lib/mcp/access'
import {
  mcpProRatelimit,
  mcpRatelimit,
  mcpWriteRatelimit,
} from '@/lib/ratelimit'
import { trackStatEvent } from '@/lib/storage/platform-stats'

export const maxDuration = 60

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Allow-Headers':
    'Content-Type, Authorization, Mcp-Session-Id, MCP-Protocol-Version',
}

function rateHeaders(limit: number, remaining: number, reset: number) {
  return {
    'X-RateLimit-Limit': String(limit),
    'X-RateLimit-Remaining': String(remaining),
    'X-RateLimit-Reset': String(reset),
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS })
}

export async function GET() {
  return NextResponse.json(
    {
      name: SERVER_INFO.name,
      version: SERVER_INFO.version,
      protocolVersion: PROTOCOL_VERSION,
      transport: 'streamable-http',
      note: 'POST JSON-RPC 2.0 messages to this URL. Server-initiated streaming is not offered.',
      tools: listTools().map((tool) => tool.name),
      rateLimits: {
        anonymous: '60 req/min',
        pro: '120 req/min',
        writeTools: '20 req/min',
      },
    },
    { status: 200, headers: CORS }
  )
}

export async function POST(request: NextRequest) {
  const auth = await resolveMcpAuth(request)
  if (!auth.authorized) {
    return NextResponse.json(
      { jsonrpc: '2.0', id: null, error: { code: -32001, message: 'Unauthorized' } },
      { status: 401, headers: CORS }
    )
  }

  const limiter = auth.isPro ? mcpProRatelimit : mcpRatelimit
  const limited = await limiter.limit(auth.identity)
  if (!limited.success) {
    return NextResponse.json(
      {
        jsonrpc: '2.0',
        id: null,
        error: { code: -32029, message: 'Rate limit exceeded' },
      },
      {
        status: 429,
        headers: {
          ...CORS,
          ...rateHeaders(limited.limit, limited.remaining, limited.reset),
          'Retry-After': String(
            Math.max(1, Math.ceil((limited.reset - Date.now()) / 1000))
          ),
        },
      }
    )
  }

  let payload: unknown
  try {
    payload = await request.json()
  } catch {
    return NextResponse.json(
      { jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } },
      { status: 400, headers: CORS }
    )
  }

  // Pre-check write tool rate limits before executing
  const messages = Array.isArray(payload) ? payload : [payload]
  for (const message of messages) {
    const method = (message as { method?: string })?.method
    const toolName =
      method === 'tools/call'
        ? String((message as { params?: { name?: string } })?.params?.name || '')
        : ''
    if (toolName && mcpWriteRequiresPro(toolName)) {
      const writeLimited = await mcpWriteRatelimit.limit(`write:${auth.identity}`)
      if (!writeLimited.success) {
        return NextResponse.json(
          {
            jsonrpc: '2.0',
            id: (message as { id?: string | number | null })?.id ?? null,
            error: { code: -32029, message: 'Write rate limit exceeded' },
          },
          {
            status: 429,
            headers: {
              ...CORS,
              ...rateHeaders(
                writeLimited.limit,
                writeLimited.remaining,
                writeLimited.reset
              ),
            },
          }
        )
      }
    }
  }

  const response = await handleMessage(payload, auth)

  if (response === null) {
    return new NextResponse(null, {
      status: 202,
      headers: {
        ...CORS,
        ...rateHeaders(limited.limit, limited.remaining, limited.reset),
      },
    })
  }

  const out = Array.isArray(response) ? response : [response]
  if (out.some((message) => message.result && 'content' in (message.result as object))) {
    void trackStatEvent('mcp_call').catch(() => {})
  }

  return NextResponse.json(response, {
    status: 200,
    headers: {
      ...CORS,
      ...rateHeaders(limited.limit, limited.remaining, limited.reset),
    },
  })
}
