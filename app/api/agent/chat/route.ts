import { createAgentUIStreamResponse } from 'ai'
import { type NextRequest, NextResponse } from 'next/server'
import { designContractAgent } from '@/lib/agent/design-contract-agent'
import { isAiGatewayConfigured } from '@/lib/ai/gateway'
import { agentRatelimit } from '@/lib/ratelimit'

export const maxDuration = 60
export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    if (!isAiGatewayConfigured()) {
      return NextResponse.json(
        {
          error:
            'AI Gateway is not configured. Set AI_GATEWAY_API_KEY locally, or deploy on Vercel with OIDC.',
        },
        { status: 503 }
      )
    }

    const identifier =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') ||
      '127.0.0.1'

    const { success } = await agentRatelimit.limit(identifier)
    if (!success) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please wait before sending another message.' },
        { status: 429 }
      )
    }

    const body = (await request.json()) as { messages?: unknown }
    const messages = Array.isArray(body.messages) ? body.messages : null
    if (!messages || messages.length === 0) {
      return NextResponse.json({ error: 'messages array is required' }, { status: 400 })
    }

    return createAgentUIStreamResponse({
      agent: designContractAgent,
      uiMessages: messages,
      abortSignal: request.signal,
    })
  } catch (error) {
    console.error('[agent/chat]', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Agent chat failed',
      },
      { status: 500 }
    )
  }
}
