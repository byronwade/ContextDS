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
  storage?: any
  designSystemSpec?: any
  componentLibrary?: any
  designMd?: {
    markdown: string
    fileName: string
    summary?: {
      colorCount: number
      typographyCount: number
      spacingCount: number
      hasComponents: boolean
    }
  }
  designSkill?: {
    markdown: string
    fileName: string
    skillName: string
    description: string
  }
  designContract?: {
    slug: string
    title: string
    profile: string
    installCommand: string
    summary?: {
      colorCount: number
      typographyCount: number
      spacingCount: number
      fileCount: number
    }
    files?: Array<{ path: string; content: string }>
  }
  /** Linked token↔role↔component↔layout model */
  semanticGraph?: {
    schemaVersion: number
    summary: {
      nodeCount: number
      edgeCount: number
      tokenCount: number
      roleCount: number
      componentCount: number
      layoutCount: number
      patternCount: number
    }
    nodes: unknown[]
    edges: unknown[]
    index?: unknown
  }
  screenshots?: Array<{ label: string; url: string; mime?: string; viewport?: string }>
  cacheHit?: boolean
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
  startScan: (domain: string, mode?: 'fast' | 'accurate') => Promise<void>
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

      startScan: async (domain: string, mode: 'fast' | 'accurate' = 'fast') => {
        const state = get()

        // Cancel any existing scan
        if (state.eventSource) {
          state.eventSource.close()
        }

        const scanId = `scan_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`

        // Reset state
        set({
          isScanning: true,
          currentDomain: domain,
          scanId,
          progress: {
            step: 0,
            totalSteps: 6,
            phase: 'queued',
            message: 'Starting scan…',
            timestamp: Date.now(),
          },
          metrics: null,
          result: null,
          error: null,
          eventSource: null,
        })

        // Subscribe to server-emitted phases before the scan POST begins.
        // On multi-instance serverless, SSE may miss events — keep a local fallback.
        let eventSource: EventSource | null = null
        let sawServerProgress = false
        const fallbackPhases = [
          {
            step: 1,
            phase: 'collect',
            message: mode === 'accurate' ? 'Browser capture + public CSS' : 'Collecting public CSS',
          },
          { step: 2, phase: 'tokenize', message: 'W3C tokens + Project Wallace' },
          { step: 3, phase: 'layout', message: 'Profiling layout DNA' },
          { step: 4, phase: 'graph', message: 'Building semantic design graph' },
          { step: 5, phase: 'design-md', message: 'Composing Design Contract pack' },
          { step: 6, phase: 'persist', message: 'Saving scan results' },
        ]
        let fallbackIndex = 0
        const fallbackTimer = setInterval(() => {
          if (sawServerProgress) return
          const phase = fallbackPhases[Math.min(fallbackIndex, fallbackPhases.length - 1)]
          get().updateProgress({
            step: phase.step,
            totalSteps: fallbackPhases.length,
            phase: phase.phase,
            message: phase.message,
            timestamp: Date.now(),
          })
          fallbackIndex += 1
        }, 900)

        try {
          eventSource = new EventSource(`/api/scan/progress?scanId=${encodeURIComponent(scanId)}`)
          set({ eventSource })

          eventSource.onmessage = (message) => {
            try {
              const event = JSON.parse(message.data) as {
                type?: string
                step?: number
                totalSteps?: number
                phase?: string
                message?: string
                time?: string
                details?: string[]
                logs?: string[]
                metrics?: ScanMetrics
                timestamp?: number
              }

              if (event.type === 'progress') {
                sawServerProgress = true
                get().updateProgress({
                  step: event.step || 0,
                  totalSteps: event.totalSteps || 6,
                  phase: event.phase || 'scanning',
                  message: event.message || 'Scanning…',
                  time: event.time,
                  details: event.details,
                  logs: event.logs,
                  timestamp: event.timestamp || Date.now(),
                })
              }

              if (event.type === 'metrics' && event.metrics) {
                get().updateMetrics({
                  cssRules: event.metrics.cssRules || 0,
                  variables: event.metrics.variables || 0,
                  colors: event.metrics.colors || 0,
                  tokens: event.metrics.tokens || 0,
                  qualityScore: event.metrics.qualityScore || 0,
                })
              }
            } catch {
              // ignore malformed SSE payloads
            }
          }
        } catch {
          eventSource = null
        }

        try {
          const response = await fetch('/api/scan', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              url: domain.startsWith('http') ? domain : `https://${domain}`,
              mode,
              scanId,
              force: false,
            }),
          })

          if (!response.ok) {
            throw new Error(`Scan failed with status ${response.status}`)
          }

          const apiResponse = await response.json()

          if (apiResponse.status === 'failed') {
            throw new Error(apiResponse.error || 'Scan failed')
          }

          get().setResult(apiResponse)
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Scan failed',
            isScanning: false,
          })
        } finally {
          clearInterval(fallbackTimer)
          if (eventSource) {
            eventSource.close()
            set({ eventSource: null })
          }
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
          isScanning: false,
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
