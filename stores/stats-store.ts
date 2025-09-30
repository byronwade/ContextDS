import { create } from 'zustand'
import { devtools } from 'zustand/middleware'

export interface StatsData {
  sites: number
  tokens: number
  scans: number
  tokenSets: number
  averageConfidence: number
  categories: Record<string, number>
  recentActivity: Array<{
    domain: string | null
    scannedAt: string | null
    tokens: number
  }>
  popularSites: Array<{
    domain: string | null
    popularity: number | null
    tokens: number
    lastScanned: string | null
  }>
}

interface StatsState {
  stats: StatsData | null
  loading: boolean
  error: string | null
  lastUpdated: number | null
  etag: string | null

  // Actions
  loadStats: () => Promise<void>
  refreshStats: () => Promise<void>
  setStats: (stats: StatsData) => void
}

export const useStatsStore = create<StatsState>()(
  devtools(
    (set, get) => ({
      stats: null,
      loading: false,
      error: null,
      lastUpdated: null,
      etag: null,

      loadStats: async () => {
        const state = get()

        console.log('📊 [StatsStore] loadStats called', {
          hasStats: !!state.stats,
          loading: state.loading,
          etag: state.etag
        })

        // Skip if already loading
        if (state.loading) {
          console.log('⚠️ [StatsStore] Already loading, skipping')
          return
        }

        set({ loading: true, error: null })

        try {
          // Use ETag for conditional requests (304 Not Modified)
          const headers: HeadersInit = {}
          if (state.etag) {
            headers['If-None-Match'] = state.etag
            console.log('🔖 [StatsStore] Using ETag:', state.etag)
          }

          console.log('🌐 [StatsStore] Fetching /api/stats')
          const response = await fetch('/api/stats', { headers })
          console.log('✅ [StatsStore] Response:', response.status, response.statusText)

          // 304 Not Modified - data hasn't changed, use cached version
          if (response.status === 304) {
            // Only return early if we actually have cached stats
            if (state.stats) {
              set({ loading: false })
              return
            }
            // If no cached stats, treat as error and try without ETag
            throw new Error('304 with no cached data')
          }

          if (!response.ok) throw new Error(`HTTP ${response.status}`)

          const data = await response.json()
          const newEtag = response.headers.get('etag')

          set({
            stats: data,
            loading: false,
            lastUpdated: Date.now(),
            etag: newEtag,
          })
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to load stats',
            loading: false,
          })
        }
      },

      refreshStats: async () => {
        // Force refresh (ignore ETag)
        set({ loading: true, error: null })

        try {
          const response = await fetch('/api/stats')
          if (!response.ok) throw new Error(`HTTP ${response.status}`)

          const data = await response.json()
          const newEtag = response.headers.get('etag')

          set({
            stats: data,
            loading: false,
            lastUpdated: Date.now(),
            etag: newEtag,
          })
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to load stats',
            loading: false,
          })
        }
      },

      setStats: (stats) => {
        set({
          stats,
          lastUpdated: Date.now(),
        })
      },
    }),
    { name: 'StatsStore' }
  )
)