import type { NextRequest } from 'next/server'
import { progressStore } from '@/lib/events/progress-store'
import type { ProgressEvent } from '@/lib/workers/progress-emitter'

/**
 * SSE endpoint for real-time scan progress.
 * Client should open this with a scanId, then POST /api/scan with the same scanId.
 */
export async function GET(request: NextRequest) {
  const scanId = request.nextUrl.searchParams.get('scanId')

  if (!scanId) {
    return new Response('Missing scanId', { status: 400 })
  }

  const encoder = new TextEncoder()
  let unsubscribe: (() => void) | null = null

  const stream = new ReadableStream({
    start(controller) {
      const connectionMsg = encoder.encode(
        `data: ${JSON.stringify({ type: 'connected', scanId, timestamp: Date.now() })}\n\n`
      )
      controller.enqueue(connectionMsg)

      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: heartbeat\n\n`))
        } catch {
          clearInterval(heartbeat)
        }
      }, 15000)

      unsubscribe = progressStore.subscribe(scanId, (event: ProgressEvent) => {
        try {
          const message = encoder.encode(`data: ${JSON.stringify(event)}\n\n`)
          controller.enqueue(message)

          if (event.type === 'complete' || event.type === 'error') {
            clearInterval(heartbeat)
            setTimeout(() => {
              try {
                controller.close()
              } catch {
                // already closed
              }
            }, 50)
          }
        } catch {
          clearInterval(heartbeat)
          try {
            controller.close()
          } catch {
            // already closed
          }
        }
      })

      request.signal.addEventListener('abort', () => {
        clearInterval(heartbeat)
        if (unsubscribe) unsubscribe()
        try {
          controller.close()
        } catch {
          // already closed
        }
      })

      setTimeout(() => {
        clearInterval(heartbeat)
        if (unsubscribe) unsubscribe()
        try {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: 'timeout', scanId })}\n\n`)
          )
          controller.close()
        } catch {
          // already closed
        }
      }, 300000)
    },

    cancel() {
      if (unsubscribe) unsubscribe()
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}
