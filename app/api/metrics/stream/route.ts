import { NextRequest } from 'next/server'
import { metricsClient } from '@/lib/metrics/client'

export const runtime = 'edge'

export async function GET(request: NextRequest) {
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      const sendUpdate = async () => {
        try {
          const stats = await metricsClient.getRealtimeStats(1)
          const data = `data: ${JSON.stringify(stats)}\n\n`
          controller.enqueue(encoder.encode(data))
        } catch (error) {
          console.error('Stream update error:', error)
        }
      }

      // Send initial data
      await sendUpdate()

      // Send updates every 2 seconds
      const interval = setInterval(sendUpdate, 2000)

      // Cleanup on close
      request.signal.addEventListener('abort', () => {
        clearInterval(interval)
        controller.close()
      })
    }
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    }
  })
}