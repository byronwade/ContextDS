"use client"

import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import { useScanStore } from '@/stores/scan-store'

interface ScanStep {
  id: string
  label: string
  status: 'pending' | 'active' | 'complete'
  time?: number
}

interface ScanLiveMetrics {
  cssRules?: number
  variables?: number
  colors?: number
  tokens?: number
  qualityScore?: number
}

const createInitialSteps = (): ScanStep[] => [
  { id: '1', label: 'fetch-html', status: 'pending' },
  { id: '2', label: 'extract-css', status: 'pending' },
  { id: '3', label: 'parse-rules', status: 'pending' },
  { id: '4', label: 'extract-colors', status: 'pending' },
  { id: '5', label: 'extract-typography', status: 'pending' },
  { id: '6', label: 'extract-spacing', status: 'pending' },
  { id: '7', label: 'generate-tokens', status: 'pending' },
  { id: '8', label: 'calculate-quality', status: 'pending' },
]

interface ScanProgressViewerProps {
  domain: string
  scanId?: string | null
  metrics?: ScanLiveMetrics | null
}

export function ScanProgressViewer({ domain, scanId: propScanId, metrics: propMetrics }: ScanProgressViewerProps) {
  const { progress, metrics: realMetrics, scanId: storeScanId } = useScanStore()
  const scanId = storeScanId || propScanId
  const metrics = realMetrics || propMetrics

  const [steps, setSteps] = useState<ScanStep[]>(() => createInitialSteps())
  const [elapsed, setElapsed] = useState(0)
  const [liveMetrics, setLiveMetrics] = useState<ScanLiveMetrics>({
    cssRules: 0,
    variables: 0,
    colors: 0,
    tokens: 0,
    qualityScore: 0
  })
  const startTimeRef = useRef(Date.now())
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  // Reset on new scan
  useEffect(() => {
    startTimeRef.current = Date.now()
    setElapsed(0)
    setSteps(createInitialSteps())
  }, [domain, scanId])

  // Timer for elapsed time
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setElapsed((Date.now() - startTimeRef.current) / 1000)
    }, 50)

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    }
  }, [])

  // Update steps from real progress (SSE)
  useEffect(() => {
    if (!progress) return

    setSteps(prev => prev.map((step, index) => {
      if (index < (progress.step || 0)) {
        return { ...step, status: 'complete' as const }
      }
      if (index === (progress.step || 0)) {
        return { ...step, status: 'active' as const }
      }
      return step
    }))
  }, [progress])

  // Update live metrics from SSE
  useEffect(() => {
    if (metrics) {
      setLiveMetrics({
        cssRules: metrics.cssRules ?? 0,
        variables: metrics.variables ?? 0,
        colors: metrics.colors ?? 0,
        tokens: metrics.tokens ?? 0,
        qualityScore: metrics.qualityScore ?? 0
      })
    }
  }, [metrics])

  // Complete all steps when metrics received (scan complete)
  useEffect(() => {
    if (!metrics) return

    const finalElapsed = (Date.now() - startTimeRef.current) / 1000

    setSteps(prev => prev.map((step, index) => {
      if (step.status === 'complete') return step
      const completionTime = index === prev.length - 1
        ? Number(finalElapsed.toFixed(1))
        : step.time
      return {
        ...step,
        status: 'complete' as const,
        time: completionTime ?? undefined
      }
    }))

    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }

    setElapsed(finalElapsed)
  }, [metrics])

  // Fallback simulated progress if no SSE (should never happen in production)
  useEffect(() => {
    // Skip if we have real progress from SSE or final metrics
    if (progress || metrics) return

    // Basic fallback - just show first step as active
    const timer = setTimeout(() => {
      setSteps(prev => prev.map((s, i) =>
        i === 0 ? { ...s, status: 'active' as const } : s
      ))
    }, 100)

    return () => clearTimeout(timer)
  }, [progress, metrics])

  const waitingForResult = !metrics && steps[7]?.status === 'active'

  const completedCount = steps.filter(s => s.status === 'complete').length
  const progressPercent = Math.round((completedCount / steps.length) * 100)

  return (
    <div className="w-full max-w-5xl mx-auto">

      {/* Header - grep.app style */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <h2 className="text-lg font-medium text-foreground font-mono">
            {domain}
          </h2>
        </div>
        <div className="text-sm text-grep-9 font-mono tabular-nums">
          {elapsed.toFixed(2)}s elapsed
        </div>
      </div>

      {/* Progress bar */}
      <div className="mb-6 rounded-md border border-grep-2 bg-grep-0 overflow-hidden">
        <div className="h-2 bg-grep-2">
          <div
            className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-200 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Main content - side by side */}
      <div className="grid md:grid-cols-2 gap-4">

        {/* Left: Steps */}
        <div className="rounded-md border border-grep-2 bg-grep-0 overflow-hidden">
          <div className="border-b border-grep-2 bg-background px-4 py-2.5">
            <span className="text-xs text-grep-9 font-mono uppercase tracking-wide">
              Pipeline • {completedCount}/{steps.length}
            </span>
          </div>
          <div className="divide-y divide-grep-2">
            {steps.map((step) => (
              <div
                key={step.id}
                className={cn(
                  "px-4 py-3 flex items-center justify-between transition-all",
                  step.status === 'active' && "bg-background",
                  step.status === 'pending' && "opacity-40"
                )}
              >
                <div className="flex items-center gap-2.5">
                  <span className={cn(
                    "text-sm font-mono",
                    step.status === 'complete' && "text-emerald-500",
                    step.status === 'active' && "text-emerald-500",
                    step.status === 'pending' && "text-grep-7"
                  )}>
                    {step.status === 'complete' ? '✓' : step.status === 'active' ? '○' : '○'}
                  </span>
                  <span className={cn(
                    "text-sm font-mono",
                    step.status === 'active' && "text-foreground font-semibold",
                    step.status === 'complete' && "text-grep-9",
                    step.status === 'pending' && "text-grep-7"
                  )}>
                    {step.label}
                  </span>
                </div>
                {step.time && step.status === 'complete' && (
                  <span className="text-xs font-mono text-grep-7 tabular-nums">
                    {step.time.toFixed(1)}s
                  </span>
                )}
                {step.status === 'active' && (
                  <div className="flex gap-1">
                    <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
                    <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse [animation-delay:150ms]" />
                    <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse [animation-delay:300ms]" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Right: Live metrics */}
        <div className="rounded-md border border-grep-2 bg-grep-0 overflow-hidden">
          <div className="border-b border-grep-2 bg-background px-4 py-2.5">
            <span className="text-xs text-grep-9 font-mono uppercase tracking-wide">
              Live Metrics
            </span>
          </div>
          <div className="p-4 space-y-4">
            <div className="flex items-baseline justify-between pb-3 border-b border-grep-2">
              <span className="text-xs text-grep-9 font-mono">CSS Rules</span>
              <span className="text-2xl font-bold text-foreground tabular-nums">
                {(liveMetrics.cssRules ?? 0).toLocaleString()}
              </span>
            </div>
            <div className="flex items-baseline justify-between pb-3 border-b border-grep-2">
              <span className="text-xs text-grep-9 font-mono">Variables</span>
              <span className="text-2xl font-bold text-foreground tabular-nums">
                {(liveMetrics.variables ?? 0).toLocaleString()}
              </span>
            </div>
            <div className="flex items-baseline justify-between pb-3 border-b border-grep-2">
              <span className="text-xs text-grep-9 font-mono">Colors</span>
              <span className="text-2xl font-bold text-foreground tabular-nums">
                {(liveMetrics.colors ?? 0).toLocaleString()}
              </span>
            </div>
            <div className="flex items-baseline justify-between pb-3 border-b border-grep-2">
              <span className="text-xs text-grep-9 font-mono">Tokens</span>
              <span className="text-2xl font-bold text-foreground tabular-nums">
                {(liveMetrics.tokens ?? 0).toLocaleString()}
              </span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-xs text-grep-9 font-mono">Quality</span>
              <span className="text-3xl font-bold text-foreground tabular-nums">
                {liveMetrics.qualityScore ? `${Math.round(liveMetrics.qualityScore)}%` : '0%'}
              </span>
            </div>
            {waitingForResult && (
              <div className="mt-3 rounded-md border border-dashed border-grep-3 bg-grep-1 px-3 py-2 text-xs font-mono text-grep-8">
                Finalizing results… hang tight while we capture the remaining tokens.
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Footer hint */}
      <div className="mt-6 text-center">
        <p className="text-xs text-grep-9 font-mono">
          Extracting design tokens from {domain}...
        </p>
      </div>

    </div>
  )
}
