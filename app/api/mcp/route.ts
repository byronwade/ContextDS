/**
 * MCP endpoint — Streamable HTTP transport.
 *
 * Point any MCP client here:
 *   claude mcp add --transport http designcontracts https://designcontracts.sh/api/mcp
 *
 * Auth is opt-in: set MCP_API_KEY to require `Authorization: Bearer <key>`.
 * Left unset the endpoint is open, matching the site's public scan API.
 */

import { NextResponse, type NextRequest } from 'next/server'
import { handleMessage, PROTOCOL_VERSION, SERVER_INFO, listTools } from '@/lib/mcp/protocol'
import { trackStatEvent } from '@/lib/storage/platform-stats'

export const maxDuration = 300

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, Mcp-Session-Id, MCP-Protocol-Version',
}

function authorized(request: NextRequest): boolean {
  const required = process.env.MCP_API_KEY?.trim()
  if (!required) return true
  const header = request.headers.get('authorization') ?? ''
  return header.startsWith('Bearer ') && header.slice(7).trim() === required
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS })
}

/**
 * Clients may probe with GET to open an SSE stream. This server is
 * request/response only, so say so rather than hanging the connection.
 */
export async function GET() {
  return NextResponse.json(
    {
      name: SERVER_INFO.name,
      version: SERVER_INFO.version,
      protocolVersion: PROTOCOL_VERSION,
      transport: 'streamable-http',
      note: 'POST JSON-RPC 2.0 messages to this URL. Server-initiated streaming is not offered.',
      tools: listTools().map((tool) => tool.name),
    },
    { status: 200, headers: CORS }
  )
}

export async function POST(request: NextRequest) {
  if (!authorized(request)) {
    return NextResponse.json(
      { jsonrpc: '2.0', id: null, error: { code: -32001, message: 'Unauthorized' } },
      { status: 401, headers: CORS }
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

  const response = await handleMessage(payload)

  // Notifications get no body — 202 Accepted per the transport spec.
  if (response === null) {
    return new NextResponse(null, { status: 202, headers: CORS })
  }

  const messages = Array.isArray(response) ? response : [response]
  if (messages.some((message) => message.result && 'content' in (message.result as object))) {
    void trackStatEvent('mcp_call').catch(() => {})
  }

  return NextResponse.json(response, { status: 200, headers: CORS })
}
