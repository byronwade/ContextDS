"use client"

import { useEffect, useState, useRef } from "react"
import { cn } from "@/lib/utils"
import {
  ProgressiveLoader,
  useProgressiveLoader,
  type ProgressiveState,
  type ProgressivePhase,
  PROGRESSIVE_PHASES
} from "@/lib/utils/progressive-loader"

// Import skeleton components
import { RealtimeScanningOverview } from "@/components/molecules/realtime-scanning-skeleton"
import { RealtimeTokensSkeleton } from "@/components/molecules/realtime-tokens-skeleton"
import {
  OverviewSkeleton,
  ScreenshotsSkeleton,
  AnalysisSkeleton,
  ComponentsSkeleton,
  TokensSkeleton,
  TypographySkeleton,
  BrandSkeleton,
  LayoutSkeleton
} from "@/components/molecules/section-skeletons"

// Import actual result components
import { ScanResultsLayout } from "./scan-results-layout"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/atoms/skeleton"

interface ProgressiveScanResultsProps {
  scanId?: string
  domain?: string
  url?: string
  onScanComplete?: (result: any) => void
  onError?: (error: Error) => void
  className?: string
}

interface ScanResultData {
  domain?: string
  url?: string
  favicon?: string
  summary?: {
    tokensExtracted: number
    confidence: number
    completeness: number
    reliability: number
    processingTime: number
  }
  tokens?: any
  curatedTokens?: any
  layoutDNA?: any
  promptPack?: any
  brandAnalysis?: any
  componentLibrary?: any
  comprehensiveAnalysis?: any
  designSystemSpec?: any
  screenshots?: any[]
  metadata?: any
  database?: any
}

export function ProgressiveScanResults({
  scanId,
  domain,
  url,
  onScanComplete,
  onError,
  className
}: ProgressiveScanResultsProps) {
  const [scanData, setScanData] = useState<ScanResultData | null>(null)
  const [currentPhase, setCurrentPhase] = useState<ProgressivePhase>('initializing')
  const [showAdvanced, setShowAdvanced] = useState(false)

  const loader = useRef<ProgressiveLoader<ScanResultData>>(
    new ProgressiveLoader<ScanResultData>({
      skeletonTimeout: 1500, // Show skeleton for max 1.5s
      minSkeletonDuration: 200, // Min 200ms for smooth transitions
      transitionDuration: 250, // 250ms CSS transitions
      streamingEnabled: true
    })
  )

  const [progressiveState, setProgressiveState] = useState<ProgressiveState<ScanResultData>>(
    loader.current.getState()
  )

  useEffect(() => {
    // Subscribe to progressive state changes
    const unsubscribe = loader.current.subscribe((state) => {
      setProgressiveState(state)

      if (state.data) {
        setScanData(state.data)
      }

      if (state.status === 'complete' && state.data && onScanComplete) {
        onScanComplete(state.data)
      }

      if (state.status === 'error' && state.error && onError) {
        onError(state.error)
      }
    })

    // Start progressive loading immediately
    console.log('🚀 Starting progressive scan results - skeletons show immediately')
    loader.current.start()

    return () => {
      unsubscribe()
      loader.current.destroy()
    }
  }, [onScanComplete, onError])

  // Simulate receiving progressive updates (in real app, this would come from scanning system)
  useEffect(() => {
    if (!scanId) return

    // Simulate progressive data streaming
    const simulateProgressiveUpdates = () => {
      setTimeout(() => {
        loader.current.update({
          phase: 'css-collection',
          step: 'static-css-collected',
          data: {
            domain,
            url,
            summary: { tokensExtracted: 45, confidence: 0, completeness: 0.2, reliability: 0.1, processingTime: 0 }
          },
          progress: 15
        })
      }, 300) // 300ms - First data arrives

      setTimeout(() => {
        loader.current.update({
          phase: 'token-generation',
          step: 'legacy-tokens-generated',
          data: {
            tokens: { colors: ['#FF0000', '#00FF00', '#0000FF'], typography: { families: ['Inter'] } },
            summary: { tokensExtracted: 127, confidence: 0.6, completeness: 0.5, reliability: 0.4, processingTime: 800 }
          },
          progress: 45
        })
      }, 800) // 800ms - Tokens arrive

      setTimeout(() => {
        loader.current.update({
          phase: 'analysis',
          step: 'layout-analysis-complete',
          data: {
            layoutDNA: { containers: [], spacing: [], archetypes: [] },
            summary: { tokensExtracted: 156, confidence: 0.75, completeness: 0.7, reliability: 0.6, processingTime: 1200 }
          },
          progress: 70
        })
      }, 1200) // 1.2s - Layout analysis

      setTimeout(() => {
        loader.current.update({
          phase: 'ai-processing',
          step: 'ai-insights-generated',
          data: {
            comprehensiveAnalysis: { recommendations: { quick_wins: [], critical: [] } },
            brandAnalysis: { mood: 'modern', personality: [] },
            summary: { tokensExtracted: 189, confidence: 0.85, completeness: 0.9, reliability: 0.8, processingTime: 1800 }
          },
          progress: 90
        })
      }, 1800) // 1.8s - AI insights

      setTimeout(() => {
        loader.current.complete({
          domain: domain || 'example.com',
          url: url || 'https://example.com',
          favicon: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
          summary: { tokensExtracted: 234, confidence: 0.92, completeness: 1.0, reliability: 0.95, processingTime: 2200 },
          tokens: { colors: ['#FF0000', '#00FF00', '#0000FF'], typography: { families: ['Inter', 'Roboto'] } },
          curatedTokens: { colors: ['#FF0000', '#00FF00', '#0000FF'], typography: { families: ['Inter', 'Roboto'] } },
          layoutDNA: { containers: [], spacing: [], archetypes: [] },
          promptPack: { version: '1.0' },
          brandAnalysis: { mood: 'modern', personality: ['clean', 'professional'] },
          componentLibrary: { summary: { totalComponents: 12 } },
          comprehensiveAnalysis: { recommendations: { quick_wins: ['Use consistent spacing'], critical: [] } },
          metadata: { cssSources: 15, scanId },
          database: { siteId: 'site-123', scanId, tokenSetId: 'tokens-123', stored: true }
        })
      }, 2200) // 2.2s - Complete scan
    }

    simulateProgressiveUpdates()
  }, [scanId, domain, url])

  const shouldShowSkeleton = loader.current.shouldShowSkeleton()
  const transitionClasses = loader.current.getTransitionClasses()

  const progressPercentage = progressiveState.progress.step / progressiveState.progress.totalSteps * 100

  // Handle copy, export, share functions
  const handleCopy = (value: string) => {
    navigator.clipboard.writeText(value)
  }

  const handleExport = (format: string) => {
    console.log('Export:', format)
  }

  const handleShare = () => {
    console.log('Share results')
  }

  return (
    <div className={cn("h-full w-full", className)}>
      {/* Progressive Loading Header */}
      {(shouldShowSkeleton || progressiveState.status !== 'complete') && (
        <div className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-neutral-200 dark:border-neutral-700 px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={cn(
                "w-2 h-2 rounded-full",
                progressiveState.status === 'complete' ? "bg-green-500" :
                progressiveState.status === 'error' ? "bg-red-500" :
                "bg-blue-500 animate-pulse"
              )} />
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  {shouldShowSkeleton ? (
                    <Skeleton className="h-5 w-32" />
                  ) : (
                    <span className="text-sm font-medium">
                      {domain || url || 'Scanning...'}
                    </span>
                  )}
                  <Badge variant="secondary" className="text-xs font-mono">
                    {PROGRESSIVE_PHASES[progressiveState.progress.phase as ProgressivePhase]}
                  </Badge>
                </div>
                {progressiveState.progress.estimatedCompletion > 0 && (
                  <span className="text-xs text-muted-foreground">
                    Est. {Math.round((progressiveState.progress.estimatedCompletion - (Date.now() - progressiveState.timestamp)) / 1000)}s remaining
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Progress value={progressPercentage} className="w-24 h-2" />
              <span className="text-xs text-muted-foreground font-mono">
                {Math.round(progressPercentage)}%
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Content Area with Progressive Loading */}
      <div className={cn("h-full overflow-hidden", transitionClasses)}>
        {shouldShowSkeleton ? (
          // INSTANT SKELETONS (render immediately for <50ms response)
          <div className="h-full overflow-auto">
            <div className="max-w-7xl mx-auto p-6 space-y-8">
              {/* Enhanced real-time scanning overview */}
              <RealtimeScanningOverview
                domain={domain}
                progress={{
                  phase: PROGRESSIVE_PHASES[progressiveState.progress.phase as ProgressivePhase],
                  step: progressiveState.progress.step,
                  totalSteps: progressiveState.progress.totalSteps
                }}
              />

              {/* Real-time tokens discovery */}
              <RealtimeTokensSkeleton />

              {/* Static section skeletons */}
              <ScreenshotsSkeleton />
              <AnalysisSkeleton />

              {/* Advanced sections - only show if user requested */}
              {showAdvanced && (
                <>
                  <ComponentsSkeleton />
                  <TypographySkeleton />
                  <BrandSkeleton />
                  <LayoutSkeleton />
                </>
              )}

              {/* Show Advanced Button */}
              {!showAdvanced && (
                <div className="text-center py-8">
                  <button
                    onClick={() => setShowAdvanced(true)}
                    className="px-4 py-2 bg-neutral-100 dark:bg-neutral-800 rounded-lg text-sm font-medium hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
                  >
                    Show Advanced Analysis
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : (
          // REAL DATA (streams in progressively)
          scanData && (
            <ScanResultsLayout
              result={scanData}
              isLoading={progressiveState.status !== 'complete'}
              scanId={scanId}
              progress={{
                step: progressiveState.progress.step,
                totalSteps: progressiveState.progress.totalSteps,
                phase: PROGRESSIVE_PHASES[progressiveState.progress.phase as ProgressivePhase],
                message: PROGRESSIVE_PHASES[progressiveState.progress.phase as ProgressivePhase],
                timestamp: progressiveState.timestamp
              }}
              error={progressiveState.error?.message}
              onCopy={handleCopy}
              onExport={handleExport}
              onShare={handleShare}
              onNewScan={() => window.location.reload()}
              onScanHistory={() => console.log('Show history')}
            />
          )
        )}
      </div>

      {/* Performance Debug Info (development only) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed bottom-4 right-4 bg-black/80 text-white text-xs p-2 rounded font-mono z-50">
          Status: {progressiveState.status} |
          Phase: {progressiveState.progress.phase} |
          Step: {progressiveState.progress.step}/{progressiveState.progress.totalSteps} |
          Skeleton: {shouldShowSkeleton ? 'Y' : 'N'} |
          Time: {Date.now() - progressiveState.timestamp}ms
        </div>
      )}
    </div>
  )
}

/**
 * Integration with the ultra-parallel scan orchestrator
 * This would be called from the scanning system to provide real-time updates
 */
export function connectToScanOrchestrator(
  progressiveLoader: ProgressiveLoader<ScanResultData>,
  scanId: string
) {
  console.log('🔗 Connecting progressive loader to ultra-parallel scan orchestrator')

  // In a real implementation, this would listen to the scan orchestrator events
  // and call progressiveLoader.update() with real data as it becomes available

  return () => {
    console.log('🔌 Disconnected from scan orchestrator')
  }
}