'use client'

import type { StatEvent } from '@/lib/storage/platform-stats'

/** Fire-and-forget client telemetry into Redis-backed /api/stats/track */
export function trackClientEvent(event: StatEvent): void {
  if (typeof window === 'undefined') return
  try {
    void fetch('/api/stats/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event }),
      keepalive: true,
    }).catch(() => {
      /* ignore */
    })
  } catch {
    /* ignore */
  }
}
