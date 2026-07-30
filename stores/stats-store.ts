import { create } from 'zustand'

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
  fetchStats: () => Promise<void>
  /** @deprecated Use fetchStats */
  loadStats: () => Promise<void>
  startPolling: (intervalMs?: number) => () => void
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
      set({ stats: data, isLoading: false })
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
    fetchStats,
    loadStats: fetchStats,
    startPolling: (intervalMs = 15_000) => {
      void get().fetchStats()
      const id = window.setInterval(() => {
        void get().fetchStats()
      }, intervalMs)
      return () => window.clearInterval(id)
    },
  }
})
