import { NextRequest, NextResponse } from 'next/server'
import { addConnection, removeConnection, broadcast } from '@/lib/realtime/connections'
import { db, sites, tokenSets, scans } from '@/lib/db'
import { sql, count, isNotNull } from 'drizzle-orm'

export const runtime = 'nodejs'
let currentMetrics = {
  totalScans: 0,
  totalTokens: 0,
  totalSites: 0,
  activeScans: 0,
  queueLength: 0,
  avgProcessingTime: 0,
  topDomains: [] as Array<{ domain: string, scans: number }>,
  recentActivity: [] as Array<any>
}
const activities: Array<any> = []

// Fetch real metrics from database
async function fetchRealMetrics() {
  try {
    // Skip during build time
    if (!process.env.DATABASE_URL) {
      return currentMetrics
    }

    // Execute queries in parallel for maximum performance
    const [sitesCount, scansCount, tokenSetsCount, tokensCount] = await Promise.all([
      // Count total sites
      db.select({ count: count() }).from(sites),

      // Count completed scans
      db.select({ count: count() }).from(scans).where(isNotNull(scans.finishedAt)),

      // Count token sets
      db.select({ count: count() }).from(tokenSets).where(isNotNull(tokenSets.tokensJson)),

      // Count total tokens across all categories
      db.execute(sql`
        SELECT
          (
            SUM(
              COALESCE((SELECT COUNT(*) FROM jsonb_object_keys(tokens_json->'color')), 0) +
              COALESCE((SELECT COUNT(*) FROM jsonb_object_keys(tokens_json->'typography')), 0) +
              COALESCE((SELECT COUNT(*) FROM jsonb_object_keys(tokens_json->'dimension')), 0) +
              COALESCE((SELECT COUNT(*) FROM jsonb_object_keys(tokens_json->'shadow')), 0) +
              COALESCE((SELECT COUNT(*) FROM jsonb_object_keys(tokens_json->'radius')), 0) +
              COALESCE((SELECT COUNT(*) FROM jsonb_object_keys(tokens_json->'motion')), 0)
            )
          )::int as total_tokens
        FROM token_sets
        WHERE is_public = true AND tokens_json IS NOT NULL
      `)
    ])

    const tokenData = tokensCount[0]

    return {
      totalScans: toNumber(scansCount[0]?.count),
      totalTokens: toNumber(tokenData?.total_tokens),
      totalSites: toNumber(sitesCount[0]?.count),
      activeScans: 0, // This would come from active scan tracking
      queueLength: 0, // This would come from queue system
      avgProcessingTime: 0, // This would come from processing metrics
      topDomains: [],
      recentActivity: []
    }
  } catch (error) {
    console.error('Failed to fetch real metrics:', error)
    return currentMetrics
  }
}

// Broadcast function is now imported from shared module

// Update metrics periodically
async function updateMetrics() {
  // Fetch real metrics from database
  const realMetrics = await fetchRealMetrics()
  currentMetrics = realMetrics

  broadcast({
    type: 'metrics_update',
    metrics: currentMetrics
  })
}

// Only send heartbeat, no mock activities
function sendHeartbeat() {
  broadcast({
    type: 'heartbeat',
    timestamp: Date.now()
  })
}

// Start background processes if not already running
let intervalsStarted = false
function startBackgroundProcesses() {
  if (intervalsStarted) return
  intervalsStarted = true

  // Update real metrics every 30 seconds
  setInterval(updateMetrics, 30000)

  // Send heartbeat every 60 seconds
  setInterval(sendHeartbeat, 60000)

  // Initialize with real data on startup
  updateMetrics()
}

export async function GET(request: NextRequest) {
  // Start background processes
  startBackgroundProcesses()

  const encoder = new TextEncoder()

  // Capture controller in outer scope for cancel method
  let streamController: ReadableStreamDefaultController<any>

  const stream = new ReadableStream({
    start(controller) {
      // Capture controller reference
      streamController = controller

      // Add connection to shared global set
      addConnection(controller)

      // Send initial data
      try {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({
          type: 'metrics_update',
          metrics: currentMetrics
        })}\n\n`))

        // No mock activities to send

        // Send connection confirmation
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({
          type: 'connected',
          timestamp: Date.now()
        })}\n\n`))

      } catch (error) {
        console.error('Error sending initial data:', error)
        removeConnection(controller)
      }
    },

    cancel() {
      removeConnection(streamController)
    }
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control',
    },
  })
}

function toNumber(value: unknown, fallback = 0): number {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : fallback
}