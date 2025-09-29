import { NextRequest, NextResponse } from 'next/server'
import { MCPServer, scanTokensSchema } from '@/lib/mcp/server'
import { authenticateApiKey, createRateLimiter } from '@/lib/auth/middleware'
import { z } from 'zod'

const rateLimiter = createRateLimiter(60 * 1000, 10) // 10 requests per minute

export async function POST(request: NextRequest) {
  try {
    // Authenticate API key
    const userId = await authenticateApiKey(request)
    if (!userId) {
      return NextResponse.json(
        { error: 'Invalid or missing API key' },
        { status: 401 }
      )
    }

    // Rate limiting
    const clientId = request.headers.get('x-forwarded-for') || 'unknown'
    if (!rateLimiter(clientId)) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429 }
      )
    }

    // Parse and validate request
    const body = await request.json()
    const params = scanTokensSchema.parse(body)

    // Execute enhanced MCP tool with AI integration
    const mcpServer = new MCPServer()
    const result = await mcpServer.scanTokens(params, userId)

    // Record AI operation for observability
    if (result.ai_metadata) {
      await import('@/lib/ai/observability').then(({ recordAIOperation }) => {
        recordAIOperation(
          'mcp-scan-tokens',
          result.ai_metadata.models_used?.[0] || 'unknown',
          {
            inputTokens: 0, // Would calculate from request
            outputTokens: 0, // Would calculate from response
            cost: result.ai_metadata.total_cost || 0
          },
          {
            latency: result.ai_metadata.processing_time || 0,
            cacheHit: result.status === 'cached'
          },
          {
            score: result.ai_metadata.quality_score || 80,
            confidence: result.ai_metadata.confidence || 80,
            validationPassed: true
          },
          {
            url: params.url,
            userId,
            requestId: `mcp-${Date.now()}`
          },
          {
            success: result.status !== 'failed',
            error: result.error
          }
        )
      }).catch(console.warn)
    }

    return NextResponse.json(result)

  } catch (error) {
    console.error('MCP scan_tokens error:', error)

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