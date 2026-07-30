import { create } from 'zustand'
import type { StatEvent } from '@/lib/storage/platform-stats'

export interface PlatformStats {
  sites: number
  tokens: number
  avgConfidence: number
  scans: number
  cacheHits: number
  cacheMisses: number
  libraryViews: number
  contractOpens: number
  downloads: number
  chatMessages: number
  agentScans: number
  lastUpdated: string
  storage: {
    redis: boolean
    blob: boolean
    mode: string
  }
}

interface StatsState {
  stats: PlatformStats | null
  isLoading: boolean
  error: string | null
  /** Monotonic bump id — increments when any counter rises (drives pulse UI) */
  bumpTick: number
  lastBumpedFields: Array<keyof PlatformStats>
  fetchStats: () => Promise<void>
  /** @deprecated Use fetchStats */
  loadStats: () => Promise<void>
  startPolling: (intervalMs?: number) => () => void
  /** Optimistic local increment before Redis confirms */
  bumpEvent: (event: StatEvent, by?: number) => void
}

const EMPTY_STATS: PlatformStats = {
  sites: 0,
  tokens: 0,
  avgConfidence: 0,
  scans: 0,
  cacheHits: 0,
  cacheMisses: 0,
  libraryViews: 0,
  contractOpens: 0,
  downloads: 0,
  chatMessages: 0,
  agentScans: 0,
  lastUpdated: new Date(0).toISOString(),
  storage: { redis: false, blob: false, mode: 'memory' },
}

const EVENT_TO_FIELD: Partial<Record<StatEvent, keyof PlatformStats>> = {
  scan: 'scans',
  cache_hit: 'cacheHits',
  cache_miss: 'cacheMisses',
  library_view: 'libraryViews',
  contract_open: 'contractOpens',
  download: 'downloads',
  chat_message: 'chatMessages',
  agent_scan: 'agentScans',
}

function risingFields(prev: PlatformStats | null, next: PlatformStats): Array<keyof PlatformStats> {
  if (!prev) return []
  const keys: Array<keyof PlatformStats> = [
    'sites',
    'tokens',
    'scans',
    'cacheHits',
    'libraryViews',
    'contractOpens',
    'downloads',
    'chatMessages',
    'agentScans',
  ]
  return keys.filter((key) => {
    const a = prev[key]
    const b = next[key]
    return typeof a === 'number' && typeof b === 'number' && b > a
  })
}

export const useStatsStore = create<StatsState>((set, get) => {
  const fetchStats = async () => {
    if (get().isLoading) return

    set({ isLoading: true, error: null })

    try {
      const response = await fetch('/api/stats', { cache: 'no-store' })
      if (!response.ok) {
        throw new Error('Failed to fetch stats')
      }

      const data = (await response.json()) as PlatformStats
      const prev = get().stats
      const rose = risingFields(prev, data)

      // Never let a poll wipe an optimistic bump that raced ahead of Redis
      const merged: PlatformStats = prev
        ? {
            ...data,
            sites: Math.max(prev.sites, data.sites),
            tokens: Math.max(prev.tokens, data.tokens),
            scans: Math.max(prev.scans, data.scans),
            cacheHits: Math.max(prev.cacheHits, data.cacheHits),
            cacheMisses: Math.max(prev.cacheMisses, data.cacheMisses),
            libraryViews: Math.max(prev.libraryViews, data.libraryViews),
            contractOpens: Math.max(prev.contractOpens, data.contractOpens),
            downloads: Math.max(prev.downloads, data.downloads),
            chatMessages: Math.max(prev.chatMessages, data.chatMessages),
            agentScans: Math.max(prev.agentScans, data.agentScans),
          }
        : data

      set({
        stats: merged,
        isLoading: false,
        ...(rose.length
          ? { bumpTick: get().bumpTick + 1, lastBumpedFields: rose }
          : { lastBumpedFields: [] }),
      })

      if (rose.length && typeof window !== 'undefined') {
        window.setTimeout(() => {
          set({ lastBumpedFields: [] })
        }, 1200)
      }
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Unknown error',
        isLoading: false,
        stats: get().stats ?? EMPTY_STATS,
      })
    }
  }

  return {
    stats: null,
    isLoading: false,
    error: null,
    bumpTick: 0,
    lastBumpedFields: [],
    fetchStats,
    loadStats: fetchStats,
    bumpEvent: (event, by = 1) => {
      const field = EVENT_TO_FIELD[event]
      if (!field) return
      const current = get().stats ?? { ...EMPTY_STATS, lastUpdated: new Date().toISOString() }
      const nextValue = (typeof current[field] === 'number' ? (current[field] as number) : 0) + by
      set({
        stats: { ...current, [field]: nextValue },
        bumpTick: get().bumpTick + 1,
        lastBumpedFields: [field],
      })
      // Clear highlight after the tick animation settles
      window.setTimeout(() => {
        if (get().lastBumpedFields.includes(field)) {
          set({ lastBumpedFields: get().lastBumpedFields.filter((f) => f !== field) })
        }
      }, 1200)
    },
    startPolling: (intervalMs = 4_000) => {
      void get().fetchStats()
      const id = window.setInterval(() => {
        void get().fetchStats()
      }, intervalMs)
      return () => window.clearInterval(id)
    },
  }
})
