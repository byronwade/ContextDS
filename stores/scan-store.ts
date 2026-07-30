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
          // Client-side phase feedback while the serverless scan runs
          const phases = [
            {
              step: 1,
              phase: 'collect',
              message:
                mode === 'accurate'
                  ? 'Browser capture + public CSS'
                  : 'Collecting public CSS',
            },
            { step: 2, phase: 'tokenize', message: 'W3C tokens + Project Wallace' },
            { step: 3, phase: 'layout', message: 'Profiling layout DNA' },
            { step: 4, phase: 'design-md', message: 'Composing Design Contract pack' },
            { step: 5, phase: 'persist', message: 'Saving scan results' },
          ]
          let phaseIndex = 0
          const tick = () => {
            const phase = phases[Math.min(phaseIndex, phases.length - 1)]
            get().updateProgress({
              step: phase.step,
              totalSteps: phases.length,
              phase: phase.phase,
              message: phase.message,
              timestamp: Date.now(),
            })
            phaseIndex += 1
          }
          tick()
          const progressTimer = setInterval(tick, 900)

          try {
            const response = await fetch('/api/scan', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                url: domain.startsWith('http') ? domain : `https://${domain}`,
                depth: '1',
                prettify: false,
                quality: 'standard',
                budget: 0.15,
                mode,
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
          } finally {
            clearInterval(progressTimer)
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
