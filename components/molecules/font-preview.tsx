/**
 * Smart Font Preview Component
 * Only loads fonts if not already available on user's system
 */

'use client'

import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

interface FontPreviewProps {
  fontFamily: string
  className?: string
  children?: React.ReactNode
}

// System fonts that are guaranteed to be available
const SYSTEM_FONTS = new Set([
  // macOS/iOS
  'system-ui', '-apple-system', 'BlinkMacSystemFont', 'San Francisco',
  'Helvetica Neue', 'Helvetica', 'Arial', 'Courier', 'Courier New',
  'Times', 'Times New Roman', 'Georgia', 'Verdana', 'Monaco',

  // Windows
  'Segoe UI', 'Tahoma', 'Arial', 'Trebuchet MS', 'Consolas',
  'Comic Sans MS', 'Impact', 'Lucida Console',

  // Linux
  'Ubuntu', 'Roboto', 'Oxygen', 'Cantarell', 'Fira Sans', 'Droid Sans',
  'Liberation Sans', 'DejaVu Sans',

  // Generic families
  'sans-serif', 'serif', 'monospace', 'cursive', 'fantasy'
])

// Popular web fonts from Google Fonts / Adobe Fonts
const WEB_FONTS = new Set([
  'Inter', 'Roboto', 'Open Sans', 'Lato', 'Montserrat', 'Poppins',
  'Source Sans Pro', 'Raleway', 'PT Sans', 'Noto Sans', 'Ubuntu',
  'Playfair Display', 'Merriweather', 'Crimson Text',
  'Fira Code', 'JetBrains Mono', 'Source Code Pro', 'Inconsolata',
  'Geist', 'Geist Mono', 'Cal Sans', 'Lexend'
])

/**
 * Check if font is available on the system
 */
function checkFontAvailable(fontFamily: string): boolean {
  // Extract first font from comma-separated stack
  const primaryFont = fontFamily.split(',')[0].trim().replace(/['"]/g, '')

  // Check if it's a system font
  if (SYSTEM_FONTS.has(primaryFont)) {
    return true
  }

  // Use CSS Font Loading API to check if font is available
  if (typeof document !== 'undefined' && 'fonts' in document) {
    try {
      // Check if font is already loaded
      const fontFace = `12px "${primaryFont}"`
      return document.fonts.check(fontFace)
    } catch {
      return false
    }
  }

  return false
}

/**
 * Load web font dynamically via Google Fonts
 */
function loadWebFont(fontFamily: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const primaryFont = fontFamily.split(',')[0].trim().replace(/['"]/g, '')

    // Check if it's a known web font
    if (!WEB_FONTS.has(primaryFont)) {
      resolve() // Don't try to load unknown fonts
      return
    }

    // Check if already loaded
    if (checkFontAvailable(fontFamily)) {
      resolve()
      return
    }

    // Create Google Fonts link (only for known Google Fonts)
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = `https://fonts.googleapis.com/css2?family=${primaryFont.replace(/\s+/g, '+')}:wght@400;700&display=swap`

    link.onload = () => resolve()
    link.onerror = () => resolve() // Don't fail, just use fallback

    // Set timeout to prevent hanging
    setTimeout(resolve, 3000)

    document.head.appendChild(link)
  })
}

export function FontPreview({ fontFamily, className, children }: FontPreviewProps) {
  const [fontLoaded, setFontLoaded] = useState(false)
  const [useFallback, setUseFallback] = useState(false)

  useEffect(() => {
    const primaryFont = fontFamily.split(',')[0].trim().replace(/['"]/g, '')

    // Check if font is already available (system font or cached web font)
    if (checkFontAvailable(fontFamily)) {
      setFontLoaded(true)
      return
    }

    // Try to load as web font
    if (WEB_FONTS.has(primaryFont)) {
      loadWebFont(fontFamily)
        .then(() => setFontLoaded(true))
        .catch(() => setUseFallback(true))
    } else {
      // Unknown font, use system fallback
      setUseFallback(true)
    }
  }, [fontFamily])

  const displayFontFamily = useFallback
    ? `${fontFamily.split(',')[0]}, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`
    : fontFamily

  return (
    <div
      className={cn(className, !fontLoaded && !useFallback && 'animate-pulse')}
      style={{ fontFamily: displayFontFamily }}
    >
      {children}
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
  const primaryFont = fontFamily.split(',')[0].trim().replace(/['"]/g, '')

  if (!WEB_FONTS.has(primaryFont) || checkFontAvailable(fontFamily)) {
    return // Already available or not a web font
  }

  // Non-blocking font load
  loadWebFont(fontFamily).catch(() => {
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