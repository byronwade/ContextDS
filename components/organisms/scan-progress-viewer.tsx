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
    <div className="w-full max-w-4xl mx-auto">

      {/* Ultra-Compact Single-Line Header */}
      <div className="mb-4 flex items-center justify-between h-9 border-b border-grep-2 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <h2 className="text-sm font-mono text-foreground">{domain}</h2>
          <span className="text-xs text-grep-7">·</span>
          <span className="text-xs text-grep-9 font-mono">{activeStep?.label || 'init'}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-grep-9 font-mono tabular-nums">{completedCount}/{steps.length}</span>
          <div className="w-24 h-1 bg-grep-2 rounded-full overflow-hidden">
            <div className="h-full bg-foreground transition-all duration-300" style={{ width: `${progressPercent}%` }} />
          </div>
          <span className="text-xs text-grep-9 font-mono tabular-nums w-10 text-right">{elapsed.toFixed(1)}s</span>
        </div>
      </div>

      {/* Compact Steps - Show Only Recent */}
      <div className="rounded border border-grep-2 bg-grep-0 overflow-hidden mb-3">
        {steps.filter(s => s.status !== 'pending' || steps.indexOf(s) === completedCount).slice(0, 5).map((step) => (
          <div
            key={step.id}
            className={cn(
              "border-b border-grep-2 last:border-b-0",
              step.status === 'active' && "bg-background"
            )}
          >
            <div className="h-8 px-3 flex items-center gap-2.5 font-mono text-[11px]">
              <span className={cn(
                "w-3 text-center shrink-0",
                step.status === 'pending' && "text-grep-7",
                step.status === 'active' && "text-emerald-600 dark:text-emerald-400",
                step.status === 'complete' && "text-grep-9"
              )}>
                {step.status === 'pending' && '○'}
                {step.status === 'active' && '⟳'}
                {step.status === 'complete' && '✓'}
              </span>

              <span className={cn(
                "w-28 shrink-0 truncate",
                step.status === 'active' && "text-foreground",
                step.status === 'complete' && "text-grep-9",
                step.status === 'pending' && "text-grep-7"
              )}>
                {step.label}
              </span>

              <span className="flex-1 text-grep-9 truncate text-[10px]">
                {step.data}
              </span>

              {step.time && step.status === 'complete' && (
                <span className="text-grep-7 tabular-nums w-8 text-right shrink-0 text-[10px]">
                  {step.time}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Live Metrics - Ultra-Compact */}
      <div className="grid grid-cols-3 gap-2.5">
        <div className="rounded border border-grep-2 bg-grep-0 px-3 py-2 flex items-center justify-between">
          <span className="text-[9px] text-grep-9 font-mono uppercase">Rules</span>
          <span className={cn(
            "font-mono text-sm font-bold tabular-nums",
            completedCount >= 1 ? "text-foreground" : "text-grep-7"
          )}>
            {completedCount >= 1 ? '1,847' : '—'}
          </span>
        </div>
        <div className="rounded border border-grep-2 bg-grep-0 px-3 py-2 flex items-center justify-between">
          <span className="text-[9px] text-grep-9 font-mono uppercase">Tokens</span>
          <span className={cn(
            "font-mono text-sm font-bold tabular-nums",
            completedCount >= 6 ? "text-foreground" : "text-grep-7"
          )}>
            {completedCount >= 6 ? '247' : '—'}
          </span>
        </div>
        <div className="rounded border border-grep-2 bg-grep-0 px-3 py-2 flex items-center justify-between">
          <span className="text-[9px] text-grep-9 font-mono uppercase">Quality</span>
          <span className={cn(
            "font-mono text-sm font-bold tabular-nums",
            completedCount >= 7 ? "text-foreground" : "text-grep-7"
          )}>
            {completedCount >= 7 ? '92%' : '—'}
          </span>
        </div>
      </div>
    </div>
  )
}