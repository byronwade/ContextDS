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
  const activeStep = steps.find(s => s.status === 'active')

  return (
    <div className="w-full max-w-[800px] mx-auto">

      {/* Clean Header - Grep Style */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <h2 className="text-lg font-medium text-foreground">{domain}</h2>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-grep-9 font-medium tabular-nums">{elapsed}s</span>
          <span className="text-sm text-grep-9">{completedCount}/{steps.length}</span>
        </div>
      </div>

      {/* Progress Bar - Clean */}
      <div className="mb-6">
        <div className="h-2 w-full bg-grep-2 rounded-sm overflow-hidden">
          <div
            className="h-full bg-foreground transition-all duration-500 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <div className="mt-2 flex items-center justify-between text-xs text-grep-9">
          <span>{activeStep?.label || 'Initializing scan...'}</span>
          <span className="tabular-nums">{progressPercent}%</span>
        </div>
      </div>

      {/* Step Log - Grep Style */}
      <div className="space-y-3 mb-6">
        {steps.map((step) => (
          <div
            key={step.id}
            className={cn(
              "transition-opacity duration-300",
              step.status === 'pending' && "opacity-30"
            )}
          >
            <div className="flex items-start gap-3">
              {/* Icon */}
              <div className="mt-1">
                <span className={cn(
                  "inline-block w-4 text-center text-sm",
                  step.status === 'pending' && "text-grep-7",
                  step.status === 'active' && "text-emerald-600 dark:text-emerald-400",
                  step.status === 'complete' && "text-grep-9"
                )}>
                  {step.status === 'pending' && '○'}
                  {step.status === 'active' && '⟳'}
                  {step.status === 'complete' && '✓'}
                </span>
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className={cn(
                    "text-sm font-medium",
                    step.status === 'active' && "text-foreground",
                    step.status === 'complete' && "text-grep-9",
                    step.status === 'pending' && "text-grep-7"
                  )}>
                    {step.label}
                  </span>
                  {step.time && step.status === 'complete' && (
                    <span className="text-xs text-grep-7 tabular-nums">
                      {step.time}
                    </span>
                  )}
                </div>

                {/* Data Output */}
                {step.data && step.status !== 'pending' && (
                  <div className={cn(
                    "text-sm transition-all duration-300",
                    step.status === 'active' && "text-grep-9",
                    step.status === 'complete' && "text-grep-7"
                  )}>
                    {step.data}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Live Stats - Grep Style Cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="border border-grep-2 rounded-sm bg-grep-0 p-4">
          <div className="text-xs text-grep-9 mb-2">CSS Rules</div>
          <div className={cn(
            "text-2xl font-semibold tabular-nums transition-all duration-300",
            completedCount >= 1 ? "text-foreground" : "text-grep-7"
          )}>
            {completedCount >= 1 ? '1,847' : '—'}
          </div>
        </div>
        <div className="border border-grep-2 rounded-sm bg-grep-0 p-4">
          <div className="text-xs text-grep-9 mb-2">Tokens</div>
          <div className={cn(
            "text-2xl font-semibold tabular-nums transition-all duration-300",
            completedCount >= 6 ? "text-foreground" : "text-grep-7"
          )}>
            {completedCount >= 6 ? '247' : '—'}
          </div>
        </div>
        <div className="border border-grep-2 rounded-sm bg-grep-0 p-4">
          <div className="text-xs text-grep-9 mb-2">Quality</div>
          <div className={cn(
            "text-2xl font-semibold tabular-nums transition-all duration-300",
            completedCount >= 7 ? "text-foreground" : "text-grep-7"
          )}>
            {completedCount >= 7 ? '92%' : '—'}
          </div>
        </div>
      </div>
    </div>
  )
}