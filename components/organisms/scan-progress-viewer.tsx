"use client"

import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

interface ScanStep {
  id: string
  label: string
  status: 'pending' | 'active' | 'complete' | 'error'
  data?: string
  time?: string
  details?: string[]
}

interface ScanProgressViewerProps {
  domain: string
}

export function ScanProgressViewer({ domain }: ScanProgressViewerProps) {
  const [steps, setSteps] = useState<ScanStep[]>([
    { id: '1', label: 'fetch', status: 'pending' },
    { id: '2', label: 'parse', status: 'pending' },
    { id: '3', label: 'extract-colors', status: 'pending' },
    { id: '4', label: 'extract-typography', status: 'pending' },
    { id: '5', label: 'extract-spacing', status: 'pending' },
    { id: '6', label: 'extract-shadows', status: 'pending' },
    { id: '7', label: 'generate-tokens', status: 'pending' },
    { id: '8', label: 'analyze', status: 'pending' },
  ])

  const [elapsed, setElapsed] = useState(0)
  const [currentPhase, setCurrentPhase] = useState('')

  useEffect(() => {
    const startTime = Date.now()
    const timer = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTime) / 1000))
    }, 100) // Update more frequently for smooth counting

    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    // Realistic progressive step updates with detailed data
    const timings = [
      {
        step: 0,
        delay: 800,
        data: '3 stylesheets · 247 rules · 42KB',
        time: '0.8s',
        details: ['Downloaded HTML', 'Found 3 <link> tags', 'Fetched external CSS'],
        phase: 'Downloading assets'
      },
      {
        step: 1,
        delay: 2500,
        data: '1,847 declarations parsed',
        time: '1.7s',
        details: ['PostCSS AST built', 'Variables collected', 'Rules indexed'],
        phase: 'Building CSS tree'
      },
      {
        step: 2,
        delay: 5000,
        data: '64 colors · 12 primary · 52 shades',
        time: '2.5s',
        details: ['Extracted from properties', 'Deduplicated similar', 'Grouped by hue'],
        phase: 'Analyzing color palette'
      },
      {
        step: 3,
        delay: 7200,
        data: '3 families · 8 weights · 6 sizes',
        time: '2.2s',
        details: ['Font stacks parsed', 'Weights categorized', 'Scale detected'],
        phase: 'Extracting typography'
      },
      {
        step: 4,
        delay: 9000,
        data: '32 values · 8px base scale',
        time: '1.8s',
        details: ['Margin/padding found', 'Base unit detected', 'Scale validated'],
        phase: 'Mapping spacing system'
      },
      {
        step: 5,
        delay: 10800,
        data: '12 shadows · 4 elevations',
        time: '1.8s',
        details: ['Box-shadow parsed', 'Layers detected', 'Elevation mapped'],
        phase: 'Detecting depth system'
      },
      {
        step: 6,
        delay: 12500,
        data: '247 tokens in W3C format',
        time: '1.7s',
        details: ['Tokens serialized', 'Metadata attached', 'Schema validated'],
        phase: 'Generating token set'
      },
      {
        step: 7,
        delay: 14000,
        data: '92% confidence · 96% complete',
        time: '1.5s',
        details: ['Quality scored', 'AI analysis run', 'Layout DNA built'],
        phase: 'Finalizing analysis'
      },
    ]

    const timeouts = timings.map(({ step, delay, data, time, details, phase }) => {
      // Mark as active
      const activeTimeout = setTimeout(() => {
        setCurrentPhase(phase)
        setSteps(prev => prev.map((s, i) => {
          if (i < step) return { ...s, status: 'complete' as const }
          if (i === step) return { ...s, status: 'active' as const, data, time, details }
          return s
        }))
      }, delay)

      // Mark as complete after a realistic duration
      const completeTimeout = setTimeout(() => {
        setSteps(prev => prev.map((s, i) =>
          i === step ? { ...s, status: 'complete' as const } : s
        ))
      }, delay + 1200)

      return [activeTimeout, completeTimeout]
    }).flat()

    return () => timeouts.forEach(clearTimeout)
  }, [])

  const completedCount = steps.filter(s => s.status === 'complete').length
  const progressPercent = Math.round((completedCount / steps.length) * 100)

  return (
    <div className="w-full max-w-5xl mx-auto">

      {/* Header - Fixed Height */}
      <div className="mb-6 flex items-center justify-between border-b border-grep-2 pb-4 h-12">
        <div className="flex items-center gap-3">
          <div className="relative w-3 h-3">
            <div className="absolute inset-0 rounded-full bg-emerald-500 animate-pulse" />
            <div className="absolute inset-0 rounded-full bg-emerald-500 animate-ping opacity-30" />
          </div>
          <h2 className="text-lg font-medium text-foreground font-mono">
            {domain}
          </h2>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-grep-9 font-mono">{currentPhase || 'Initializing...'}</span>
          <span className="text-sm text-grep-9 font-mono tabular-nums">
            {elapsed.toFixed(1)}s
          </span>
        </div>
      </div>

      {/* Progress Bar - Above Table */}
      <div className="mb-4 flex items-center gap-3">
        <div className="flex-1 h-1 bg-grep-2 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <span className="text-xs text-grep-9 tabular-nums font-mono w-10 text-right">
          {progressPercent}%
        </span>
      </div>

      {/* Steps Table - Fixed Layout to Prevent Resize */}
      <div className="rounded-md border border-grep-2 bg-grep-0 overflow-hidden">
        <div className="divide-y divide-grep-2">
          {steps.map((step, index) => (
            <div
              key={step.id}
              className={cn(
                "transition-all duration-300 ease-out",
                step.status === 'active' && "bg-background"
              )}
            >
              {/* Main Row - Fixed Height */}
              <div className="h-12 px-4 flex items-center gap-4">
                {/* Status Icon - Fixed Width */}
                <span className={cn(
                  "shrink-0 w-5 text-center font-mono transition-all duration-200",
                  step.status === 'pending' && "text-grep-7 scale-90 opacity-40",
                  step.status === 'active' && "text-emerald-600 dark:text-emerald-400 scale-110",
                  step.status === 'complete' && "text-green-600 dark:text-green-400 scale-100"
                )}>
                  {step.status === 'pending' && '○'}
                  {step.status === 'active' && (
                    <span className="inline-block animate-spin">⟳</span>
                  )}
                  {step.status === 'complete' && '✓'}
                </span>

                {/* Label - Fixed Width */}
                <div className="w-40 shrink-0">
                  <span className={cn(
                    "font-mono text-[13px] transition-colors duration-200",
                    step.status === 'pending' && "text-grep-7",
                    step.status === 'active' && "text-foreground font-semibold",
                    step.status === 'complete' && "text-grep-9"
                  )}>
                    {step.label}
                  </span>
                </div>

                {/* Time - Fixed Width with Fade */}
                <div className="w-12 shrink-0 text-right">
                  {step.time && (
                    <span className={cn(
                      "text-xs tabular-nums font-mono transition-all duration-300",
                      step.status === 'complete' ? "text-grep-9 opacity-100" : "text-grep-7 opacity-0"
                    )}>
                      {step.time}
                    </span>
                  )}
                </div>

                {/* Data Output - Flexible but smooth */}
                <div className="flex-1 min-w-0">
                  {step.data && (
                    <div className={cn(
                      "font-mono text-xs transition-all duration-300 ease-out truncate",
                      step.status === 'pending' && "opacity-0 translate-x-2",
                      step.status === 'active' && "text-grep-9 opacity-100 translate-x-0",
                      step.status === 'complete' && "text-grep-7 opacity-70 translate-x-0"
                    )}>
                      {step.data}
                    </div>
                  )}
                </div>

                {/* Active Spinner - Fixed Width */}
                <div className="w-6 shrink-0 text-right">
                  {step.status === 'active' && (
                    <span className="inline-block text-grep-7 text-xs animate-pulse">
                      •••
                    </span>
                  )}
                </div>
              </div>

              {/* Details Row - Collapsible with Fixed Max Height */}
              {step.details && step.status !== 'pending' && (
                <div className={cn(
                  "overflow-hidden transition-all duration-500 ease-out",
                  step.status === 'active' || step.status === 'complete'
                    ? "max-h-20 opacity-100"
                    : "max-h-0 opacity-0"
                )}>
                  <div className="px-4 pb-3 pl-[52px]">
                    <div className="space-y-1">
                      {step.details.map((detail, idx) => (
                        <div
                          key={idx}
                          className={cn(
                            "flex items-center gap-2 text-[11px] transition-all duration-300 ease-out",
                            `animation-delay-${idx * 100}`
                          )}
                          style={{
                            animationDelay: `${idx * 100}ms`,
                            opacity: step.status === 'active' ? 1 : 0.5
                          }}
                        >
                          <span className="text-grep-7">→</span>
                          <span className={cn(
                            "text-grep-9 transition-colors duration-200",
                            step.status === 'active' && "text-grep-9"
                          )}>
                            {detail}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Footer - Fixed Height */}
        <div className="bg-background h-10 px-4 flex items-center justify-between text-xs border-t border-grep-2">
          <span className="text-grep-9 font-mono">
            Scanning <span className="text-foreground font-semibold">{domain}</span>
          </span>
          <div className="flex items-center gap-3">
            <span className={cn(
              "text-grep-9 font-mono tabular-nums transition-colors duration-300",
              completedCount === steps.length && "text-green-600 dark:text-green-400 font-semibold"
            )}>
              {completedCount}/{steps.length} complete
            </span>
          </div>
        </div>
      </div>

      {/* Live Stats - Additional Context */}
      <div className="mt-4 grid grid-cols-3 gap-4 text-center">
        <div className={cn(
          "p-3 rounded border border-grep-2 bg-grep-0 transition-all duration-300",
          completedCount >= 2 && "border-green-300 dark:border-green-900 bg-green-50/30 dark:bg-green-950/10"
        )}>
          <div className={cn(
            "text-xl font-bold font-mono tabular-nums transition-all duration-300",
            completedCount >= 2 ? "text-foreground" : "text-grep-7"
          )}>
            {completedCount >= 2 ? '1,847' : '—'}
          </div>
          <div className="text-[10px] text-grep-9 font-mono uppercase tracking-wide">CSS Rules</div>
        </div>
        <div className={cn(
          "p-3 rounded border border-grep-2 bg-grep-0 transition-all duration-300",
          completedCount >= 6 && "border-blue-300 dark:border-blue-900 bg-blue-50/30 dark:bg-blue-950/10"
        )}>
          <div className={cn(
            "text-xl font-bold font-mono tabular-nums transition-all duration-300",
            completedCount >= 6 ? "text-foreground" : "text-grep-7"
          )}>
            {completedCount >= 6 ? '247' : '—'}
          </div>
          <div className="text-[10px] text-grep-9 font-mono uppercase tracking-wide">Tokens</div>
        </div>
        <div className={cn(
          "p-3 rounded border border-grep-2 bg-grep-0 transition-all duration-300",
          completedCount >= 7 && "border-purple-300 dark:border-purple-900 bg-purple-50/30 dark:bg-purple-950/10"
        )}>
          <div className={cn(
            "text-xl font-bold font-mono tabular-nums transition-all duration-300",
            completedCount >= 7 ? "text-foreground" : "text-grep-7"
          )}>
            {completedCount >= 7 ? '92%' : '—'}
          </div>
          <div className="text-[10px] text-grep-9 font-mono uppercase tracking-wide">Confidence</div>
        </div>
      </div>

      {/* Subtle Help Text */}
      <div className="mt-6 text-center">
        <p className="text-xs text-grep-9 font-mono">
          {completedCount === steps.length
            ? '✓ Scan complete - redirecting to results...'
            : 'Extracting design tokens and analyzing patterns...'}
        </p>
      </div>
    </div>
  )
}