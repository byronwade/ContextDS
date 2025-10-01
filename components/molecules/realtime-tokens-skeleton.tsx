import { Skeleton } from "@/components/atoms/skeleton"
import { cn } from "@/lib/utils"
import { forwardRef, useEffect, useState } from "react"

// Real-time token discovery simulation
const colorPalettes = [
  ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4'],
  ['#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F'],
  ['#BB8FCE', '#85C1E9', '#F8C471', '#82E0AA'],
  ['#F1948A', '#85C1E9', '#D7BDE2', '#AED6F1']
]

const spacingValues = ['4px', '8px', '12px', '16px', '24px', '32px', '48px', '64px']
const fontFamilies = ['Inter', 'Roboto', 'Open Sans', 'Lato', 'Poppins']

interface RealtimeTokensSkeletonProps {
  className?: string
}

export const RealtimeTokensSkeleton = forwardRef<HTMLElement, RealtimeTokensSkeletonProps>(
  ({ className }, ref) => {
    const [discoveredColors, setDiscoveredColors] = useState<string[]>([])
    const [discoveredSpacing, setDiscoveredSpacing] = useState<string[]>([])
    const [discoveredFonts, setDiscoveredFonts] = useState<string[]>([])
    const [currentPalette, setCurrentPalette] = useState(0)

    useEffect(() => {
      // Color discovery animation
      const colorInterval = setInterval(() => {
        if (discoveredColors.length < 16) {
          const palette = colorPalettes[currentPalette % colorPalettes.length]
          const randomColor = palette[Math.floor(Math.random() * palette.length)]
          setDiscoveredColors(prev => {
            if (!prev.includes(randomColor)) {
              return [...prev, randomColor]
            }
            return prev
          })
        } else {
          setCurrentPalette(prev => prev + 1)
          setDiscoveredColors([])
        }
      }, 400)

      // Spacing discovery
      const spacingInterval = setInterval(() => {
        if (discoveredSpacing.length < spacingValues.length) {
          const spacing = spacingValues[discoveredSpacing.length]
          setDiscoveredSpacing(prev => [...prev, spacing])
        }
      }, 800)

      // Font discovery
      const fontInterval = setInterval(() => {
        if (discoveredFonts.length < fontFamilies.length) {
          const font = fontFamilies[discoveredFonts.length]
          setDiscoveredFonts(prev => [...prev, font])
        }
      }, 1200)

      return () => {
        clearInterval(colorInterval)
        clearInterval(spacingInterval)
        clearInterval(fontInterval)
      }
    }, [discoveredColors.length, discoveredSpacing.length, discoveredFonts.length, currentPalette])

    return (
      <section id="tokens" ref={ref} className={cn("mb-8", className)}>
        <div className="flex items-center gap-2 mb-4">
          <div className="w-5 h-5 rounded bg-emerald-500 animate-pulse" />
          <div className="flex items-center gap-2">
            <span className="text-lg font-semibold">Design Tokens</span>
            <span className="text-sm text-neutral-600 dark:text-neutral-400 font-mono">
              Discovering...
            </span>
          </div>
        </div>

        <div className="space-y-6">
          {/* Real-time Colors Discovery */}
          <div className="border border-neutral-200 dark:border-neutral-700 rounded-lg p-6 bg-white dark:bg-neutral-900">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="text-lg font-semibold">Colors</span>
                <div className="px-2 py-1 bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300 rounded text-sm font-mono">
                  {discoveredColors.length}/16
                </div>
              </div>
              <div className="h-2 w-24 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 transition-all duration-300"
                  style={{ width: `${(discoveredColors.length / 16) * 100}%` }}
                />
              </div>
            </div>

            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-3">
              {discoveredColors.map((color, i) => (
                <div key={`${color}-${i}`} className="space-y-2">
                  <div
                    className="aspect-square w-full rounded-lg border border-neutral-300 dark:border-neutral-600 animate-in zoom-in duration-500"
                    style={{
                      backgroundColor: color,
                      animationDelay: `${i * 50}ms`
                    }}
                  />
                  <div className="text-xs font-mono text-center text-neutral-600 dark:text-neutral-400">
                    {color}
                  </div>
                </div>
              ))}

              {/* Empty slots with loading */}
              {Array.from({ length: 16 - discoveredColors.length }).map((_, i) => (
                <div key={`empty-${i}`} className="space-y-2">
                  <Skeleton className="aspect-square w-full" variant="rounded" />
                  <Skeleton className="h-3 w-12 mx-auto" />
                </div>
              ))}
            </div>
          </div>

          {/* Typography Discovery */}
          <div className="border border-neutral-200 dark:border-neutral-700 rounded-lg p-6 bg-white dark:bg-neutral-900">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="text-lg font-semibold">Typography</span>
                <div className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded text-sm font-mono">
                  {discoveredFonts.length}/{fontFamilies.length}
                </div>
              </div>
              <div className="h-2 w-24 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 transition-all duration-300"
                  style={{ width: `${(discoveredFonts.length / fontFamilies.length) * 100}%` }}
                />
              </div>
            </div>

            <div className="space-y-4">
              {discoveredFonts.map((font, i) => (
                <div
                  key={font}
                  className="border border-neutral-200 dark:border-neutral-700 rounded p-4 animate-in slide-in-from-left duration-500"
                  style={{ animationDelay: `${i * 200}ms` }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold" style={{ fontFamily: font }}>
                      {font}
                    </span>
                    <span className="text-xs text-neutral-600 dark:text-neutral-400 font-mono">
                      Font Family
                    </span>
                  </div>
                  <div className="text-2xl mb-2" style={{ fontFamily: font }}>
                    The quick brown fox jumps
                  </div>
                  <div className="text-sm text-neutral-600 dark:text-neutral-400" style={{ fontFamily: font }}>
                    ABCDEFGHIJKLMNOPQRSTUVWXYZ
                  </div>
                </div>
              ))}

              {/* Loading placeholders */}
              {Array.from({ length: fontFamilies.length - discoveredFonts.length }).map((_, i) => (
                <div key={`font-loading-${i}`} className="border border-neutral-200 dark:border-neutral-700 rounded p-4">
                  <div className="flex items-center justify-between mb-2">
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                  <Skeleton className="h-8 w-full mb-2" />
                  <Skeleton className="h-4 w-64" />
                </div>
              ))}
            </div>
          </div>

          {/* Spacing Discovery */}
          <div className="border border-neutral-200 dark:border-neutral-700 rounded-lg p-6 bg-white dark:bg-neutral-900">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="text-lg font-semibold">Spacing Scale</span>
                <div className="px-2 py-1 bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 rounded text-sm font-mono">
                  {discoveredSpacing.length}/{spacingValues.length}
                </div>
              </div>
              <div className="h-2 w-24 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-purple-500 transition-all duration-300"
                  style={{ width: `${(discoveredSpacing.length / spacingValues.length) * 100}%` }}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-4">
              {discoveredSpacing.map((spacing, i) => (
                <div
                  key={spacing}
                  className="space-y-2 animate-in fade-in duration-500"
                  style={{ animationDelay: `${i * 100}ms` }}
                >
                  <div className="relative p-2 border border-neutral-300 dark:border-neutral-600 rounded bg-neutral-50 dark:bg-neutral-800">
                    <div
                      className="bg-purple-500 rounded transition-all duration-500"
                      style={{
                        width: spacing,
                        height: '12px'
                      }}
                    />
                  </div>
                  <div className="text-xs font-mono text-center text-neutral-600 dark:text-neutral-400">
                    {spacing}
                  </div>
                </div>
              ))}

              {/* Loading placeholders */}
              {Array.from({ length: spacingValues.length - discoveredSpacing.length }).map((_, i) => (
                <div key={`spacing-loading-${i}`} className="space-y-2">
                  <div className="relative p-2 border border-neutral-200 dark:border-neutral-600 rounded">
                    <Skeleton className="h-3 w-full" />
                  </div>
                  <Skeleton className="h-3 w-8 mx-auto" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    )
  }
)

RealtimeTokensSkeleton.displayName = "RealtimeTokensSkeleton"