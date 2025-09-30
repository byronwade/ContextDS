/**
 * Accurate Font Preview Component
 * Uses Canvas-based font detection for reliable rendering
 */

'use client'

import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

interface FontPreviewProps {
  fontFamily: string
  className?: string
  children?: React.ReactNode
}

/**
 * Detect if a font is actually rendering (not falling back)
 * Uses canvas measurement technique
 */
function detectFontRendering(fontFamily: string): boolean {
  if (typeof document === 'undefined') return false

  const primaryFont = fontFamily.split(',')[0].trim().replace(/['"]/g, '')

  // Create canvas for measurement
  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d')
  if (!context) return false

  const testText = 'mmmmmmmmmmlli'
  const testSize = '72px'

  // Measure with fallback font
  context.font = `${testSize} monospace`
  const fallbackWidth = context.measureText(testText).width

  // Measure with target font
  context.font = `${testSize} "${primaryFont}", monospace`
  const targetWidth = context.measureText(testText).width

  // If widths differ, the font is rendering
  return Math.abs(targetWidth - fallbackWidth) > 1
}

/**
 * Load web font via Google Fonts with verification
 */
async function loadGoogleFont(fontFamily: string): Promise<boolean> {
  const primaryFont = fontFamily.split(',')[0].trim().replace(/['"]/g, '')

  // Check if already rendering
  if (detectFontRendering(fontFamily)) {
    return true
  }

  return new Promise((resolve) => {
    // Create Google Fonts link
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = `https://fonts.googleapis.com/css2?family=${primaryFont.replace(/\s+/g, '+')}:wght@300;400;500;600;700&display=swap`

    // Set timeout
    const timeout = setTimeout(() => {
      resolve(false)
    }, 5000)

    link.onload = () => {
      clearTimeout(timeout)

      // Wait for font to actually load
      if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(() => {
          // Verify font is rendering
          setTimeout(() => {
            resolve(detectFontRendering(fontFamily))
          }, 100)
        })
      } else {
        setTimeout(() => {
          resolve(detectFontRendering(fontFamily))
        }, 500)
      }
    }

    link.onerror = () => {
      clearTimeout(timeout)
      resolve(false)
    }

    document.head.appendChild(link)
  })
}

export function FontPreview({ fontFamily, className, children }: FontPreviewProps) {
  const [fontStatus, setFontStatus] = useState<'loading' | 'loaded' | 'fallback'>('loading')

  useEffect(() => {
    const primaryFont = fontFamily.split(',')[0].trim().replace(/['"]/g, '')

    // Immediate check if font is already rendering
    if (detectFontRendering(fontFamily)) {
      setFontStatus('loaded')
      return
    }

    // Try to load from Google Fonts
    loadGoogleFont(fontFamily).then((success) => {
      setFontStatus(success ? 'loaded' : 'fallback')
    })
  }, [fontFamily])

  const displayFontFamily = fontStatus === 'fallback'
    ? `-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`
    : fontFamily

  return (
    <div
      className={cn(
        className,
        fontStatus === 'loading' && 'animate-pulse opacity-50'
      )}
      style={{ fontFamily: displayFontFamily }}
    >
      {children}
      {fontStatus === 'fallback' && (
        <div className="absolute top-2 right-2">
          <span className="text-[9px] bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-500 px-1.5 py-0.5 rounded border border-yellow-300 dark:border-yellow-800">
            Preview Unavailable
          </span>
        </div>
      )}
    </div>
  )
}

/**
 * Font Preview Card - Complete component for token display
 */
export function FontPreviewCard({
  fontFamily,
  semantic,
  usage,
  percentage,
  onCopy
}: {
  fontFamily: string
  semantic?: string
  usage?: number
  percentage?: number
  onCopy?: () => void
}) {
  return (
    <div className="group relative p-5 rounded-lg border border-grep-2 bg-grep-0 hover:border-purple-400 hover:shadow-lg transition-all duration-200">
      <div className="flex flex-col gap-3">
        {/* Font Preview */}
        <FontPreview
          fontFamily={fontFamily}
          className="p-4 bg-grep-1 dark:bg-grep-2 rounded-lg border border-grep-2"
        >
          <p className="text-3xl text-foreground mb-2">Aa Bb Cc 123</p>
          <p className="text-sm text-grep-9">The quick brown fox jumps over the lazy dog</p>
        </FontPreview>

        {/* Font Info */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <code className="text-sm font-mono font-semibold text-foreground">
              {fontFamily.split(',')[0].trim().replace(/['"]/g, '')}
            </code>
            {onCopy && (
              <button
                onClick={onCopy}
                className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity rounded hover:bg-grep-2 flex items-center justify-center"
                title="Copy font family"
              >
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </button>
            )}
          </div>

          {semantic && (
            <p className="text-xs text-grep-9 mb-2">{semantic}</p>
          )}

          {percentage !== undefined && (
            <div className="flex items-center gap-2 text-xs">
              <div className="flex items-center gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                <span className="text-grep-9">{percentage}% usage</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/**
 * Preload font without blocking render
 */
export function preloadFont(fontFamily: string): void {
  if (typeof window === 'undefined') return

  // Check if font is already rendering
  if (detectFontRendering(fontFamily)) {
    return // Already available
  }

  // Non-blocking font load
  loadGoogleFont(fontFamily).catch(() => {
    // Silent fail - will use fallback
  })
}

/**
 * Batch preload multiple fonts
 */
export function preloadFonts(fontFamilies: string[]): void {
  fontFamilies.forEach(font => {
    setTimeout(() => preloadFont(font), 0) // Stagger loads
  })
}