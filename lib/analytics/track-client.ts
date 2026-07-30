'use client'

import type { StatEvent } from '@/lib/storage/platform-stats'

/** Browser event so the header can optimistic-bump before Redis round-trip */
export const STATS_BUMP_EVENT = 'contextds:stats-bump'

export type StatsBumpDetail = {
  event: StatEvent
  by?: number
}

/** Fire-and-forget client telemetry into Redis-backed /api/stats/track */
export function trackClientEvent(event: StatEvent, by = 1): void {
  if (typeof window === 'undefined') return

  try {
    window.dispatchEvent(
      new CustomEvent<StatsBumpDetail>(STATS_BUMP_EVENT, {
        detail: { event, by },
      })
    )
  } catch {
    /* ignore */
  }

  try {
    void fetch('/api/stats/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event, by }),
      keepalive: true,
    }).catch(() => {
      /* ignore */
    })
  } catch {
    /* ignore */
  }
}
