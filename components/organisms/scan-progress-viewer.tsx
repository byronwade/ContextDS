"use client"

import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

interface ScanStep {
  id: string
  label: string
  status: 'pending' | 'active' | 'complete'
  data?: string
  time?: string
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

  useEffect(() => {
    const startTime = Date.now()
    const timer = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTime) / 1000))
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    // Progressive step updates with realistic data
    const timings = [
      { step: 0, delay: 800, data: '3 stylesheets · 247 rules · 42KB', time: '0.8s' },
      { step: 1, delay: 2500, data: '1,847 declarations parsed', time: '1.7s' },
      { step: 2, delay: 5000, data: '64 colors · 12 primary · 52 shades', time: '2.5s' },
      { step: 3, delay: 7200, data: '3 families · 8 weights · 6 sizes', time: '2.2s' },
      { step: 4, delay: 9000, data: '32 values · 8px base scale', time: '1.8s' },
      { step: 5, delay: 10800, data: '12 shadows · 4 elevations', time: '1.8s' },
      { step: 6, delay: 12500, data: '247 tokens in W3C format', time: '1.7s' },
      { step: 7, delay: 14000, data: '92% confidence · 96% complete', time: '1.5s' },
    ]

    const timeouts = timings.map(({ step, delay, data, time }) => {
      return setTimeout(() => {
        setSteps(prev => prev.map((s, i) => {
          if (i < step) return { ...s, status: 'complete' as const }
          if (i === step) return { ...s, status: 'active' as const, data, time }
          return s
        }))

        setTimeout(() => {
          setSteps(prev => prev.map((s, i) =>
            i === step ? { ...s, status: 'complete' as const } : s
          ))
        }, 1200)
      }, delay)
    })

    return () => timeouts.forEach(clearTimeout)
  }, [])

  return (
    <div className="w-full max-w-4xl mx-auto">

      {/* Minimal Header - Grep Style */}
      <div className="mb-6 flex items-center justify-between border-b border-grep-2 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <h2 className="text-lg font-medium text-foreground font-mono">
            {domain}
          </h2>
        </div>
        <div className="text-sm text-grep-9 font-mono tabular-nums">
          {elapsed}s
        </div>
      </div>

      {/* Log Output - Terminal Style */}
      <div className="rounded-md border border-grep-2 bg-grep-0 font-mono text-[13px] overflow-hidden">
        {steps.map((step, index) => (
          <div
            key={step.id}
            className={cn(
              "border-b border-grep-2 last:border-b-0",
              step.status === 'active' && "bg-background"
            )}
          >
            <div className="px-4 py-2.5 flex items-start gap-3">
              {/* Status Symbol */}
              <span className={cn(
                "shrink-0 w-4 text-center",
                step.status === 'pending' && "text-grep-7",
                step.status === 'active' && "text-emerald-600 dark:text-emerald-400",
                step.status === 'complete' && "text-grep-9"
              )}>
                {step.status === 'pending' && '○'}
                {step.status === 'active' && '⟳'}
                {step.status === 'complete' && '✓'}
              </span>

              {/* Step Label */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3">
                  <span className={cn(
                    "text-grep-9",
                    step.status === 'active' && "text-foreground"
                  )}>
                    {step.label}
                  </span>
                  {step.time && step.status === 'complete' && (
                    <span className="text-grep-7 text-xs">
                      {step.time}
                    </span>
                  )}
                </div>

                {/* Live Data Output */}
                {step.data && step.status !== 'pending' && (
                  <div className={cn(
                    "mt-1 text-grep-7 animate-in fade-in slide-in-from-left-2",
                    step.status === 'active' && "text-grep-9"
                  )}>
                    {step.data}
                  </div>
                )}
              </div>

              {/* Active Indicator */}
              {step.status === 'active' && (
                <span className="text-grep-7 text-xs animate-pulse shrink-0">
                  ...
                </span>
              )}
            </div>
          </div>
        ))}

        {/* Footer Summary */}
        <div className="bg-background px-4 py-2.5 flex items-center justify-between text-xs border-t border-grep-2">
          <span className="text-grep-9">
            Scanning <span className="text-foreground">{domain}</span>
          </span>
          <span className="text-grep-9">
            {steps.filter(s => s.status === 'complete').length}/{steps.length} steps
          </span>
        </div>
      </div>

      {/* Minimal Progress Indicator */}
      <div className="mt-4 flex items-center gap-3">
        <div className="flex-1 h-px bg-grep-2 overflow-hidden">
          <div
            className="h-full bg-foreground transition-all duration-300"
            style={{
              width: `${(steps.filter(s => s.status === 'complete').length / steps.length) * 100}%`
            }}
          />
        </div>
        <span className="text-xs text-grep-9 tabular-nums">
          {Math.round((steps.filter(s => s.status === 'complete').length / steps.length) * 100)}%
        </span>
      </div>
    </div>
  )
}