import { NextRequest, NextResponse } from 'next/server'
import { MCPServer, layoutProfileSchema } from '@/lib/mcp/server'
import { createRateLimiter } from '@/lib/auth/middleware'
import { z } from 'zod'

const rateLimiter = createRateLimiter(60 * 1000, 30) // 30 requests per minute

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
    const params = layoutProfileSchema.parse(body)

    const mcpServer = new MCPServer()
    const result = await mcpServer.layoutProfile(params)

    return NextResponse.json(result)

  } catch (error) {
    console.error('MCP layout_profile error:', error)

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