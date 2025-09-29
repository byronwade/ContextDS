import { NextRequest, NextResponse } from 'next/server'
import { MCPServer, getTokensSchema } from '@/lib/mcp/server'
import { createRateLimiter } from '@/lib/auth/middleware'
import { z } from 'zod'

const rateLimiter = createRateLimiter(60 * 1000, 60) // 60 requests per minute (higher for read-only)

export async function GET(request: NextRequest) {
  try {
    // Rate limiting (public endpoint)
    const clientId = request.headers.get('x-forwarded-for') || 'unknown'
    if (!rateLimiter(clientId)) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429 }
      )
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const params = getTokensSchema.parse({
      url: searchParams.get('url'),
      version: searchParams.get('version') || undefined
    })

    // Execute MCP tool
    const mcpServer = new MCPServer()
    const result = await mcpServer.getTokens(params)

    return NextResponse.json(result)

  } catch (error) {
    console.error('MCP get_tokens error:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid parameters', details: error.issues },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const clientId = request.headers.get('x-forwarded-for') || 'unknown'
    if (!rateLimiter(clientId)) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429 }
      )
    }

    const body = await request.json()
    const params = getTokensSchema.parse(body)

    const mcpServer = new MCPServer()
    const result = await mcpServer.getTokens(params)

    return NextResponse.json(result)

  } catch (error) {
    console.error('MCP get_tokens error:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid parameters', details: error.issues },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}