"use client"

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { cn } from '@/lib/utils'
import { Download, Eye, Monitor, Smartphone, Tablet } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface Screenshot {
  id: string
  url: string
  viewport: 'mobile' | 'tablet' | 'desktop'
  width: number
  height: number
  label?: string
}

interface ScreenshotGalleryProps {
  scanId: string
  className?: string
}

const viewportIcons = {
  mobile: Smartphone,
  tablet: Tablet,
  desktop: Monitor,
}

const viewportLabels = {
  mobile: 'Mobile (375px)',
  tablet: 'Tablet (768px)',
  desktop: 'Desktop (1920px)',
}

export function ScreenshotGallery({ scanId, className }: ScreenshotGalleryProps) {
  const [screenshots, setScreenshots] = useState<Screenshot[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedViewport, setSelectedViewport] = useState<'mobile' | 'tablet' | 'desktop'>('desktop')

  useEffect(() => {
    async function fetchScreenshots() {
      console.log('[ScreenshotGallery] Fetching screenshots for scanId:', scanId)
      try {
        const response = await fetch(`/api/screenshot?scanId=${scanId}`)
        console.log('[ScreenshotGallery] API response status:', response.status)
        if (response.ok) {
          const data = await response.json()
          console.log('[ScreenshotGallery] Screenshots received:', data)
          setScreenshots(data.screenshots)
        } else {
          const errorText = await response.text()
          console.error('[ScreenshotGallery] API error response:', response.status, errorText)
        }
      } catch (error) {
        console.error('[ScreenshotGallery] Failed to fetch screenshots:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchScreenshots()
  }, [scanId])

  const filteredScreenshots = screenshots.filter(s => s.viewport === selectedViewport)

  if (loading) {
    return (
      <div className={cn('rounded-lg border border-grep-2 bg-grep-0 p-3 sm:p-6', className)}>
        <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
          <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-grep-2 animate-pulse" />
          <div className="h-4 sm:h-5 w-24 sm:w-32 bg-grep-2 rounded animate-pulse" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="aspect-video bg-grep-2 rounded animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  if (screenshots.length === 0) {
    return (
      <div className={cn('rounded-lg border border-grep-2 bg-grep-0 p-4 sm:p-6', className)}>
        <div className="text-center py-6 sm:py-8">
          <Monitor className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-2 sm:mb-3 text-grep-7" />
          <p className="text-xs sm:text-sm text-grep-9 font-medium mb-1">
            Screenshots will appear here once available
          </p>
          <p className="text-[10px] sm:text-xs text-grep-7">
            Multi-viewport screenshots are captured during the scan
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className={cn('rounded-xl border-2 border-grep-3 bg-gradient-to-br from-grep-0 to-grep-1 overflow-hidden shadow-lg', className)}>
      {/* Header */}
      <div className="border-b-2 border-grep-3 bg-background/80 backdrop-blur-sm px-4 sm:px-6 py-3 sm:py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20">
              <Eye className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold font-mono text-foreground">
                Screenshots
              </h2>
              <p className="text-[10px] sm:text-xs text-grep-7">
                Multi-viewport capture
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="font-mono text-xs px-2 py-0.5">
              {screenshots.length} total
            </Badge>
          </div>
        </div>
      </div>

      {/* Viewport Tabs */}
      <div className="border-b border-grep-2 bg-background/50 backdrop-blur-sm px-3 sm:px-6 py-3">
        <div className="flex gap-2">
          {(['mobile', 'tablet', 'desktop'] as const).map((viewport) => {
            const Icon = viewportIcons[viewport]
            const count = screenshots.filter(s => s.viewport === viewport).length
            const isSelected = selectedViewport === viewport

            return (
              <button
                key={viewport}
                onClick={() => setSelectedViewport(viewport)}
                disabled={count === 0}
                className={cn(
                  'flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm font-medium transition-all cursor-pointer',
                  isSelected
                    ? 'bg-blue-600 text-white shadow-md scale-105 font-semibold border-2 border-blue-400'
                    : 'bg-grep-1 text-grep-9 border-2 border-grep-3 hover:bg-grep-2 hover:border-grep-4 hover:text-foreground hover:scale-102',
                  count === 0 && 'opacity-30 cursor-not-allowed hover:bg-grep-1 hover:scale-100'
                )}
              >
                <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span className="hidden xs:inline">{viewportLabels[viewport]}</span>
                <span className="xs:hidden capitalize font-semibold">{viewport}</span>
                {count > 0 && (
                  <span className={cn(
                    'px-1.5 py-0.5 rounded-full text-[10px] font-bold',
                    isSelected ? 'bg-white/25 text-white' : 'bg-grep-3 text-grep-9'
                  )}>
                    {count}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Screenshot Grid */}
      <div className="p-4 sm:p-6 bg-gradient-to-b from-background/50 to-background">
        {filteredScreenshots.length === 0 ? (
          <div className="text-center py-10 sm:py-12">
            <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-grep-2 mb-3">
              <Monitor className="w-8 h-8 sm:w-10 sm:h-10 text-grep-6" />
            </div>
            <p className="text-sm sm:text-base text-grep-8 font-medium">
              No screenshots for {selectedViewport} viewport
            </p>
          </div>
        ) : (
          <div className="space-y-4 sm:space-y-6">
            {filteredScreenshots.map((screenshot, index) => (
              <div
                key={screenshot.id}
                className="group relative rounded-xl border-2 border-grep-3 bg-background overflow-hidden hover:border-blue-400 hover:shadow-2xl transition-all duration-300"
              >
                {/* Screenshot Image */}
                <div className="relative bg-gradient-to-br from-grep-1 to-grep-2" style={{ aspectRatio: `${screenshot.width} / ${screenshot.height}` }}>
                  <Image
                    src={screenshot.url}
                    alt={screenshot.label || `${screenshot.viewport} screenshot ${index + 1}`}
                    fill
                    className="object-contain object-top"
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 1200px"
                    priority={index === 0}
                  />

                  {/* Hover Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-black/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end justify-between p-4 sm:p-6">
                    <div className="flex items-center gap-2 sm:gap-3">
                      <a
                        href={screenshot.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg bg-white/95 backdrop-blur-sm text-gray-900 text-xs sm:text-sm font-semibold flex items-center gap-2 hover:bg-white transition-colors shadow-lg"
                      >
                        <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        <span className="hidden xs:inline">Download</span>
                      </a>
                    </div>
                    {/* Dimensions Badge */}
                    <div className="px-3 py-1.5 rounded-lg bg-black/80 backdrop-blur-sm border border-white/20">
                      <span className="text-xs sm:text-sm font-mono font-bold text-white">
                        {screenshot.width} × {screenshot.height}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Metadata */}
                {screenshot.label && (
                  <div className="px-3 sm:px-4 py-2 sm:py-3 border-t-2 border-grep-3 bg-grep-0/50">
                    <p className="text-xs sm:text-sm font-medium text-foreground truncate">{screenshot.label}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}