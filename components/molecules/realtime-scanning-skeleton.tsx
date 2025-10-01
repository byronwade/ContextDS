import { Skeleton } from "@/components/atoms/skeleton"
import { cn } from "@/lib/utils"
import { forwardRef, useEffect, useState } from "react"

// Simulated real-time data for demonstration
const generateRandomColor = () => {
  const colors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
    '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9',
    '#F8C471', '#82E0AA', '#F1948A', '#85C1E9', '#D7BDE2'
  ]
  return colors[Math.floor(Math.random() * colors.length)]
}

const generateRandomTokens = () => [
  'primary', 'secondary', 'accent', 'background', 'surface',
  'text-primary', 'text-secondary', 'border', 'shadow',
  'success', 'warning', 'error', 'info'
]

interface RealtimeScanningSkeletonProps {
  className?: string
  domain?: string
  progress?: {
    phase: string
    step: number
    totalSteps: number
  }
}

export const RealtimeScanningOverview = forwardRef<HTMLElement, RealtimeScanningSkeletonProps>(
  ({ className, domain, progress }, ref) => {
    const [discoveredColors, setDiscoveredColors] = useState<string[]>([])
    const [discoveredTokens, setDiscoveredTokens] = useState<string[]>([])
    const [stats, setStats] = useState({ tokens: 0, colors: 0, fonts: 0, spacing: 0 })

    // Simulate real-time data discovery
    useEffect(() => {
      const colorInterval = setInterval(() => {
        if (discoveredColors.length < 12) {
          setDiscoveredColors(prev => [...prev, generateRandomColor()])
        }
      }, 800)

      const tokenInterval = setInterval(() => {
        if (discoveredTokens.length < 8) {
          const tokens = generateRandomTokens()
          const randomToken = tokens[Math.floor(Math.random() * tokens.length)]
          if (!discoveredTokens.includes(randomToken)) {
            setDiscoveredTokens(prev => [...prev, randomToken])
          }
        }
      }, 1200)

      const statsInterval = setInterval(() => {
        setStats(prev => ({
          tokens: Math.min(prev.tokens + Math.floor(Math.random() * 3) + 1, 247),
          colors: Math.min(prev.colors + Math.floor(Math.random() * 2) + 1, 45),
          fonts: Math.min(prev.fonts + Math.floor(Math.random() * 1.5), 8),
          spacing: Math.min(prev.spacing + Math.floor(Math.random() * 2), 24)
        }))
      }, 600)

      return () => {
        clearInterval(colorInterval)
        clearInterval(tokenInterval)
        clearInterval(statsInterval)
      }
    }, [discoveredColors.length, discoveredTokens.length])

    return (
      <section id="overview" ref={ref} className={cn("mb-8", className)}>
        {/* Enhanced Header with Site Name */}
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between pb-6 gap-4">
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-sm text-neutral-600 dark:text-neutral-400 font-mono">
                Scanning
              </span>
              {domain && (
                <span className="text-xl font-medium text-foreground break-all">
                  {domain}
                </span>
              )}
            </div>
            {progress && (
              <div className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-400">
                <span>•</span>
                <span className="font-mono">{progress.phase}</span>
                <span className="text-xs">({progress.step}/{progress.totalSteps})</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-20" variant="rounded" />
            <Skeleton className="h-8 w-20" variant="rounded" />
            <Skeleton className="h-8 w-24" variant="rounded" />
          </div>
        </div>

        {/* Real-time Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-8">
          {/* Tokens Count - Real-time */}
          <div className="p-3 sm:p-5 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-gradient-to-br from-neutral-50 to-neutral-100 dark:from-neutral-900 dark:to-neutral-800">
            <div className="flex items-start justify-between mb-3">
              <div className="text-3xl font-bold tabular-nums text-foreground transition-all duration-300">
                {stats.tokens}
              </div>
              <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
            </div>
            <div className="text-xs text-neutral-600 dark:text-neutral-400 font-semibold tracking-wide uppercase mb-2">
              Design Tokens
            </div>
            <div className="text-[10px] text-neutral-500 font-mono">
              {stats.colors}c • {stats.fonts}f • {stats.spacing}s
            </div>
          </div>

          {/* Colors Count */}
          <div className="p-3 sm:p-5 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-gradient-to-br from-neutral-50 to-neutral-100 dark:from-neutral-900 dark:to-neutral-800">
            <div className="flex items-start justify-between mb-3">
              <div className="text-3xl font-bold tabular-nums text-emerald-600 dark:text-emerald-500 transition-all duration-300">
                {stats.colors}
              </div>
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            </div>
            <div className="text-xs text-neutral-600 dark:text-neutral-400 font-semibold tracking-wide uppercase mb-2">
              Colors Found
            </div>
            <div className="flex gap-1">
              {discoveredColors.slice(0, 6).map((color, i) => (
                <div
                  key={i}
                  className="w-2 h-2 rounded-full animate-in fade-in duration-500"
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

          {/* Fonts Count */}
          <div className="p-3 sm:p-5 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-gradient-to-br from-neutral-50 to-neutral-100 dark:from-neutral-900 dark:to-neutral-800">
            <div className="flex items-start justify-between mb-3">
              <div className="text-3xl font-bold tabular-nums text-purple-600 dark:text-purple-500 transition-all duration-300">
                {stats.fonts}
              </div>
              <div className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
            </div>
            <div className="text-xs text-neutral-600 dark:text-neutral-400 font-semibold tracking-wide uppercase mb-2">
              Typography
            </div>
            <div className="w-full h-1.5 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-purple-500 transition-all duration-1000 ease-out"
                style={{ width: `${Math.min((stats.fonts / 8) * 100, 100)}%` }}
              />
            </div>
          </div>

          {/* Spacing Count */}
          <div className="p-3 sm:p-5 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-gradient-to-br from-neutral-50 to-neutral-100 dark:from-neutral-900 dark:to-neutral-800">
            <div className="flex items-start justify-between mb-3">
              <div className="text-3xl font-bold tabular-nums text-cyan-600 dark:text-cyan-500 transition-all duration-300">
                {stats.spacing}
              </div>
              <div className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse" />
            </div>
            <div className="text-xs text-neutral-600 dark:text-neutral-400 font-semibold tracking-wide uppercase mb-2">
              Spacing Scale
            </div>
            <div className="w-full h-1.5 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-cyan-500 transition-all duration-1000 ease-out"
                style={{ width: `${Math.min((stats.spacing / 24) * 100, 100)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Real-time Token Discovery */}
        <div className="border border-neutral-200 dark:border-neutral-700 rounded-lg p-6 bg-white dark:bg-neutral-900 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-4 h-4 rounded bg-blue-500 animate-pulse" />
            <h3 className="text-lg font-semibold">Discovering Tokens</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {discoveredTokens.map((token, i) => (
              <div
                key={token}
                className="px-3 py-1 bg-neutral-100 dark:bg-neutral-800 rounded-full text-sm font-mono animate-in slide-in-from-left duration-500"
                style={{ animationDelay: `${i * 200}ms` }}
              >
                {token}
              </div>
            ))}
            {discoveredTokens.length < 8 && (
              <div className="px-3 py-1 bg-neutral-100 dark:bg-neutral-800 rounded-full">
                <Skeleton className="h-4 w-16" />
              </div>
            )}
          </div>
        </div>

        {/* Real-time Color Palette */}
        <div className="border border-neutral-200 dark:border-neutral-700 rounded-lg p-6 bg-white dark:bg-neutral-900">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-4 h-4 rounded bg-emerald-500 animate-pulse" />
            <h3 className="text-lg font-semibold">Color Palette Discovery</h3>
            <span className="text-sm text-neutral-600 dark:text-neutral-400 font-mono">
              {discoveredColors.length}/12
            </span>
          </div>
          <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-12 gap-3">
            {discoveredColors.map((color, i) => (
              <div
                key={i}
                className="aspect-square rounded-lg animate-in zoom-in duration-500 border border-neutral-200 dark:border-neutral-700"
                style={{
                  backgroundColor: color,
                  animationDelay: `${i * 100}ms`
                }}
              />
            ))}
            {Array.from({ length: 12 - discoveredColors.length }).map((_, i) => (
              <div
                key={`placeholder-${i}`}
                className="aspect-square rounded-lg border border-neutral-200 dark:border-neutral-700"
              >
                <Skeleton className="w-full h-full" variant="rounded" />
              </div>
            ))}
          </div>
        </div>
      </section>
    )
  }
)

RealtimeScanningOverview.displayName = "RealtimeScanningOverview"