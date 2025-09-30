import { create } from 'zustand'
import { devtools } from 'zustand/middleware'

export interface ScanProgress {
  step: number
  totalSteps: number
  phase: string
  message: string
  data?: string
  time?: string
  details?: string[]
  logs?: string[]
  timestamp: number
}

export interface ScanMetrics {
  cssRules: number
  variables: number
  colors: number
  tokens: number
  qualityScore: number
}

export interface ScanResult {
  status: 'completed' | 'failed'
  domain: string
  summary: {
    tokensExtracted: number
    curatedCount?: {
      colors: number
      fonts: number
      sizes: number
      spacing: number
      radius: number
      shadows: number
    }
    confidence: number
    completeness: number
    reliability: number
    processingTime: number
  }
  versionInfo?: {
    versionNumber: number
    isNewVersion: boolean
    previousVersionNumber?: number
    changeCount: number
    diff?: any
  }
  curatedTokens?: any
  aiInsights?: any
  comprehensiveAnalysis?: any
  tokens?: any
  brandAnalysis?: any
  liveMetrics?: ScanMetrics
  layoutDNA?: any
  metadata?: any
  database?: any
}

interface ScanState {
  // Current scan state
  isScanning: boolean
  currentDomain: string | null
  scanId: string | null
  progress: ScanProgress | null
  metrics: ScanMetrics | null
  result: ScanResult | null
  error: string | null

  // SSE connection
  eventSource: EventSource | null

  // Actions
  startScan: (domain: string) => Promise<void>
  updateProgress: (progress: ScanProgress) => void
  updateMetrics: (metrics: ScanMetrics) => void
  setResult: (result: ScanResult) => void
  setError: (error: string) => void
  resetScan: () => void
  cancelScan: () => void
}

export const useScanStore = create<ScanState>()(
  devtools(
    (set, get) => ({
      isScanning: false,
      currentDomain: null,
      scanId: null,
      progress: null,
      metrics: null,
      result: null,
      error: null,
      eventSource: null,

      startScan: async (domain: string) => {
        const state = get()

        // Cancel any existing scan
        if (state.eventSource) {
          state.eventSource.close()
        }

        // Reset state
        set({
          isScanning: true,
          currentDomain: domain,
          scanId: null,
          progress: null,
          metrics: null,
          result: null,
          error: null,
        })

        try {
          // Start the scan API call (returns immediately with scanId)
          const response = await fetch('/api/scan', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              url: domain.startsWith('http') ? domain : `https://${domain}`,
              depth: '1',
              prettify: false,
              quality: 'standard',
              budget: 0.15,
              mode: 'accurate'
            }),
          })

          if (!response.ok) {
            throw new Error(`Scan failed with status ${response.status}`)
          }

          const apiResponse = await response.json()

          if (apiResponse.status === 'failed') {
            throw new Error(apiResponse.error || 'Scan failed')
          }

          // Check if this is a direct result (no SSE) or an SSE-based scan
          if (apiResponse.scanId) {
            // SSE-based scan - connect to progress stream
            const scanId = apiResponse.scanId
            set({ scanId })

            // Connect to SSE
            const eventSource = new EventSource(`/api/scan/progress?scanId=${scanId}`)

            eventSource.onmessage = (event) => {
              try {
                const data = JSON.parse(event.data)

                if (data.type === 'connected') {
                  console.log('Connected to scan progress stream')
                } else if (data.type === 'progress') {
                  get().updateProgress({
                    step: data.step || 0,
                    totalSteps: data.totalSteps || 16,
                    phase: data.phase || '',
                    message: data.message || '',
                    time: data.time,
                    details: data.details,
                    logs: data.logs,
                    timestamp: data.timestamp
                  })
                } else if (data.type === 'metrics') {
                  get().updateMetrics(data.metrics)
                } else if (data.type === 'complete') {
                  // Scan complete - result data included in complete event
                  eventSource.close()
                  if (data.data) {
                    get().setResult(data.data)
                  } else {
                    set({ error: 'No scan result data received', isScanning: false })
                  }
                } else if (data.type === 'error') {
                  eventSource.close()
                  set({ error: data.message || 'Scan failed', isScanning: false })
                }
              } catch (error) {
                console.error('Error parsing SSE message:', error)
              }
            }

            eventSource.onerror = (error) => {
              console.error('SSE error:', error)
              eventSource.close()
              set({ error: 'Connection lost to scan progress', isScanning: false })
            }

            set({ eventSource })
          } else {
            // Direct result - no SSE
            console.log('📦 Direct scan result received (no SSE)')
            get().setResult(apiResponse)
          }

        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Scan failed',
            isScanning: false,
          })
        }
      },

      updateProgress: (progress) => {
        set({ progress })
      },

      updateMetrics: (metrics) => {
        set({ metrics })
      },

      setResult: (result) => {
        const state = get()
        const syncedMetrics = result.liveMetrics
          ? {
              ...result.liveMetrics,
              tokens: result.summary.tokensExtracted,
            }
          : {
              cssRules: result.metadata?.cssSources ?? 0,
              variables: 0,
              colors: result.curatedTokens?.colors?.length ?? 0,
              tokens: result.summary.tokensExtracted,
              qualityScore: result.summary.confidence,
            }

        set({
          result,
          isScanning: false,
          metrics: syncedMetrics,
          scanId: result.metadata?.scanId || result.database?.scanId || state.scanId,
        })
      },

      setError: (error) => {
        set({
          error,
          isScanning: false
        })
      },

      resetScan: () => {
        const state = get()
        if (state.eventSource) {
          state.eventSource.close()
        }
        set({
          isScanning: false,
          currentDomain: null,
          scanId: null,
          progress: null,
          metrics: null,
          result: null,
          error: null,
          eventSource: null,
        })
      },

      cancelScan: () => {
        const state = get()
        if (state.eventSource) {
          state.eventSource.close()
        }
        set({
          isScanning: false,
          eventSource: null,
        })
      },
    }),
    { name: 'ScanStore' }
  )
)
