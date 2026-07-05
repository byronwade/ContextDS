import { NextRequest, NextResponse } from 'next/server'
import { addConnection, removeConnection, broadcast } from '@/lib/realtime/connections'
import { getDb, sites, tokenSets, scans } from '@/lib/db'
import { sql, count, isNotNull, eq, and } from 'drizzle-orm'

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
    if (!process.env.DATABASE_URL && !process.env.DB) {
      return currentMetrics
    }

    const db = await getDb()

    // Execute queries in parallel for maximum performance
    const [sitesCount, scansCount, tokenSetsCount, tokenSetRows] = await Promise.all([
      db.select({ count: count() }).from(sites),
      db.select({ count: count() }).from(scans).where(isNotNull(scans.finishedAt)),
      db.select({ count: count() }).from(tokenSets).where(isNotNull(tokenSets.tokensJson)),
      db.select({ tokensJson: tokenSets.tokensJson })
        .from(tokenSets)
        .where(and(eq(tokenSets.isPublic, true), isNotNull(tokenSets.tokensJson)))
    ])

    // Count tokens in JS (SQLite has no jsonb_object_keys)
    let totalTokenCount = 0
    for (const row of tokenSetRows) {
      const tj = row.tokensJson as any
      if (!tj || typeof tj !== 'object') continue
      for (const cat of ['color', 'typography', 'dimension', 'shadow', 'radius', 'motion']) {
        if (tj[cat] && typeof tj[cat] === 'object') {
          totalTokenCount += Object.keys(tj[cat]).length
        }
      }
    }

    return {
      totalScans: toNumber(scansCount[0]?.count),
      totalTokens: totalTokenCount,
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