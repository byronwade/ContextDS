"use client"

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { cn } from '@/lib/utils'
import { Download, Monitor, Smartphone, Tablet } from 'lucide-react'

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
      try {
        const response = await fetch(`/api/screenshot?scanId=${scanId}`)
        if (response.ok) {
          const data = await response.json()
          setScreenshots(data.screenshots)
        }
      } catch (error) {
        console.error('Failed to fetch screenshots:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchScreenshots()
  }, [scanId])

  const filteredScreenshots = screenshots.filter(s => s.viewport === selectedViewport)

  if (loading) {
    return (
      <div className={cn('rounded-lg border border-grep-2 bg-grep-0 p-6', className)}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-5 h-5 rounded-full bg-grep-2 animate-pulse" />
          <div className="h-5 w-32 bg-grep-2 rounded animate-pulse" />
        </div>
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="aspect-video bg-grep-2 rounded animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  if (screenshots.length === 0) {
    return (
      <div className={cn('rounded-lg border border-grep-2 bg-grep-0 p-6', className)}>
        <div className="text-center py-8">
          <Monitor className="w-12 h-12 mx-auto mb-3 text-grep-7" />
          <p className="text-sm text-grep-9 font-medium mb-1">
            Screenshots will appear here once available
          </p>
          <p className="text-xs text-grep-7">
            Multi-viewport screenshots are captured during the scan
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className={cn('rounded-lg border border-grep-2 bg-grep-0 overflow-hidden', className)}>
      {/* Header */}
      <div className="border-b border-grep-2 bg-background px-4 py-3">
        <div className="flex items-center justify-between">
          <span className="text-xs text-grep-9 font-mono uppercase tracking-wide">
            Component Screenshots
          </span>
          <span className="text-xs text-grep-7 font-mono">
            {screenshots.length} captured
          </span>
        </div>
      </div>

      {/* Viewport Tabs */}
      <div className="border-b border-grep-2 bg-background px-4 py-2">
        <div className="flex gap-1">
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
                  'flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-mono transition-all cursor-pointer',
                  isSelected
                    ? 'bg-blue-500 text-white shadow-sm font-semibold'
                    : 'bg-grep-1 text-grep-9 border border-grep-2 hover:bg-grep-2 hover:border-grep-4 hover:text-foreground',
                  count === 0 && 'opacity-40 cursor-not-allowed hover:bg-grep-1'
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                {viewportLabels[viewport]}
                {count > 0 && (
                  <span className={cn(
                    'px-1.5 rounded-full text-[10px]',
                    isSelected ? 'bg-white/20 text-white' : 'bg-grep-2'
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
      <div className="p-4">
        {filteredScreenshots.length === 0 ? (
          <div className="text-center py-8 text-grep-7 text-sm font-mono">
            No screenshots for {selectedViewport} viewport
          </div>
        ) : (
          <div className="space-y-4">
            {filteredScreenshots.map((screenshot) => (
              <div
                key={screenshot.id}
                className="group relative rounded-md border border-grep-2 bg-background overflow-hidden hover:border-grep-3 transition-colors"
              >
                {/* Screenshot Image */}
                <div className="relative aspect-video bg-grep-1">
                  <Image
                    src={screenshot.url}
                    alt={screenshot.label || `${screenshot.viewport} screenshot`}
                    fill
                    className="object-cover object-top"
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  />

                  {/* Hover Overlay */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                    <a
                      href={screenshot.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="opacity-0 group-hover:opacity-100 transition-opacity px-4 py-2 rounded-md bg-background text-foreground text-xs font-mono flex items-center gap-2 hover:bg-grep-1"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Download
                    </a>
                  </div>
                </div>

                {/* Metadata */}
                {screenshot.label && (
                  <div className="px-3 py-2 border-t border-grep-2">
                    <p className="text-xs font-mono text-grep-9">{screenshot.label}</p>
                  </div>
                )}

                {/* Dimensions Badge */}
                <div className="absolute top-2 right-2 px-2 py-1 rounded bg-black/60 backdrop-blur-sm">
                  <span className="text-[10px] font-mono text-white">
                    {screenshot.width} × {screenshot.height}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}