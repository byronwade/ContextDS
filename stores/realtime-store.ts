import { create } from 'zustand'
import { devtools } from 'zustand/middleware'

interface LiveActivity {
  id: string
  type: 'scan_started' | 'scan_completed' | 'tokens_extracted' | 'user_joined' | 'site_analyzed' | 'queue_updated' | 'user_online' | 'popular_search'
  message: string
  data?: any
  timestamp: number
  user?: string
  domain?: string
  isReal?: boolean
}

interface LiveMetrics {
  totalScans: number
  totalTokens: number
  totalSites: number
  activeScans: number
  queueLength?: number
  avgProcessingTime?: number
  lastScanCompleted?: string
  avgScanTime?: number
  topDomains: Array<{ domain: string, scans: number }>
  recentActivity: LiveActivity[]
}

interface RealtimeState {
  // Connection state
  isConnected: boolean
  lastUpdate: number | null
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error'

  // Live metrics
  metrics: LiveMetrics

  // Activity feed
  activities: LiveActivity[]

  // Scanning activity
  activeScans: Map<string, any>

  // Event source
  eventSource: EventSource | null

  // Actions
  connect: () => void
  disconnect: () => void
  addActivity: (activity: LiveActivity) => void
  updateMetrics: (metrics: Partial<LiveMetrics>) => void
  setActiveScans: (scans: Map<string, any>) => void
}

export const useRealtimeStore = create<RealtimeState>()(
  devtools(
    (set, get) => ({
      // Initial state
      isConnected: false,
      lastUpdate: null,
      connectionStatus: 'disconnected',

      metrics: {
        totalScans: 0,
        totalTokens: 0,
        totalSites: 0,
        activeScans: 0,
        topDomains: [],
        recentActivity: []
      },

      activities: [],
      activeScans: new Map(),
      eventSource: null,

      // Connect to real-time stream
      connect: () => {
        const state = get()

        // Don't reconnect if already connected
        if (state.eventSource && state.isConnected) {
          return
        }

        // Close existing connection
        if (state.eventSource) {
          state.eventSource.close()
        }

        set({ connectionStatus: 'connecting' })

        try {
          // Connect to global real-time stream
          const eventSource = new EventSource('/api/realtime/stream')

          eventSource.onopen = () => {
            set({
              isConnected: true,
              connectionStatus: 'connected',
              lastUpdate: Date.now()
            })
          }

          eventSource.onmessage = (event) => {
            try {
              const data = JSON.parse(event.data)

              switch (data.type) {
                case 'metrics_update':
                  get().updateMetrics(data.metrics)
                  break

                case 'activity':
                  get().addActivity(data.activity)
                  break

                case 'scan_update':
                  const activeScans = get().activeScans
                  if (data.scanId) {
                    activeScans.set(data.scanId, data.scanData)
                    set({ activeScans: new Map(activeScans) })
                  }
                  break

                case 'heartbeat':
                  set({ lastUpdate: Date.now() })
                  break
              }
            } catch (error) {
              console.error('Error parsing realtime message:', error)
            }
          }

          eventSource.onerror = (error) => {
            console.error('Realtime connection error:', error)
            set({
              isConnected: false,
              connectionStatus: 'error',
              eventSource: null
            })

            // Auto-reconnect after 5 seconds
            setTimeout(() => {
              get().connect()
            }, 5000)
          }

          set({ eventSource })

        } catch (error) {
          console.error('Failed to connect to realtime stream:', error)
          set({ connectionStatus: 'error' })
        }
      },

      // Disconnect from stream
      disconnect: () => {
        const state = get()
        if (state.eventSource) {
          state.eventSource.close()
        }
        set({
          isConnected: false,
          connectionStatus: 'disconnected',
          eventSource: null
        })
      },

      // Add new activity
      addActivity: (activity) => {
        set(state => ({
          activities: [activity, ...state.activities.slice(0, 49)], // Keep last 50
          lastUpdate: Date.now()
        }))
      },

      // Update metrics
      updateMetrics: (newMetrics) => {
        set(state => ({
          metrics: { ...state.metrics, ...newMetrics },
          lastUpdate: Date.now()
        }))
      },

      // Update active scans
      setActiveScans: (scans) => {
        set({ activeScans: scans })
      }
    }),
    { name: 'RealtimeStore' }
  )
)

// Auto-connect when store is first used
if (typeof window !== 'undefined') {
  // Connect on client side only
  const store = useRealtimeStore.getState()
  if (!store.isConnected && store.connectionStatus === 'disconnected') {
    store.connect()
  }
}