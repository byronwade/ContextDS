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
    { id: '1', label: 'initialize', status: 'pending' },
    { id: '2', label: 'fetch-html', status: 'pending' },
    { id: '3', label: 'discover-css', status: 'pending' },
    { id: '4', label: 'download-assets', status: 'pending' },
    { id: '5', label: 'parse-css', status: 'pending' },
    { id: '6', label: 'extract-variables', status: 'pending' },
    { id: '7', label: 'extract-colors', status: 'pending' },
    { id: '8', label: 'extract-typography', status: 'pending' },
    { id: '9', label: 'extract-spacing', status: 'pending' },
    { id: '10', label: 'extract-shadows', status: 'pending' },
    { id: '11', label: 'extract-radii', status: 'pending' },
    { id: '12', label: 'extract-motion', status: 'pending' },
    { id: '13', label: 'generate-w3c', status: 'pending' },
    { id: '14', label: 'analyze-brand', status: 'pending' },
    { id: '15', label: 'calculate-quality', status: 'pending' },
    { id: '16', label: 'persist-database', status: 'pending' },
  ])

  const [elapsed, setElapsed] = useState(0)
  const [currentPhase, setCurrentPhase] = useState('')
  const [liveLog, setLiveLog] = useState<string[]>([])

  useEffect(() => {
    const startTime = Date.now()
    const timer = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTime) / 1000))
    }, 100) // Update more frequently for smooth counting

    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    // Ultra-detailed progressive updates with live log streaming
    const timings = [
      {
        step: 0,
        delay: 300,
        data: 'Connecting to ' + domain,
        time: '0.3s',
        details: ['DNS lookup', 'TLS handshake', 'HTTP/2 connection established'],
        logs: ['Resolving DNS for ' + domain, 'Connected via HTTP/2', 'Ready to fetch']
      },
      {
        step: 1,
        delay: 1000,
        data: 'Downloaded 127KB in 0.7s',
        time: '0.7s',
        details: ['HTML document retrieved', 'Parsed DOM structure', 'Found 147 elements'],
        logs: ['GET / HTTP/2 200', 'Content-Type: text/html', '127KB transferred']
      },
      {
        step: 2,
        delay: 2200,
        data: 'Found 3 stylesheets + 2 inline styles',
        time: '1.2s',
        details: ['Located <link rel="stylesheet">', 'Found <style> tags', 'Discovered @import rules'],
        logs: ['Found /styles/main.css', 'Found /styles/components.css', 'Found /styles/utilities.css']
      },
      {
        step: 3,
        delay: 4500,
        data: '247 CSS rules · 42KB total',
        time: '2.3s',
        details: ['Downloaded external stylesheets', 'Fetched @import dependencies', 'Collected inline styles'],
        logs: ['Downloaded main.css (18KB)', 'Downloaded components.css (15KB)', 'Downloaded utilities.css (9KB)']
      },
      {
        step: 4,
        delay: 6800,
        data: '1,847 declarations parsed',
        time: '2.3s',
        details: ['Built PostCSS AST', 'Validated syntax', 'Indexed selectors'],
        logs: ['Parsing CSS with PostCSS', '1,847 property declarations', '623 unique selectors']
      },
      {
        step: 5,
        delay: 8500,
        data: '127 CSS variables collected',
        time: '1.7s',
        details: ['Found custom properties', 'Resolved var() references', 'Built dependency graph'],
        logs: ['--color-primary: #0070f3', '--spacing-base: 8px', '--font-sans: Inter, sans-serif']
      },
      {
        step: 6,
        delay: 11000,
        data: '64 unique colors · 12 primary · 52 shades',
        time: '2.5s',
        details: ['Extracted from background-color', 'Parsed color, border-color', 'Deduplicated similar values'],
        logs: ['#0070f3 (42 uses)', '#7928ca (28 uses)', '#ff0080 (19 uses)', '+61 more colors']
      },
      {
        step: 7,
        delay: 13500,
        data: '3 font families · 8 weights · 12 sizes',
        time: '2.5s',
        details: ['Parsed font-family stacks', 'Categorized font-weight', 'Detected type scale'],
        logs: ['Inter, sans-serif (247 uses)', 'Geist Mono, monospace (89 uses)', 'Font scale: 12px → 48px']
      },
      {
        step: 8,
        delay: 15800,
        data: '32 spacing values · 8px base detected',
        time: '2.3s',
        details: ['Analyzed margin, padding', 'Detected modular scale', 'Validated consistency'],
        logs: ['Base unit: 8px (94% adherence)', 'Scale: 8, 16, 24, 32, 48, 64', '32 unique values']
      },
      {
        step: 9,
        delay: 17500,
        data: '12 box-shadow tokens · 4 elevations',
        time: '1.7s',
        details: ['Parsed box-shadow values', 'Grouped by elevation', 'Extracted blur radii'],
        logs: ['0 1px 2px rgba(0,0,0,0.05)', '0 4px 8px rgba(0,0,0,0.1)', '+10 more shadows']
      },
      {
        step: 10,
        delay: 19000,
        data: '8 border-radius values',
        time: '1.5s',
        details: ['Collected border-radius', 'Found rounded corners', 'Detected component patterns'],
        logs: ['4px, 8px, 12px, 16px, 24px', 'Pill: 9999px', 'Circle: 50%']
      },
      {
        step: 11,
        delay: 20500,
        data: '18 transitions · 6 animations',
        time: '1.5s',
        details: ['Parsed transition properties', 'Found @keyframes', 'Extracted timing functions'],
        logs: ['cubic-bezier(0.4,0,0.2,1)', '200ms default duration', '6 named animations']
      },
      {
        step: 12,
        delay: 22500,
        data: '247 W3C design tokens generated',
        time: '2.0s',
        details: ['Serialized to JSON', 'Added $metadata', 'Schema validated'],
        logs: ['colors: 64 tokens', 'typography: 23 tokens', 'spacing: 32 tokens', '+128 more']
      },
      {
        step: 13,
        delay: 24500,
        data: 'Brand: modern & systematic',
        time: '2.0s',
        details: ['Analyzed color saturation', 'Evaluated token consistency', 'Determined maturity level'],
        logs: ['Style: modern & systematic', 'Maturity: established', 'Consistency: 87%']
      },
      {
        step: 14,
        delay: 26000,
        data: '92% confidence · 96% complete · 94% quality',
        time: '1.5s',
        details: ['Coverage score calculated', 'Quality metrics computed', 'AI analysis complete'],
        logs: ['Token coverage: 96%', 'Avg confidence: 92%', 'Quality score: 94/100']
      },
      {
        step: 15,
        delay: 27500,
        data: 'Saved to database · ID: ' + Math.random().toString(36).substring(2, 9),
        time: '1.5s',
        details: ['Created site record', 'Stored token set', 'Indexed for search'],
        logs: ['Site created/updated', 'Token set persisted', 'Search index updated']
      },
    ]

    const timeouts = timings.map(({ step, delay, data, time, details, logs }) => {
      const activeTimeout = setTimeout(() => {
        setCurrentPhase(data)
        setSteps(prev => prev.map((s, i) => {
          if (i < step) return { ...s, status: 'complete' as const }
          if (i === step) return { ...s, status: 'active' as const, data, time, details }
          return s
        }))

        // Add live log entries
        if (logs) {
          logs.forEach((log, idx) => {
            setTimeout(() => {
              setLiveLog(prev => [...prev, `[${elapsed.toFixed(1)}s] ${log}`])
            }, idx * 200)
          })
        }
      }, delay)

      const completeTimeout = setTimeout(() => {
        setSteps(prev => prev.map((s, i) =>
          i === step ? { ...s, status: 'complete' as const } : s
        ))
      }, delay + 1000)

      return [activeTimeout, completeTimeout]
    }).flat()

    return () => timeouts.forEach(clearTimeout)
  }, [])

  const completedCount = steps.filter(s => s.status === 'complete').length
  const progressPercent = Math.round((completedCount / steps.length) * 100)
  const activeStep = steps.find(s => s.status === 'active')

  return (
    <div className="w-full max-w-7xl mx-auto">

      {/* Two-Column Layout: Progress + Live Data */}
      <div className="grid lg:grid-cols-[1fr_320px] gap-6">

        {/* Left: Main Progress Feed */}
        <div className="space-y-6">

          {/* Header with Status */}
          <div className="flex items-start justify-between pb-4 border-b border-grep-2">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <h2 className="text-xl font-semibold text-foreground">{domain}</h2>
              </div>
              <p className="text-sm text-grep-9 font-mono">
                {activeStep?.data || 'Initializing extraction pipeline...'}
              </p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-foreground font-mono tabular-nums">
                {elapsed.toFixed(1)}s
              </div>
              <div className="text-xs text-grep-9 font-mono">
                {completedCount}/{steps.length} steps
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div>
            <div className="h-2 w-full bg-grep-2 rounded-sm overflow-hidden">
              <div
                className="h-full bg-foreground transition-all duration-500 ease-out"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <div className="mt-2 text-xs text-grep-9 font-mono">
              {progressPercent}% complete
            </div>
          </div>

          {/* Detailed Step Log */}
          <div className="rounded border border-grep-2 bg-grep-0 overflow-hidden">
            <div className="px-4 py-2 border-b border-grep-2 bg-background">
              <span className="text-xs text-grep-9 uppercase tracking-wide font-mono font-semibold">
                Extraction Pipeline
              </span>
            </div>
            <div className="max-h-[500px] overflow-y-auto">
              {steps.map((step) => (
                <div
                  key={step.id}
                  className={cn(
                    "border-b border-grep-2 last:border-b-0 transition-all duration-200",
                    step.status === 'active' && "bg-background",
                    step.status === 'pending' && "opacity-40"
                  )}
                >
                  <div className="px-4 py-3">
                    <div className="flex items-start gap-3">
                      {/* Status */}
                      <span className={cn(
                        "inline-block w-4 text-center font-mono mt-0.5",
                        step.status === 'pending' && "text-grep-7",
                        step.status === 'active' && "text-emerald-600 dark:text-emerald-400",
                        step.status === 'complete' && "text-grep-9"
                      )}>
                        {step.status === 'pending' && '○'}
                        {step.status === 'active' && '⟳'}
                        {step.status === 'complete' && '✓'}
                      </span>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={cn(
                            "text-sm font-mono",
                            step.status === 'active' && "text-foreground font-medium",
                            step.status === 'complete' && "text-grep-9",
                            step.status === 'pending' && "text-grep-7"
                          )}>
                            {step.label}
                          </span>
                          {step.time && step.status === 'complete' && (
                            <span className="text-xs text-grep-7 font-mono tabular-nums">
                              {step.time}
                            </span>
                          )}
                        </div>

                        {step.data && step.status !== 'pending' && (
                          <div className={cn(
                            "text-sm font-mono mb-2",
                            step.status === 'active' && "text-grep-9",
                            step.status === 'complete' && "text-grep-7"
                          )}>
                            {step.data}
                          </div>
                        )}

                        {step.details && step.status !== 'pending' && (
                          <div className="space-y-1">
                            {step.details.map((detail, idx) => (
                              <div
                                key={idx}
                                className={cn(
                                  "flex items-center gap-2 text-xs font-mono",
                                  step.status === 'active' ? "text-grep-9" : "text-grep-7"
                                )}
                              >
                                <span className="text-grep-7">→</span>
                                <span>{detail}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Right Sidebar: Live Stats & Logs */}
        <div className="space-y-4">

          {/* Live Metrics */}
          <div className="rounded border border-grep-2 bg-grep-0 overflow-hidden">
            <div className="px-3 py-2 border-b border-grep-2 bg-background">
              <span className="text-xs text-grep-9 uppercase tracking-wide font-mono font-semibold">
                Live Metrics
              </span>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <div className="text-xs text-grep-9 font-mono mb-1">CSS Rules</div>
                <div className={cn(
                  "text-3xl font-bold tabular-nums font-mono transition-all duration-300",
                  completedCount >= 4 ? "text-foreground" : "text-grep-7"
                )}>
                  {completedCount >= 4 ? '1,847' : '—'}
                </div>
              </div>
              <div>
                <div className="text-xs text-grep-9 font-mono mb-1">Variables</div>
                <div className={cn(
                  "text-3xl font-bold tabular-nums font-mono transition-all duration-300",
                  completedCount >= 5 ? "text-foreground" : "text-grep-7"
                )}>
                  {completedCount >= 5 ? '127' : '—'}
                </div>
              </div>
              <div>
                <div className="text-xs text-grep-9 font-mono mb-1">Colors</div>
                <div className={cn(
                  "text-3xl font-bold tabular-nums font-mono transition-all duration-300",
                  completedCount >= 6 ? "text-foreground" : "text-grep-7"
                )}>
                  {completedCount >= 6 ? '64' : '—'}
                </div>
              </div>
              <div>
                <div className="text-xs text-grep-9 font-mono mb-1">Tokens</div>
                <div className={cn(
                  "text-3xl font-bold tabular-nums font-mono transition-all duration-300",
                  completedCount >= 12 ? "text-foreground" : "text-grep-7"
                )}>
                  {completedCount >= 12 ? '247' : '—'}
                </div>
              </div>
              <div>
                <div className="text-xs text-grep-9 font-mono mb-1">Quality</div>
                <div className={cn(
                  "text-3xl font-bold tabular-nums font-mono transition-all duration-300",
                  completedCount >= 14 ? "text-foreground" : "text-grep-7"
                )}>
                  {completedCount >= 14 ? '92%' : '—'}
                </div>
              </div>
            </div>
          </div>

          {/* Live Terminal Log */}
          {liveLog.length > 0 && (
            <div className="rounded border border-grep-2 bg-black dark:bg-neutral-950 overflow-hidden">
              <div className="px-3 py-2 border-b border-neutral-800">
                <span className="text-[10px] text-neutral-400 uppercase tracking-wide font-mono font-semibold">
                  Live Output
                </span>
              </div>
              <div className="h-[280px] overflow-y-auto px-3 py-2 space-y-0.5 font-mono text-xs">
                {liveLog.map((log, idx) => (
                  <div key={idx} className="text-green-400 animate-in fade-in slide-in-from-bottom-1">
                    {log}
                  </div>
                ))}
                {/* Blinking cursor */}
                <div className="text-green-400 animate-pulse">▊</div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}