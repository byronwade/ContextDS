import { NextRequest } from 'next/server'
import { progressStore } from '@/lib/events/progress-store'
import type { ProgressEvent } from '@/lib/workers/progress-emitter'

// Global real-time broadcast function
async function broadcastToRealtime(data: any) {
  try {
    // Broadcast to the real-time stream endpoint
    await fetch('/api/realtime/broadcast', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
  } catch (error) {
    console.error('Failed to broadcast to real-time stream:', error)
  }
}

// SSE endpoint for real-time scan progress
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const scanId = searchParams.get('scanId')

  if (!scanId) {
    return new Response('Missing scanId', { status: 400 })
  }

  const encoder = new TextEncoder()
  let unsubscribe: (() => void) | null = null

  const stream = new ReadableStream({
    start(controller) {
      console.log(`📡 SSE connected for scanId: ${scanId}`)

      // Send initial connection message
      const connectionMsg = encoder.encode(`data: ${JSON.stringify({ type: 'connected', scanId, timestamp: Date.now() })}\n\n`)
      controller.enqueue(connectionMsg)

      // Send heartbeat every 15 seconds to keep connection alive
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: heartbeat\n\n`))
        } catch (error) {
          clearInterval(heartbeat)
        }
      }, 15000)

      // Subscribe to progress events from the in-memory store
      unsubscribe = progressStore.subscribe(scanId, (event: ProgressEvent) => {
        console.log(`📨 SSE event for ${scanId}:`, event.type, event.message || event.phase)
        try {
          const message = encoder.encode(`data: ${JSON.stringify(event)}\n\n`)
          controller.enqueue(message)

          // Broadcast to global real-time stream for live metrics
          if (event.type === 'progress' || event.type === 'metrics') {
            broadcastToRealtime({
              type: 'scan_update',
              scanId: scanId,
              progress: event.type === 'progress' ? {
                step: event.step,
                totalSteps: event.totalSteps,
                phase: event.phase,
                message: event.message
              } : undefined,
              metrics: event.type === 'metrics' ? event.metrics : undefined,
              timestamp: Date.now()
            })
          }

          // Broadcast scan completion to real-time stream
          if (event.type === 'complete') {
            broadcastToRealtime({
              type: 'activity',
              activity: {
                id: `scan_${scanId}_${Date.now()}`,
                type: 'scan_completed',
                message: `Scan completed for ${scanId}`,
                timestamp: Date.now(),
                domain: event.data?.domain || scanId,
                isReal: true
              }
            })
          }

          // Close stream when scan completes
          if (event.type === 'complete' || event.type === 'error') {
            clearInterval(heartbeat)
            setTimeout(() => {
              controller.close()
            }, 100)
          }
        } catch (error) {
          console.error('Error sending SSE message:', error)
          clearInterval(heartbeat)
          controller.close()
        }
      })

      // Cleanup on disconnect
      request.signal.addEventListener('abort', () => {
        clearInterval(heartbeat)
        if (unsubscribe) unsubscribe()
        controller.close()
      })

      // Timeout after 5 minutes
      setTimeout(() => {
        clearInterval(heartbeat)
        if (unsubscribe) unsubscribe()
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'timeout', scanId })}\n\n`))
          controller.close()
        } catch (error) {
          // Already closed
        }
      }, 300000)
    },

    cancel() {
      // Cleanup when stream is cancelled
      if (unsubscribe) unsubscribe()
    }
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // Disable nginx buffering
    },
  })
}