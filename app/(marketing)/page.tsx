"use client"

import Link from "next/link"
import { useEffect, useMemo, useState, Suspense, useCallback } from "react"
import { useSearchParams } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Search,
  Sparkles,
  Palette,
  ChevronDown,
  Filter,
  Type,
  Regex,
  ExternalLink,
  Download,
  Copy,
  Plus,
  Loader2,
  TrendingUp,
  Monitor,
  Sun,
  Moon,
  Share2,
  History
} from "lucide-react"
import { ColorCardGrid } from "@/components/organisms/color-card-grid"
import { ThemeToggle } from "@/components/atoms/theme-toggle"
import { RealtimeStat } from "@/components/atoms/realtime-stat"
import { FontPreview, FontPreviewCard, preloadFonts } from "@/components/molecules/font-preview"
import { ComprehensiveAnalysisDisplay } from "@/components/organisms/comprehensive-analysis-display"
import { RecentScansDropdown } from "@/components/molecules/recent-scans-dropdown"
import { TokenDiffViewer } from "@/components/organisms/token-diff-viewer"
import { TokenResultsDisplay } from "@/components/organisms/token-results-display"
import { SearchResultsView } from "@/components/organisms/search-results-view"
import { ScreenshotGallery } from "@/components/molecules/screenshot-gallery"
import { cn } from "@/lib/utils"
import { useRealtimeStats } from "@/hooks/use-realtime-stats"
import { useRecentScans } from "@/stores/recent-scans-store"
import { useScanStore } from "@/stores/scan-store"
import { useSearchStore } from "@/stores/search-store"
import { useUIStore } from "@/stores/ui-store"
import { useStatsStore } from "@/stores/stats-store"

const tokenCategoryOptions = [
  { key: "all", label: "All categories" },
  { key: "color", label: "Colors" },
  { key: "typography", label: "Typography" },
  { key: "dimension", label: "Spacing" },
  { key: "shadow", label: "Shadows" },
  { key: "radius", label: "Radius" },
  { key: "motion", label: "Motion" }
] as const

type TokenCategoryKey = typeof tokenCategoryOptions[number]["key"]

type TokenSearchResult = {
  id: string
  type: "token"
  name: string
  value: string
  category: string
  site?: string | null
  confidence?: number
  usage?: number
  source?: string
}

type ApiTokenResult = {
  id: string
  type: "token"
  name: string
  value?: string | number | string[]
  category: string
  site?: string | null
  confidence?: number
  usage?: number
  source?: string
}

type TokenSearchApiResponse = {
  results?: ApiTokenResult[]
}

type StatsResponse = {
  sites: number
  tokens: number
  scans: number
  tokenSets: number
  averageConfidence: number
  categories: Record<string, number>
  recentActivity: Array<{ domain: string | null; scannedAt: string | null; tokens: number }>
  popularSites: Array<{ domain: string | null; popularity: number | null; tokens: number; lastScanned: string | null }>
}

type ViewMode = "search" | "scan"

type ScanResultPayload = {
  status: "completed" | "failed"
  domain?: string
  summary?: {
    tokensExtracted: number
    curatedCount?: {
      colors: number
      fonts: number
      sizes: number
      spacing: number
      radius: number
      shadows: number
    }
    confidence: number
    completeness: number
    reliability: number
    processingTime: number
  }
  versionInfo?: {
    versionNumber: number
    isNewVersion: boolean
    previousVersionNumber?: number
    changeCount: number
    diff?: any
  }
  curatedTokens?: {
    colors: Array<{
      name: string
      value: string
      usage: number
      confidence: number
      percentage: number
      category: string
      semantic?: string
      preview?: any
    }>
    typography: {
      families: Array<{
        name: string
        value: string
        usage: number
        confidence: number
        percentage: number
        category: string
        semantic?: string
        preview?: any
      }>
      sizes: Array<{
        name: string
        value: string
        usage: number
        confidence: number
        percentage: number
        category: string
        semantic?: string
      }>
      weights: Array<{
        name: string
        value: string
        usage: number
        confidence: number
        percentage: number
        category: string
        semantic?: string
      }>
    }
    spacing: Array<{
      name: string
      value: string
      usage: number
      confidence: number
      percentage: number
      category: string
      semantic?: string
      preview?: any
    }>
    radius: Array<{
      name: string
      value: string
      usage: number
      confidence: number
      percentage: number
      category: string
      semantic?: string
      preview?: any
    }>
    shadows: Array<{
      name: string
      value: string
      usage: number
      confidence: number
      percentage: number
      category: string
      semantic?: string
      preview?: any
    }>
    motion: Array<{
      name: string
      value: string
      usage: number
      confidence: number
      percentage: number
      category: string
      semantic?: string
    }>
  }
  aiInsights?: {
    summary: string
    colorPalette: {
      style: string
      mood: string
      accessibility: string
      recommendations: string[]
    }
    typography: {
      style: string
      hierarchy: string
      readability: string
      recommendations: string[]
    }
    spacing: {
      system: string
      consistency: string
      recommendations: string[]
    }
    components: {
      patterns: string[]
      quality: string
      recommendations: string[]
    }
    overall: {
      maturity: 'prototype' | 'developing' | 'mature' | 'systematic'
      consistency: number
      aiRecommendations: string[]
    }
  }
  comprehensiveAnalysis?: {
    designSystemScore: {
      overall: number
      maturity: string
      completeness: number
      consistency: number
      scalability: number
    }
    componentArchitecture: {
      detectedPatterns: string[]
      buttonVariants: string[]
      formComponents: string[]
      cardPatterns: string[]
      navigationPatterns: string[]
      complexity: string
      reusability: number
    }
    accessibility: {
      wcagLevel: string
      contrastIssues: Array<{
        background: string
        foreground: string
        ratio: number
        recommendation: string
      }>
      colorBlindness: {
        safeForProtanopia: boolean
        safeForDeuteranopia: boolean
        safeForTritanopia: boolean
        recommendations: string[]
      }
      focusIndicators: {
        present: boolean
        quality: string
      }
      overallScore: number
    }
    tokenNamingConventions: {
      strategy: string
      examples: Array<{
        token: string
        rating: string
        suggestion?: string
      }>
      consistencyScore: number
      recommendations: string[]
    }
    designPatterns: {
      identified: Array<{
        pattern: string
        confidence: number
        examples: string[]
      }>
      antiPatterns: Array<{
        issue: string
        severity: string
        recommendation: string
      }>
    }
    brandIdentity: {
      primaryColors: string[]
      colorPersonality: string
      typographicVoice: string
      visualStyle: string[]
      industryAlignment: string
    }
    recommendations: {
      quick_wins: Array<{
        title: string
        description: string
        impact: string
        effort: string
      }>
      long_term: Array<{
        title: string
        description: string
        impact: string
        effort: string
      }>
      critical: Array<{
        issue: string
        solution: string
      }>
    }
  }
  tokens?: Record<string, Array<{ name: string; value: string; confidence?: number; usage?: number; semantic?: string }>>
  brandAnalysis?: {
    style?: string
    maturity?: string
    consistency?: number
  }
  liveMetrics?: {
    cssRules: number
    variables: number
    colors: number
    tokens: number
    qualityScore: number
  }
  layoutDNA?: Record<string, unknown>
  error?: string
}

function HomePageContent() {
  // Zustand stores
  const {
    viewMode,
    setViewMode,
    showDiff,
    setShowDiff,
    toggleSection,
    expandedSections,
    copied,
    setCopied
  } = useUIStore()

  const {
    query,
    results,
    isLoading: loading,
    error: searchError,
    preferences,
    setQuery,
    updatePreferences,
    performSearch,
    clearSearch
  } = useSearchStore()

  const {
    isScanning: scanLoading,
    result: scanResult,
    error: scanError,
    metrics: scanMetrics,
    progress: scanProgress,
    scanId,
    startScan,
    resetScan
  } = useScanStore()

  const {
    stats,
    loadStats
  } = useStatsStore()

  // Real-time stats from Neon database
  const realtimeStats = useRealtimeStats(5000)

  // Recent scans store
  const { addScan } = useRecentScans()

  // Destructure search preferences
  const { caseInsensitive, wholeWords, useRegex } = preferences

  // Load stats on mount
  useEffect(() => {
    loadStats()
  }, [loadStats])

  // Keyboard shortcut: ⌘K to focus search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        const searchInput = document.getElementById('search-input')
        searchInput?.focus()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Auto-search when query changes
  useEffect(() => {
    if (!query.trim()) {
      clearSearch()
      return
    }

    const controller = new AbortController()
    const searchTimeout = setTimeout(() => {
      performSearch(query, controller.signal)
    }, 150)

    return () => {
      controller.abort()
      clearTimeout(searchTimeout)
    }
  }, [query, performSearch, clearSearch])

  const handleCopyToken = (value: string) => {
    navigator.clipboard.writeText(value)
  }

  const handleShareUrl = () => {
    if (scanResult?.domain) {
      const shareUrl = `${window.location.origin}/scan/${encodeURIComponent(scanResult.domain)}`
      navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleExport = (format: 'json' | 'css' | 'scss' | 'js' | 'figma' | 'xd' | 'swift' | 'android' | 'tailwind') => {
    if (!scanResult?.curatedTokens) return

    let content = ''
    let mimeType = 'text/plain'
    let extension = format

    switch (format) {
      case 'json':
        content = JSON.stringify(scanResult.curatedTokens, null, 2)
        mimeType = 'application/json'
        break

      case 'css':
        content = generateCSS(scanResult.curatedTokens)
        mimeType = 'text/css'
        break

      case 'scss':
        content = generateSCSS(scanResult.curatedTokens)
        mimeType = 'text/x-scss'
        break

      case 'js':
        content = generateJS(scanResult.curatedTokens)
        mimeType = 'text/javascript'
        break

      case 'tailwind':
        content = generateTailwind(scanResult.curatedTokens)
        mimeType = 'text/javascript'
        extension = 'js'
        break

      case 'figma':
        content = generateFigma(scanResult.curatedTokens)
        mimeType = 'application/json'
        extension = 'json'
        break

      case 'xd':
        content = generateXD(scanResult.curatedTokens)
        mimeType = 'application/json'
        extension = 'json'
        break

      case 'swift':
        content = generateSwift(scanResult.curatedTokens)
        mimeType = 'text/x-swift'
        break

      case 'android':
        content = generateAndroid(scanResult.curatedTokens)
        mimeType = 'text/xml'
        extension = 'xml'
        break
    }

    const blob = new Blob([content], { type: mimeType })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `${scanResult.domain}-tokens.${extension}`
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    URL.revokeObjectURL(url)
  }

  const generateCSS = (tokens: any) => {
    let css = ':root {\n'
    if (tokens.colors) {
      css += '  /* Colors */\n'
      tokens.colors.forEach((token: any, i: number) => {
        css += `  --color-${i + 1}: ${token.value};\n`
      })
      css += '\n'
    }
    if (tokens.typography?.families) {
      css += '  /* Fonts */\n'
      tokens.typography.families.forEach((token: any, i: number) => {
        css += `  --font-${i + 1}: ${token.value};\n`
      })
      css += '\n'
    }
    if (tokens.spacing) {
      css += '  /* Spacing */\n'
      tokens.spacing.forEach((token: any, i: number) => {
        css += `  --spacing-${i + 1}: ${token.value};\n`
      })
      css += '\n'
    }
    if (tokens.radius) {
      css += '  /* Radius */\n'
      tokens.radius.forEach((token: any, i: number) => {
        css += `  --radius-${i + 1}: ${token.value};\n`
      })
      css += '\n'
    }
    if (tokens.shadows) {
      css += '  /* Shadows */\n'
      tokens.shadows.forEach((token: any, i: number) => {
        css += `  --shadow-${i + 1}: ${token.value};\n`
      })
    }
    css += '}\n'
    return css
  }

  const generateSCSS = (tokens: any) => {
    let scss = ''
    if (tokens.colors) {
      scss += '// Colors\n'
      tokens.colors.forEach((token: any, i: number) => {
        scss += `$color-${i + 1}: ${token.value};\n`
      })
      scss += '\n'
    }
    if (tokens.typography?.families) {
      scss += '// Fonts\n'
      tokens.typography.families.forEach((token: any, i: number) => {
        scss += `$font-${i + 1}: ${token.value};\n`
      })
      scss += '\n'
    }
    if (tokens.spacing) {
      scss += '// Spacing\n'
      tokens.spacing.forEach((token: any, i: number) => {
        scss += `$spacing-${i + 1}: ${token.value};\n`
      })
      scss += '\n'
    }
    if (tokens.radius) {
      scss += '// Radius\n'
      tokens.radius.forEach((token: any, i: number) => {
        scss += `$radius-${i + 1}: ${token.value};\n`
      })
      scss += '\n'
    }
    if (tokens.shadows) {
      scss += '// Shadows\n'
      tokens.shadows.forEach((token: any, i: number) => {
        scss += `$shadow-${i + 1}: ${token.value};\n`
      })
    }
    return scss
  }

  const generateJS = (tokens: any) => {
    return `export const tokens = ${JSON.stringify(tokens, null, 2)};\n`
  }

  const generateTailwind = (tokens: any) => {
    let config = '/** @type {import(\'tailwindcss\').Config} */\n'
    config += 'module.exports = {\n'
    config += '  theme: {\n'
    config += '    extend: {\n'

    // Colors
    if (tokens.colors) {
      config += '      colors: {\n'
      tokens.colors.forEach((token: any, i: number) => {
        const colorName = `color-${i + 1}`
        config += `        '${colorName}': '${token.value}',\n`
      })
      config += '      },\n'
    }

    // Font families
    if (tokens.typography?.families) {
      config += '      fontFamily: {\n'
      tokens.typography.families.forEach((token: any, i: number) => {
        const fontName = `font-${i + 1}`
        config += `        '${fontName}': ${JSON.stringify(token.value.split(',').map((f: string) => f.trim()))},\n`
      })
      config += '      },\n'
    }

    // Spacing
    if (tokens.spacing) {
      config += '      spacing: {\n'
      tokens.spacing.forEach((token: any, i: number) => {
        const spacingName = `spacing-${i + 1}`
        config += `        '${spacingName}': '${token.value}',\n`
      })
      config += '      },\n'
    }

    // Border radius
    if (tokens.radius) {
      config += '      borderRadius: {\n'
      tokens.radius.forEach((token: any, i: number) => {
        const radiusName = `radius-${i + 1}`
        config += `        '${radiusName}': '${token.value}',\n`
      })
      config += '      },\n'
    }

    // Box shadow
    if (tokens.shadows) {
      config += '      boxShadow: {\n'
      tokens.shadows.forEach((token: any, i: number) => {
        const shadowName = `shadow-${i + 1}`
        config += `        '${shadowName}': '${token.value}',\n`
      })
      config += '      },\n'
    }

    config += '    },\n'
    config += '  },\n'
    config += '}\n'
    return config
  }

  const generateFigma = (tokens: any) => {
    const figmaTokens: any = {}
    if (tokens.colors) {
      figmaTokens.colors = tokens.colors.map((token: any, i: number) => ({
        name: `color-${i + 1}`,
        value: token.value,
        type: 'color'
      }))
    }
    if (tokens.typography?.families) {
      figmaTokens.typography = tokens.typography.families.map((token: any, i: number) => ({
        name: `font-${i + 1}`,
        value: token.value,
        type: 'fontFamily'
      }))
    }
    if (tokens.spacing) {
      figmaTokens.spacing = tokens.spacing.map((token: any, i: number) => ({
        name: `spacing-${i + 1}`,
        value: token.value,
        type: 'spacing'
      }))
    }
    if (tokens.radius) {
      figmaTokens.radius = tokens.radius.map((token: any, i: number) => ({
        name: `radius-${i + 1}`,
        value: token.value,
        type: 'borderRadius'
      }))
    }
    if (tokens.shadows) {
      figmaTokens.shadows = tokens.shadows.map((token: any, i: number) => ({
        name: `shadow-${i + 1}`,
        value: token.value,
        type: 'boxShadow'
      }))
    }
    return JSON.stringify(figmaTokens, null, 2)
  }

  const generateXD = (tokens: any) => {
    return generateFigma(tokens)
  }

  const generateSwift = (tokens: any) => {
    let swift = 'import UIKit\n\nenum DesignTokens {\n'
    if (tokens.colors) {
      swift += '    enum Colors {\n'
      tokens.colors.forEach((token: any, i: number) => {
        const hex = token.value.replace('#', '')
        swift += `        static let color${i + 1} = UIColor(hex: "${hex}")\n`
      })
      swift += '    }\n\n'
    }
    if (tokens.typography?.families) {
      swift += '    enum Fonts {\n'
      tokens.typography.families.forEach((token: any, i: number) => {
        const fontName = token.value.split(',')[0].trim().replace(/['"]/g, '')
        swift += `        static let font${i + 1} = "${fontName}"\n`
      })
      swift += '    }\n\n'
    }
    if (tokens.spacing) {
      swift += '    enum Spacing {\n'
      tokens.spacing.forEach((token: any, i: number) => {
        const value = parseFloat(token.value)
        swift += `        static let spacing${i + 1}: CGFloat = ${value}\n`
      })
      swift += '    }\n\n'
    }
    if (tokens.radius) {
      swift += '    enum Radius {\n'
      tokens.radius.forEach((token: any, i: number) => {
        const value = parseFloat(token.value)
        swift += `        static let radius${i + 1}: CGFloat = ${value}\n`
      })
      swift += '    }\n'
    }
    swift += '}\n'
    return swift
  }

  const generateAndroid = (tokens: any) => {
    let xml = '<?xml version="1.0" encoding="utf-8"?>\n<resources>\n'
    if (tokens.colors) {
      xml += '    <!-- Colors -->\n'
      tokens.colors.forEach((token: any, i: number) => {
        xml += `    <color name="color_${i + 1}">${token.value}</color>\n`
      })
      xml += '\n'
    }
    if (tokens.spacing) {
      xml += '    <!-- Spacing -->\n'
      tokens.spacing.forEach((token: any, i: number) => {
        const value = token.value.replace('px', 'dp')
        xml += `    <dimen name="spacing_${i + 1}">${value}</dimen>\n`
      })
      xml += '\n'
    }
    if (tokens.radius) {
      xml += '    <!-- Radius -->\n'
      tokens.radius.forEach((token: any, i: number) => {
        const value = token.value.replace('px', 'dp')
        xml += `    <dimen name="radius_${i + 1}">${value}</dimen>\n`
      })
    }
    xml += '</resources>\n'
    return xml
  }

  const handleScan = async () => {
    const target = query.trim()
    if (!target) return

    clearSearch() // Clear search results
    await startScan(target) // Zustand handles all state updates
  }

  // Watch for scan completion
  useEffect(() => {
    if (!scanResult) return

    console.log('🎯 SCAN COMPLETE - Should show results now!', {
      domain: scanResult.domain,
      scanLoading,
      viewMode,
      hasTokens: !!scanResult.curatedTokens,
      tokensCount: scanResult.summary?.tokensExtracted
    })

    // Preload fonts for preview
    if (scanResult.curatedTokens?.typography?.families) {
      const fontFamilies = scanResult.curatedTokens.typography.families.map(f => f.value)
      preloadFonts(fontFamilies)
    }

    // Refresh stats and add to recent scans
    if (scanResult.domain && scanResult.summary) {
      loadStats()
      addScan({
        domain: scanResult.domain,
        tokensExtracted: scanResult.summary.tokensExtracted,
        confidence: scanResult.summary.confidence,
        url: `/scan/${encodeURIComponent(scanResult.domain)}`
      })
    }
  }, [scanResult, loadStats, addScan, scanLoading, viewMode])

  const categoryFacets = useMemo(() => {
    const base = tokenCategoryOptions.reduce<Record<string, number>>((acc, option) => {
      if (option.key === "all") return acc
      const statKey = option.key === "dimension" ? "spacing" : option.key
      const value = stats?.categories?.[statKey] ?? 0
      if (value > 0) {
        acc[option.key] = value
      }
      return acc
    }, {})

    return Object.entries(base).map(([key, count]) => ({
      key: key as TokenCategoryKey,
      label: tokenCategoryOptions.find(option => option.key === key)?.label ?? key,
      count
    }))
  }, [stats])

  const popularSites = useMemo(() => {
    if (!stats?.popularSites) return []
    return stats.popularSites.filter(site => site.domain).slice(0, 8)
  }, [stats])

  return (
    <div className="flex h-full w-full flex-col items-center justify-between overflow-hidden antialiased">
      {/* Minimal Grep-Style Header */}
      <header className="flex min-h-[64px] w-full shrink-0 flex-wrap items-center justify-between border-b border-grep-2 md:flex-nowrap">

        {/* Left: Brand + Live Stats */}
        <div className="flex items-center pl-4 md:pl-6 gap-4">
          <div className="flex items-center gap-2 pr-3">
            <Link className="outline-offset-4 flex items-center gap-2" href="/">
              <Palette className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              <span className="text-lg font-semibold text-black dark:text-white">ContextDS</span>
              <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-900">Beta</span>
            </Link>
          </div>

          {/* Real-time Stats - Minimal Display */}
          <div className="hidden lg:flex items-center gap-3 border-l border-grep-2 pl-4">
            <RealtimeStat
              value={realtimeStats.tokens}
              label="tokens"
              loading={realtimeStats.loading}
            />
            <div className="w-px h-3 bg-grep-3" />
            <RealtimeStat
              value={realtimeStats.sites}
              label="sites"
              loading={realtimeStats.loading}
            />
          </div>
        </div>

        {/* Center: Grep-minimal input with smart mode dropdown */}
        <div className="order-1 flex w-full items-center justify-center border-t border-grep-2 px-4 py-3 md:order-none md:border-none md:px-3 md:py-0" id="header-contents">
          <div className="relative z-10 w-full flex-grow max-w-2xl">

            {/* Mode Dropdown Selector (like grep.app repo selector) */}
            <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-2 z-20">
              <button
                onClick={() => {
                  setViewMode(viewMode === "search" ? "scan" : "search")
                  clearSearch()
                  resetScan()
                }}
                className="flex items-center gap-1.5 text-[13px] font-medium text-foreground hover:text-grep-9 transition-colors"
                title={`Mode: ${viewMode} (click to switch)`}
              >
                {viewMode === "search" ? (
                  <Search className="h-3.5 w-3.5" />
                ) : (
                  <Sparkles className="h-3.5 w-3.5" />
                )}
                <span className="capitalize">{viewMode}</span>
                <ChevronDown className="h-3 w-3" />
              </button>
              <div className="w-px h-4 bg-grep-3" />
            </div>

            {/* Input - placeholder is key to understanding mode */}
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && query.trim() && viewMode === "scan") {
                  handleScan()
                }
              }}
              placeholder={
                viewMode === "scan"
                  ? "Paste URL (stripe.com, github.com, linear.app...)"
                  : `Search ${realtimeStats.tokens > 0 ? realtimeStats.tokens.toLocaleString() + '+' : '17,000+'} design tokens`
              }
              id="search-input"
              className="flex w-full min-w-0 shrink rounded-md border border-grep-4 bg-grep-0 px-3 py-1 text-sm transition-colors focus-visible:border-grep-12 focus-visible:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-grep-4 disabled:cursor-not-allowed disabled:opacity-50 placeholder:text-grep-7 h-[42px] md:h-9 max-md:max-w-none"
              style={{paddingLeft: '105px', paddingRight: viewMode === "search" ? '96px' : '72px'}}
              spellCheck="false"
              autoCapitalize="off"
              autoComplete="off"
              autoCorrect="off"
            />

            {/* Right Controls - Contextual */}
            <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1">
              {viewMode === "search" ? (
                <>
                  <button
                    type="button"
                    onClick={() => updatePreferences({ caseInsensitive: !caseInsensitive })}
                    className={cn(
                      "border border-transparent inline-flex items-center justify-center gap-2 rounded-md text-sm text-grep-9 font-medium transition-colors h-6 px-1 min-w-6",
                      caseInsensitive && "bg-grep-11 border-grep-6 text-foreground"
                    )}
                    aria-pressed={caseInsensitive}
                    title="Match case"
                  >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="h-4 w-4">
                      <path d="M11.6667 11C12.7713 11 13.6667 10.1046 13.6667 9C13.6667 7.89543 12.7713 7 11.6667 7C10.5621 7 9.66669 7.89543 9.66669 9C9.66669 10.1046 10.5621 11 11.6667 11Z" stroke="currentColor" strokeWidth="1.5"/>
                      <path d="M13.6667 7V11" stroke="currentColor" strokeWidth="1.5"/>
                      <path fillRule="evenodd" clipRule="evenodd" d="M3.26242 10.0789L2.63419 11.8414L2.57767 12H0.985229L1.22126 11.3378L4.22128 2.92102L5.63421 2.92102L8.63419 11.3378L8.87023 12H7.27779L7.22126 11.8414L6.59305 10.0789H6.5777H3.2777H3.26242ZM3.79707 8.57885H6.0584L4.92774 5.40668L3.79707 8.57885Z" fill="currentColor"/>
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => updatePreferences({ wholeWords: !wholeWords })}
                    className={cn(
                      "border border-transparent inline-flex items-center justify-center gap-2 rounded-md text-sm text-grep-9 font-medium transition-colors h-6 px-1 min-w-6",
                      wholeWords && "bg-grep-11 border-grep-6 text-foreground"
                    )}
                    aria-pressed={wholeWords}
                    title="Match whole words"
                  >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="h-4 w-4">
                      <path d="M4.66669 10C5.77126 10 6.66669 9.10457 6.66669 8C6.66669 6.89543 5.77126 6 4.66669 6C3.56212 6 2.66669 6.89543 2.66669 8C2.66669 9.10457 3.56212 10 4.66669 10Z" stroke="currentColor" strokeWidth="1.5"/>
                      <path d="M6.66669 6V10" stroke="currentColor" strokeWidth="1.5"/>
                      <path d="M11.3333 10C12.4379 10 13.3333 9.10457 13.3333 8C13.3333 6.89543 12.4379 6 11.3333 6C10.2287 6 9.33331 6.89543 9.33331 8C9.33331 9.10457 10.2287 10 11.3333 10Z" stroke="currentColor" strokeWidth="1.5"/>
                      <path d="M9.33331 4.66675V10.0001" stroke="currentColor" strokeWidth="1.5"/>
                      <path d="M1 11V13H15V11" stroke="currentColor" strokeWidth="1.5"/>
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => updatePreferences({ useRegex: !useRegex })}
                    className={cn(
                      "border border-transparent inline-flex items-center justify-center gap-2 rounded-md text-sm text-grep-9 font-medium transition-colors h-6 px-1 min-w-6",
                      useRegex && "bg-grep-11 border-grep-6 text-foreground"
                    )}
                    aria-pressed={useRegex}
                    title="Use regular expression"
                  >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="h-4 w-4">
                      <path d="M10.8867 2V8.66667" stroke="currentColor" strokeWidth="1.5"/>
                      <path d="M8 3.66675L13.7733 7.00008" stroke="currentColor" strokeWidth="1.5"/>
                      <path d="M8 7.00008L13.7733 3.66675" stroke="currentColor" strokeWidth="1.5"/>
                      <rect x="2" y="9" width="4" height="4" fill="currentColor"/>
                    </svg>
                  </button>
                </>
              ) : (
                <Button
                  onClick={handleScan}
                  disabled={!query.trim() || scanLoading}
                  size="sm"
                  className="h-7 px-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-xs font-medium rounded hover:from-emerald-600 hover:to-teal-600 transition-all duration-200 shadow-none border-0"
                >
                  {scanLoading ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <>
                      <Sparkles className="h-3 w-3 mr-1" />
                      Scan
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Right: Minimal Actions */}
        <div className="flex min-h-[64px] select-none items-center justify-end gap-2 pr-4 md:pr-6">
          <RecentScansDropdown />
          <Link href="/community">
            <Button variant="ghost" size="sm" className="h-8 px-3 text-xs font-medium text-grep-9 hover:text-foreground">
              Community
            </Button>
          </Link>
          <Button variant="ghost" size="sm" className="hidden sm:inline-flex h-8 px-3 text-xs font-medium text-grep-9 hover:text-foreground">
            Docs
          </Button>
          <Button variant="ghost" size="sm" className="hidden md:inline-flex h-8 px-3 text-xs font-medium text-grep-9 hover:text-foreground [@media(max-width:374px)]:hidden">
            API
          </Button>
        </div>
      </header>

      {/* Mobile: Separate mode toggle + input */}
      <div className="md:hidden border-b border-grep-2 px-4 py-3">
        <div className="relative w-full">
          {/* Mobile Mode Toggle */}
          <div className="flex gap-2 mb-3">
            <button
              onClick={() => {
                setViewMode("search")
                clearSearch()
                resetScan()
              }}
              className={cn(
                "flex-1 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 flex items-center justify-center gap-2",
                viewMode === "search"
                  ? "bg-blue-500 text-white shadow-md"
                  : "bg-grep-0 text-grep-9 border border-grep-3 hover:border-grep-4"
              )}
            >
              <Search className="h-4 w-4" />
              Search
            </button>
            <button
              onClick={() => {
                setViewMode("scan")
                clearSearch()
                resetScan()
              }}
              className={cn(
                "flex-1 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 flex items-center justify-center gap-2",
                viewMode === "scan"
                  ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-md"
                  : "bg-grep-0 text-grep-9 border border-grep-3 hover:border-grep-4"
              )}
            >
              <Sparkles className="h-4 w-4" />
              Scan
            </button>
          </div>

          {/* Mobile Input */}
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && query.trim() && viewMode === "scan") {
                handleScan()
              }
            }}
            placeholder={viewMode === "scan" ? "https://stripe.com" : "Search tokens..."}
            className="h-11 pl-4 pr-12 rounded-lg border-2 border-grep-3 focus-visible:border-blue-400 focus-visible:ring-4 focus-visible:ring-blue-100 dark:focus-visible:ring-blue-950"
          />

          {viewMode === "scan" && (
            <Button
              onClick={handleScan}
              disabled={!query.trim() || scanLoading}
              size="sm"
              className="absolute right-2 top-1/2 -translate-y-1/2 h-8 px-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-md"
            >
              {scanLoading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                "Go"
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Main Content - Fixed Conditional Priority */}
      {console.log('🔍 RENDER CHECK:', { viewMode, scanLoading, scanError: !!scanError, scanResult: !!scanResult })}
      {viewMode === "scan" && scanError ? (
        /* Scan Failed - Terminal Style */
        <div className="flex-1 flex items-center justify-center p-4 md:p-12 bg-grep-0">
          <div className="w-full max-w-3xl">

            {/* Header */}
            <div className="mb-6 flex items-center justify-between border-b border-grep-2 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-red-500" />
                <h2 className="text-lg font-medium text-foreground font-mono">
                  {query}
                </h2>
              </div>
              <div className="text-sm text-red-600 dark:text-red-400 font-mono">
                FAILED
              </div>
            </div>

            {/* Error Log */}
            <div className="rounded-md border border-grep-2 bg-grep-0 font-mono text-[13px] overflow-hidden">
              <div className="border-b border-grep-2 bg-background">
                <div className="px-4 py-2.5 flex items-start gap-3">
                  <span className="shrink-0 w-4 text-center text-red-600 dark:text-red-400">
                    ✗
                  </span>
                  <div className="flex-1">
                    <div className="text-foreground">scan-failed</div>
                    <div className="mt-1 text-grep-9">
                      {scanError}
                    </div>
                  </div>
                </div>
              </div>

              {/* Suggestions */}
              <div className="border-t border-grep-2 bg-grep-0 px-4 py-3">
                <div className="text-grep-9 space-y-2">
                  <div className="text-xs text-grep-9 uppercase tracking-wide font-semibold mb-2">
                    Common Issues
                  </div>
                  <div className="space-y-1.5 text-xs">
                    <div className="flex items-start gap-2">
                      <span className="text-grep-7">•</span>
                      <span>Verify the URL is accessible and includes protocol (https://)</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-grep-7">•</span>
                      <span>Some sites block automated scanners (check robots.txt)</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-grep-7">•</span>
                      <span>Private/localhost URLs cannot be scanned</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="border-t border-grep-2 bg-background px-4 py-3 flex items-center gap-2">
                <Button
                  onClick={() => {
                    resetScan()
                    handleScan()
                  }}
                  variant="ghost"
                  size="sm"
                  className="h-7 px-3 text-xs font-mono text-grep-9 hover:text-foreground"
                >
                  ↻ Retry
                </Button>
                <Button
                  onClick={() => {
                    resetScan()
                    setQuery("")
                    setViewMode("search")
                  }}
                  variant="ghost"
                  size="sm"
                  className="h-7 px-3 text-xs font-mono text-grep-9 hover:text-foreground"
                >
                  ← Back to Search
                </Button>
              </div>
            </div>

            {/* Help text */}
            <div className="mt-4 text-center">
              <p className="text-xs text-grep-9">
                Need help? Check our <button className="underline hover:text-foreground">scanning guide</button>
              </p>
            </div>
          </div>
        </div>
      ) : viewMode === "scan" && (scanResult || scanLoading) ? (
        /* Scan Results - Grep Terminal Style with Streaming */
        <div className="flex-1 w-full overflow-y-auto bg-grep-0">
          <div className="w-full max-w-6xl mx-auto px-4 py-6 md:px-8 md:py-8">

            {/* Minimal Header with Version Info */}
            <div className="mb-6 flex items-center justify-between border-b border-grep-2 pb-4">
              <div className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full ${scanLoading ? 'bg-emerald-500 animate-pulse' : 'bg-green-500'}`} />
                <h1 className="text-xl font-medium text-foreground font-mono">
                  {scanResult?.domain || query}
                </h1>
                {scanLoading && (
                  <>
                    <span className="text-grep-7">·</span>
                    <Badge variant="secondary" className="h-6 font-mono text-xs">
                      {scanProgress?.message || scanProgress?.phase || 'scanning...'}
                    </Badge>
                  </>
                )}
                {scanResult?.versionInfo && (
                  <>
                    <span className="text-grep-7">·</span>
                    <Badge variant="secondary" className="h-6 font-mono text-xs">
                      v{scanResult.versionInfo.versionNumber}
                    </Badge>
                    {scanResult.versionInfo.isNewVersion && scanResult.versionInfo.changeCount > 0 && (
                      <Badge variant="outline" className="h-6 font-mono text-xs border-blue-300 dark:border-blue-900 text-blue-700 dark:text-blue-400">
                        {scanResult.versionInfo.changeCount} changes from v{scanResult.versionInfo.previousVersionNumber}
                      </Badge>
                    )}
                  </>
                )}
              </div>
              <div className="flex items-center gap-2">
                {scanResult?.versionInfo?.diff && scanResult.versionInfo.changeCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowDiff(!showDiff)}
                    className="h-7 px-2 text-xs font-mono text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                  >
                    <History className="h-3.5 w-3.5 mr-1" />
                    {showDiff ? 'hide changes' : 'view changes'}
                  </Button>
                )}
                {scanResult && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleCopyToken(JSON.stringify(scanResult.curatedTokens, null, 2))}
                    className="h-7 px-2 text-xs font-mono text-grep-9 hover:text-foreground"
                  >
                    <Copy className="h-3.5 w-3.5 mr-1" />
                    copy json
                  </Button>
                )}
                <div className="relative group">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs font-mono text-grep-9 hover:text-foreground"
                  >
                    <Download className="h-3.5 w-3.5 mr-1" />
                    export
                  </Button>
                  <div className="absolute right-0 top-full mt-1 w-40 bg-background border border-grep-2 rounded-md shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                    <div className="py-1">
                      <button
                        onClick={() => handleExport('json')}
                        className="w-full px-3 py-2 text-left text-xs font-mono text-grep-9 hover:text-foreground hover:bg-grep-1 transition-colors"
                      >
                        JSON
                      </button>
                      <button
                        onClick={() => handleExport('css')}
                        className="w-full px-3 py-2 text-left text-xs font-mono text-grep-9 hover:text-foreground hover:bg-grep-1 transition-colors"
                      >
                        CSS
                      </button>
                      <button
                        onClick={() => handleExport('scss')}
                        className="w-full px-3 py-2 text-left text-xs font-mono text-grep-9 hover:text-foreground hover:bg-grep-1 transition-colors"
                      >
                        SCSS
                      </button>
                      <button
                        onClick={() => handleExport('js')}
                        className="w-full px-3 py-2 text-left text-xs font-mono text-grep-9 hover:text-foreground hover:bg-grep-1 transition-colors"
                      >
                        JavaScript
                      </button>
                      <button
                        onClick={() => handleExport('tailwind')}
                        className="w-full px-3 py-2 text-left text-xs font-mono text-grep-9 hover:text-foreground hover:bg-grep-1 transition-colors"
                      >
                        Tailwind Config
                      </button>
                      <button
                        onClick={() => handleExport('figma')}
                        className="w-full px-3 py-2 text-left text-xs font-mono text-grep-9 hover:text-foreground hover:bg-grep-1 transition-colors"
                      >
                        Figma
                      </button>
                      <button
                        onClick={() => handleExport('xd')}
                        className="w-full px-3 py-2 text-left text-xs font-mono text-grep-9 hover:text-foreground hover:bg-grep-1 transition-colors"
                      >
                        Adobe XD
                      </button>
                      <button
                        onClick={() => handleExport('swift')}
                        className="w-full px-3 py-2 text-left text-xs font-mono text-grep-9 hover:text-foreground hover:bg-grep-1 transition-colors"
                      >
                        Swift
                      </button>
                      <button
                        onClick={() => handleExport('android')}
                        className="w-full px-3 py-2 text-left text-xs font-mono text-grep-9 hover:text-foreground hover:bg-grep-1 transition-colors"
                      >
                        Android
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Live Progress Messages - Show during scan */}
            {scanLoading && scanProgress && (
              <div className="mb-6 rounded-md border border-grep-2 bg-grep-0 overflow-hidden">
                <div className="px-4 py-3 flex items-start gap-3">
                  <div className="flex gap-1 mt-1">
                    <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
                    <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse [animation-delay:150ms]" />
                    <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse [animation-delay:300ms]" />
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="font-mono text-sm text-foreground">
                      {scanProgress.message}
                    </div>
                    {scanProgress.details && scanProgress.details.length > 0 && (
                      <div className="text-xs text-grep-9 font-mono space-y-0.5">
                        {scanProgress.details.slice(-3).map((detail, i) => (
                          <div key={i}>→ {detail}</div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="text-xs text-grep-7 font-mono tabular-nums">
                    {scanProgress.step}/{scanProgress.totalSteps}
                  </div>
                </div>
              </div>
            )}

            {/* Summary Stats - Terminal Style */}
            <div className="mb-6 rounded-md border border-grep-2 bg-grep-0 font-mono text-[13px] overflow-hidden">
              <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-grep-2">
                <div className="px-4 py-3 border-b border-grep-2 md:border-b-0">
                  <div className="text-grep-9 text-xs mb-1">tokens</div>
                  <div className="text-2xl font-bold text-foreground tabular-nums">
                    {scanLoading ? (
                      <div className="h-8 w-16 bg-grep-2 animate-pulse rounded" />
                    ) : (
                      scanResult?.summary?.tokensExtracted || 0
                    )}
                  </div>
                </div>
                <div className="px-4 py-3 border-b border-grep-2 md:border-b-0">
                  <div className="text-grep-9 text-xs mb-1">confidence</div>
                  <div className="text-2xl font-bold text-foreground tabular-nums">
                    {scanLoading ? (
                      <div className="h-8 w-16 bg-grep-2 animate-pulse rounded" />
                    ) : (
                      `${scanResult?.summary?.confidence || 0}%`
                    )}
                  </div>
                </div>
                <div className="px-4 py-3">
                  <div className="text-grep-9 text-xs mb-1">complete</div>
                  <div className="text-2xl font-bold text-foreground tabular-nums">
                    {scanLoading ? (
                      <div className="h-8 w-16 bg-grep-2 animate-pulse rounded" />
                    ) : (
                      `${scanResult?.summary?.completeness || 0}%`
                    )}
                  </div>
                </div>
                <div className="px-4 py-3">
                  <div className="text-grep-9 text-xs mb-1">quality</div>
                  <div className="text-2xl font-bold text-foreground tabular-nums">
                    {scanLoading ? (
                      <div className="h-8 w-16 bg-grep-2 animate-pulse rounded" />
                    ) : (
                      `${scanResult?.summary?.reliability || 0}%`
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Version Diff - Show if there are changes */}
            {showDiff && scanResult?.versionInfo?.diff && (
              <div className="mb-6">
                <TokenDiffViewer
                  diff={scanResult.versionInfo.diff}
                  oldVersion={scanResult.versionInfo.previousVersionNumber || 1}
                  newVersion={scanResult.versionInfo.versionNumber}
                  domain={scanResult.domain || ''}
                  onCopy={handleCopyToken}
                  onExport={() => {
                    const blob = new Blob([JSON.stringify(scanResult.versionInfo.diff, null, 2)], { type: "application/json" })
                    const url = URL.createObjectURL(blob)
                    const anchor = document.createElement("a")
                    anchor.href = url
                    anchor.download = `${scanResult.domain}-v${scanResult.versionInfo.previousVersionNumber}-to-v${scanResult.versionInfo.versionNumber}-diff.json`
                    document.body.appendChild(anchor)
                    anchor.click()
                    anchor.remove()
                    URL.revokeObjectURL(url)
                  }}
                />
              </div>
            )}

            {/* Comprehensive AI Analysis - Feature Showcase */}
            {scanResult?.comprehensiveAnalysis && (
              <ComprehensiveAnalysisDisplay analysis={scanResult.comprehensiveAnalysis} />
            )}

            {/* Loading State - Show skeleton loaders while scanning */}
            {scanLoading && !scanResult && (
              <div className="space-y-4">
                {/* Helpful message */}
                <div className="text-center py-4">
                  <p className="text-sm text-grep-9 font-mono">
                    Extracting design tokens... This usually takes 30-60 seconds
                  </p>
                </div>

                {/* Skeleton for Colors */}
                <div className="rounded-md border border-grep-2 bg-grep-0 overflow-hidden">
                  <div className="border-b border-grep-2 bg-background px-4 py-2.5">
                    <span className="text-xs text-grep-9 font-mono uppercase tracking-wide">Colors</span>
                  </div>
                  <div className="p-4 grid grid-cols-4 md:grid-cols-8 gap-2">
                    {Array.from({ length: 16 }).map((_, i) => (
                      <div key={i} className="h-12 bg-grep-2 animate-pulse rounded" />
                    ))}
                  </div>
                </div>

                {/* Skeleton for Typography */}
                <div className="rounded-md border border-grep-2 bg-grep-0 overflow-hidden">
                  <div className="border-b border-grep-2 bg-background px-4 py-2.5">
                    <span className="text-xs text-grep-9 font-mono uppercase tracking-wide">Typography</span>
                  </div>
                  <div className="p-4 space-y-2">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <div key={i} className="h-8 bg-grep-2 animate-pulse rounded" />
                    ))}
                  </div>
                </div>

                {/* Skeleton for Spacing */}
                <div className="rounded-md border border-grep-2 bg-grep-0 overflow-hidden">
                  <div className="border-b border-grep-2 bg-background px-4 py-2.5">
                    <span className="text-xs text-grep-9 font-mono uppercase tracking-wide">Spacing</span>
                  </div>
                  <div className="p-4 space-y-2">
                    {Array.from({ length: 8 }).map((_, i) => (
                      <div key={i} className="h-6 bg-grep-2 animate-pulse rounded" />
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Token Categories - Grep.app Style with Enhanced Features */}
            {scanResult?.curatedTokens && (
              <div className="space-y-4">

                {/* Component Screenshots */}
                {scanResult && scanId && (
                  <ScreenshotGallery scanId={scanId} />
                )}

                {/* Enhanced Token Results Display */}
                <TokenResultsDisplay
                  tokens={scanResult.curatedTokens}
                  domain={scanResult.domain || query}
                  onCopy={handleCopyToken}
                  onExport={(category) => {
                    const categoryData = category === 'typography'
                      ? scanResult.curatedTokens.typography?.families
                      : scanResult.curatedTokens[category as keyof typeof scanResult.curatedTokens]
                    if (categoryData) {
                      const blob = new Blob([JSON.stringify(categoryData, null, 2)], { type: "application/json" })
                      const url = URL.createObjectURL(blob)
                      const anchor = document.createElement("a")
                      anchor.href = url
                      anchor.download = `${scanResult.domain || query}-${category}.json`
                      document.body.appendChild(anchor)
                      anchor.click()
                      anchor.remove()
                      URL.revokeObjectURL(url)
                    }
                  }}
                />

                </div>
            )}

            {/* Components - Extracted from site */}
            {scanResult && (
              <div className="space-y-4">

                {/* Components - Buttons */}
                {scanResult.components?.buttons && scanResult.components.buttons.length > 0 && (
                  <div className="rounded-md border border-grep-2 bg-grep-0 font-mono text-[13px] overflow-hidden">
                    <div className="px-4 py-2.5 border-b border-grep-2 bg-background flex items-center justify-between">
                      <span className="text-grep-9 text-xs uppercase tracking-wide font-semibold">
                        Components - Buttons ({scanResult.components.buttons.length})
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCopyToken(JSON.stringify(scanResult.curatedTokens.typography.families, null, 2))}
                        className="h-6 px-2 text-xs text-grep-9 hover:text-foreground"
                      >
                        copy
                      </Button>
                    </div>
                    <div className="divide-y divide-grep-2">
                      {scanResult.curatedTokens.typography.families.map((token, index) => (
                        <button
                          key={`font-${index}`}
                          onClick={() => handleCopyToken(String(token.value))}
                          className="w-full px-4 py-3 text-left hover:bg-background transition-colors group"
                        >
                          <div className="flex items-center justify-between gap-4 mb-2">
                            <code className="text-sm text-foreground truncate flex-1">{token.value}</code>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className="text-[10px] text-grep-9">{token.percentage}%</span>
                              <Copy className="h-3.5 w-3.5 text-grep-7 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                          </div>
                          {/* Live font preview with fallback handling */}
                          <FontPreview fontFamily={String(token.value)} className="relative">
                            <div className="flex items-baseline gap-4 not-mono">
                              <span className="text-2xl text-foreground">Aa</span>
                              <span className="text-xl text-grep-9">Bb Cc</span>
                              <span className="text-base text-grep-9">123 abc</span>
                              <span className="text-sm text-grep-9">The quick brown fox</span>
                            </div>
                          </FontPreview>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Spacing - Compact List */}
                {scanResult.curatedTokens.spacing && scanResult.curatedTokens.spacing.length > 0 && (
                  <div className="rounded-md border border-grep-2 bg-grep-0 font-mono text-[13px] overflow-hidden">
                    <div className="px-4 py-2.5 border-b border-grep-2 bg-background flex items-center justify-between">
                      <span className="text-grep-9 text-xs uppercase tracking-wide font-semibold">
                        Spacing ({scanResult.curatedTokens.spacing.length})
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCopyToken(JSON.stringify(scanResult.curatedTokens.spacing, null, 2))}
                        className="h-6 px-2 text-xs text-grep-9 hover:text-foreground"
                      >
                        copy
                      </Button>
                    </div>
                    <div className="p-4">
                      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
                        {scanResult.curatedTokens.spacing.map((token, index) => (
                          <button
                            key={`spacing-${index}`}
                            onClick={() => handleCopyToken(String(token.value))}
                            className="flex items-center gap-2 px-3 py-2 rounded border border-grep-2 bg-background hover:border-foreground transition-colors group"
                            title={`${token.percentage}% usage`}
                          >
                            <div className="w-1 h-4 bg-foreground rounded-sm" style={{ width: `${Math.min(parseInt(token.value) / 2, 24)}px` }} />
                            <code className="text-xs text-foreground">{token.value}</code>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Radius - Inline Display */}
                {scanResult.curatedTokens.radius && scanResult.curatedTokens.radius.length > 0 && (
                  <div className="rounded-md border border-grep-2 bg-grep-0 font-mono text-[13px] overflow-hidden">
                    <div className="px-4 py-2.5 border-b border-grep-2 bg-background flex items-center justify-between">
                      <span className="text-grep-9 text-xs uppercase tracking-wide font-semibold">
                        Radius ({scanResult.curatedTokens.radius.length})
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCopyToken(JSON.stringify(scanResult.curatedTokens.radius, null, 2))}
                        className="h-6 px-2 text-xs text-grep-9 hover:text-foreground"
                      >
                        copy
                      </Button>
                    </div>
                    <div className="p-4">
                      <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                        {scanResult.curatedTokens.radius.map((token, index) => (
                          <button
                            key={`radius-${index}`}
                            onClick={() => handleCopyToken(String(token.value))}
                            className="flex flex-col items-center gap-2 p-3 rounded border border-grep-2 bg-background hover:border-foreground transition-colors"
                            title={`${token.percentage}% usage`}
                          >
                            <div className="w-12 h-12 bg-foreground" style={{ borderRadius: String(token.value) }} />
                            <code className="text-xs text-foreground">{token.value}</code>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Shadows - Table Style */}
                {scanResult.curatedTokens.shadows && scanResult.curatedTokens.shadows.length > 0 && (
                  <div className="rounded-md border border-grep-2 bg-grep-0 font-mono text-[13px] overflow-hidden">
                    <div className="px-4 py-2.5 border-b border-grep-2 bg-background flex items-center justify-between">
                      <span className="text-grep-9 text-xs uppercase tracking-wide font-semibold">
                        Shadows ({scanResult.curatedTokens.shadows.length})
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCopyToken(JSON.stringify(scanResult.curatedTokens.shadows, null, 2))}
                        className="h-6 px-2 text-xs text-grep-9 hover:text-foreground"
                      >
                        copy
                      </Button>
                    </div>
                    <div className="divide-y divide-grep-2">
                      {scanResult.curatedTokens.shadows.map((token, index) => (
                        <button
                          key={`shadow-${index}`}
                          onClick={() => handleCopyToken(String(token.value))}
                          className="w-full px-4 py-3 text-left hover:bg-background transition-colors group flex items-center gap-4"
                        >
                          <div className="w-16 h-16 shrink-0 bg-background rounded border border-grep-3 flex items-center justify-center">
                            <div className="w-10 h-10 bg-grep-0 rounded" style={{ boxShadow: String(token.value) }} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <code className="text-xs text-foreground block truncate">{token.value}</code>
                            <div className="text-[10px] text-grep-9 mt-1">{token.percentage}% usage</div>
                          </div>
                          <Copy className="h-3.5 w-3.5 text-grep-7 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Components - Buttons */}
                {scanResult.components?.buttons && scanResult.components.buttons.length > 0 && (
                  <div className="rounded-md border border-grep-2 bg-grep-0 font-mono text-[13px] overflow-hidden">
                    <div className="px-4 py-2.5 border-b border-grep-2 bg-background flex items-center justify-between">
                      <span className="text-grep-9 text-xs uppercase tracking-wide font-semibold">
                        Components - Buttons ({scanResult.components.buttons.length})
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCopyToken(JSON.stringify(scanResult.components.buttons, null, 2))}
                        className="h-6 px-2 text-xs text-grep-9 hover:text-foreground"
                      >
                        copy
                      </Button>
                    </div>
                    <div className="divide-y divide-grep-2">
                      {scanResult.components.buttons.map((button, index) => (
                        <div key={`button-${index}`} className="p-4 hover:bg-background transition-colors">
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <div className="text-sm font-semibold text-foreground mb-1">{button.variant}</div>
                              <div className="text-[10px] text-grep-9">Used {button.usage} times • {button.confidence}% confidence</div>
                            </div>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px]">
                            <div>
                              <div className="text-grep-9 mb-1">Typography</div>
                              <div className="space-y-0.5 text-grep-11">
                                <div>Font Size: <code className="text-foreground">{button.properties.fontSize}</code></div>
                                <div>Font Weight: <code className="text-foreground">{button.properties.fontWeight}</code></div>
                              </div>
                            </div>
                            <div>
                              <div className="text-grep-9 mb-1">Spacing</div>
                              <div className="space-y-0.5 text-grep-11">
                                <div>Padding X: <code className="text-foreground">{button.properties.paddingX}</code></div>
                                <div>Padding Y: <code className="text-foreground">{button.properties.paddingY}</code></div>
                              </div>
                            </div>
                            <div>
                              <div className="text-grep-9 mb-1">Colors</div>
                              <div className="space-y-0.5 text-grep-11">
                                <div className="flex items-center gap-2">
                                  <div className="w-3 h-3 rounded border border-grep-3" style={{ backgroundColor: button.properties.backgroundColor }} />
                                  Background: <code className="text-foreground">{button.properties.backgroundColor}</code>
                                </div>
                                <div className="flex items-center gap-2">
                                  <div className="w-3 h-3 rounded border border-grep-3" style={{ backgroundColor: button.properties.textColor }} />
                                  Text: <code className="text-foreground">{button.properties.textColor}</code>
                                </div>
                              </div>
                            </div>
                            <div>
                              <div className="text-grep-9 mb-1">Effects</div>
                              <div className="space-y-0.5 text-grep-11">
                                <div>Border Radius: <code className="text-foreground">{button.properties.borderRadius}</code></div>
                                {button.properties.boxShadow && (
                                  <div>Shadow: <code className="text-foreground text-[10px]">{button.properties.boxShadow}</code></div>
                                )}
                              </div>
                            </div>
                          </div>
                          {button.properties.hover && (
                            <div className="mt-3 pt-3 border-t border-grep-2">
                              <div className="text-grep-9 mb-1 text-[11px]">Hover State</div>
                              <div className="grid grid-cols-2 gap-2 text-[11px]">
                                {button.properties.hover.backgroundColor && (
                                  <div className="text-grep-11">
                                    BG: <code className="text-foreground">{button.properties.hover.backgroundColor}</code>
                                  </div>
                                )}
                                {button.properties.hover.boxShadow && (
                                  <div className="text-grep-11">
                                    Shadow: <code className="text-foreground text-[10px]">{button.properties.hover.boxShadow}</code>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Layout Patterns */}
                {scanResult.layoutPatterns && (
                  <div className="rounded-md border border-grep-2 bg-grep-0 font-mono text-[13px] overflow-hidden">
                    <div className="px-4 py-2.5 border-b border-grep-2 bg-background flex items-center justify-between">
                      <span className="text-grep-9 text-xs uppercase tracking-wide font-semibold">
                        Layout Patterns
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCopyToken(JSON.stringify(scanResult.layoutPatterns, null, 2))}
                        className="h-6 px-2 text-xs text-grep-9 hover:text-foreground"
                      >
                        copy
                      </Button>
                    </div>
                    <div className="p-4 space-y-4">
                      {/* Containers */}
                      {scanResult.layoutPatterns.containers?.maxWidths && scanResult.layoutPatterns.containers.maxWidths.length > 0 && (
                        <div>
                          <div className="text-grep-9 text-xs mb-2">Container Max Widths</div>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                            {scanResult.layoutPatterns.containers.maxWidths.slice(0, 8).map((width, index) => (
                              <button
                                key={`width-${index}`}
                                onClick={() => handleCopyToken(width.value)}
                                className="px-3 py-2 rounded border border-grep-2 bg-background hover:border-foreground transition-colors text-left"
                              >
                                <code className="text-xs text-foreground block">{width.value}</code>
                                <div className="text-[10px] text-grep-9 mt-0.5">{width.usage} uses</div>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Grid System */}
                      {scanResult.layoutPatterns.grids?.columnCounts && scanResult.layoutPatterns.grids.columnCounts.length > 0 && (
                        <div className="pt-4 border-t border-grep-2">
                          <div className="text-grep-9 text-xs mb-2">Grid Columns</div>
                          <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                            {scanResult.layoutPatterns.grids.columnCounts.map((grid, index) => (
                              <div
                                key={`grid-${index}`}
                                className="px-3 py-2 rounded border border-grep-2 bg-background text-center"
                              >
                                <div className="text-sm font-semibold text-foreground">{grid.columns}</div>
                                <div className="text-[10px] text-grep-9">cols • {grid.usage} uses</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Spacing Scale */}
                      {scanResult.layoutPatterns.spacing?.scale && scanResult.layoutPatterns.spacing.scale.length > 0 && (
                        <div className="pt-4 border-t border-grep-2">
                          <div className="text-grep-9 text-xs mb-2">
                            Spacing Scale ({scanResult.layoutPatterns.spacing.type}) • Base Unit: {scanResult.layoutPatterns.spacing.baseUnit}px
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {scanResult.layoutPatterns.spacing.scale.slice(0, 12).map((value, index) => (
                              <button
                                key={`spacing-scale-${index}`}
                                onClick={() => handleCopyToken(value)}
                                className="px-2 py-1 rounded border border-grep-2 bg-background hover:border-foreground transition-colors"
                              >
                                <code className="text-xs text-foreground">{value}</code>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Z-Index System */}
                {scanResult.zIndexSystem?.layers && scanResult.zIndexSystem.layers.length > 0 && (
                  <div className="rounded-md border border-grep-2 bg-grep-0 font-mono text-[13px] overflow-hidden">
                    <div className="px-4 py-2.5 border-b border-grep-2 bg-background flex items-center justify-between">
                      <span className="text-grep-9 text-xs uppercase tracking-wide font-semibold">
                        Z-Index Layers ({scanResult.zIndexSystem.layers.length})
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCopyToken(JSON.stringify(scanResult.zIndexSystem, null, 2))}
                        className="h-6 px-2 text-xs text-grep-9 hover:text-foreground"
                      >
                        copy
                      </Button>
                    </div>
                    <div className="p-4">
                      <div className="mb-4 text-[11px] text-grep-11">
                        Scale: <span className="text-foreground font-semibold">{scanResult.zIndexSystem.scale}</span>
                        {' • '}
                        Base: <span className="text-foreground">{scanResult.zIndexSystem.baseValue}</span>
                        {' • '}
                        Max: <span className="text-foreground">{scanResult.zIndexSystem.maxValue}</span>
                      </div>
                      <div className="space-y-2">
                        {scanResult.zIndexSystem.layers.slice(0, 10).map((layer, index) => (
                          <div
                            key={`layer-${index}`}
                            className="px-3 py-2 rounded border border-grep-2 bg-background hover:border-foreground transition-colors"
                          >
                            <div className="flex items-center justify-between mb-1">
                              <div className="flex items-center gap-2">
                                <code className="text-sm font-semibold text-foreground">{layer.value}</code>
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-grep-2 text-grep-11">
                                  {layer.semanticLayer}
                                </span>
                              </div>
                              <div className="text-[10px] text-grep-9">{layer.usage} uses</div>
                            </div>
                            {layer.selectors.length > 0 && (
                              <div className="text-[10px] text-grep-9">
                                {layer.selectors.slice(0, 2).join(', ')}
                                {layer.selectors.length > 2 && ` +${layer.selectors.length - 2} more`}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Animation System */}
                {scanResult.animationSystem && (
                  <div className="rounded-md border border-grep-2 bg-grep-0 font-mono text-[13px] overflow-hidden">
                    <div className="px-4 py-2.5 border-b border-grep-2 bg-background flex items-center justify-between">
                      <span className="text-grep-9 text-xs uppercase tracking-wide font-semibold">
                        Animation & Transitions
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCopyToken(JSON.stringify(scanResult.animationSystem, null, 2))}
                        className="h-6 px-2 text-xs text-grep-9 hover:text-foreground"
                      >
                        copy
                      </Button>
                    </div>
                    <div className="p-4 space-y-4">
                      {/* Durations */}
                      {scanResult.animationSystem.durations && scanResult.animationSystem.durations.length > 0 && (
                        <div>
                          <div className="text-grep-9 text-xs mb-2">Durations</div>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                            {scanResult.animationSystem.durations.slice(0, 8).map((duration, index) => (
                              <button
                                key={`duration-${index}`}
                                onClick={() => handleCopyToken(duration.value)}
                                className="px-3 py-2 rounded border border-grep-2 bg-background hover:border-foreground transition-colors text-left"
                              >
                                <code className="text-xs text-foreground block">{duration.value}</code>
                                <div className="text-[10px] text-grep-9">{duration.semantic} • {duration.usage} uses</div>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Timing Functions */}
                      {scanResult.animationSystem.timingFunctions && scanResult.animationSystem.timingFunctions.length > 0 && (
                        <div className="pt-4 border-t border-grep-2">
                          <div className="text-grep-9 text-xs mb-2">Timing Functions</div>
                          <div className="space-y-2">
                            {scanResult.animationSystem.timingFunctions.slice(0, 6).map((timing, index) => (
                              <button
                                key={`timing-${index}`}
                                onClick={() => handleCopyToken(timing.value)}
                                className="w-full px-3 py-2 rounded border border-grep-2 bg-background hover:border-foreground transition-colors text-left"
                              >
                                <div className="flex items-center justify-between">
                                  <div>
                                    <code className="text-xs text-foreground block">{timing.value}</code>
                                    <div className="text-[10px] text-grep-9 mt-0.5">{timing.semantic}</div>
                                  </div>
                                  <div className="text-[10px] text-grep-9">{timing.usage} uses</div>
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Common Transitions */}
                      {scanResult.animationSystem.commonTransitions && scanResult.animationSystem.commonTransitions.length > 0 && (
                        <div className="pt-4 border-t border-grep-2">
                          <div className="text-grep-9 text-xs mb-2">Common Transitions</div>
                          <div className="space-y-2">
                            {scanResult.animationSystem.commonTransitions.slice(0, 5).map((transition, index) => (
                              <div
                                key={`transition-${index}`}
                                className="px-3 py-2 rounded border border-grep-2 bg-background"
                              >
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-grep-2 text-grep-11">
                                    {transition.semantic}
                                  </span>
                                  <div className="text-[10px] text-grep-9">{transition.usage} uses</div>
                                </div>
                                <div className="text-[11px] text-grep-11 space-y-0.5">
                                  <div>Properties: <code className="text-foreground">{transition.properties.join(', ')}</code></div>
                                  <div>Duration: <code className="text-foreground">{transition.duration}</code></div>
                                  <div>Timing: <code className="text-foreground">{transition.timing}</code></div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      ) : viewMode === "search" && searchError ? (
        /* Search Failed - Terminal Style */
        <div className="flex-1 flex items-center justify-center p-4 md:p-12 bg-grep-0">
          <div className="w-full max-w-3xl">

            {/* Header */}
            <div className="mb-6 flex items-center justify-between border-b border-grep-2 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-red-500" />
                <h2 className="text-lg font-medium text-foreground font-mono">
                  search: {query}
                </h2>
              </div>
              <div className="text-sm text-red-600 dark:text-red-400 font-mono">
                ERROR
              </div>
            </div>

            {/* Error Output */}
            <div className="rounded-md border border-grep-2 bg-grep-0 font-mono text-[13px] overflow-hidden">
              <div className="bg-background px-4 py-2.5">
                <div className="flex items-start gap-3">
                  <span className="shrink-0 w-4 text-center text-red-600 dark:text-red-400">
                    ✗
                  </span>
                  <div className="flex-1">
                    <div className="text-foreground">search-error</div>
                    <div className="mt-1 text-grep-9">
                      {searchError}
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="border-t border-grep-2 bg-grep-0 px-4 py-3 flex items-center gap-2">
                <Button
                  onClick={() => {
                    setSearchError(null)
                    setQuery("")
                  }}
                  variant="ghost"
                  size="sm"
                  className="h-7 px-3 text-xs font-mono text-grep-9 hover:text-foreground"
                >
                  ✕ Clear
                </Button>
                <Button
                  onClick={() => {
                    setSearchError(null)
                    setViewMode("scan")
                  }}
                  variant="ghost"
                  size="sm"
                  className="h-7 px-3 text-xs font-mono text-grep-9 hover:text-foreground"
                >
                  → Try Scan Instead
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : viewMode === "search" && (loading || results.length > 0 || query.trim()) ? (
        /* Search Results - Grep.app Style */
        <div className="h-[calc(100dvh-130px)] w-full md:h-[calc(100dvh-65px)]">
          <div className="group flex h-full w-full">
            {/* Left Sidebar - Filters */}
            <div className="hidden overflow-y-auto md:flex md:w-[24%] md:min-w-[200px] lg:max-w-[320px]">
              <div className="flex w-full flex-col divide-y divide-dashed px-3">
                {/* Repository Filter */}
                <div className="w-full select-none py-2">
                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-foreground">Repository</h3>
                    <div className="space-y-2">
                      {popularSites.slice(0, 8).map((site) => (
                        <button
                          key={site.domain}
                          onClick={() => setQuery(site.domain || '')}
                          className="group/facet flex h-10 w-full items-center justify-between rounded-md bg-grep-0 px-2 py-2 hover:bg-muted"
                        >
                          <div className="flex min-w-0 items-center justify-start gap-2">
                            <div className="w-4 h-4 rounded-sm bg-neutral-300 dark:bg-neutral-700" />
                            <span className="truncate text-[14px] md:text-[13px]">{site.domain}</span>
                          </div>
                          <span className="rounded-full bg-muted px-2 py-0.5 text-xxs tabular-nums text-muted-foreground group-hover/facet:bg-grep-2">
                            {site.tokens}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Category Filter */}
                <div className="w-full select-none py-2">
                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-foreground">Category</h3>
                    <div className="space-y-2">
                      {categoryFacets.map((facet) => (
                        <label key={facet.key} className="group/facet flex h-10 w-full cursor-pointer items-center justify-between rounded-md bg-grep-0 px-2 py-2 hover:bg-muted">
                          <div className="flex min-w-0 items-center justify-start gap-2">
                            <button
                              type="button"
                              role="checkbox"
                              className="peer h-4 w-4 shrink-0 rounded-sm border focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground border-grep-9 shadow-none data-[state=checked]:border-foreground"
                            />
                            <span className="truncate text-[14px] md:text-[13px]">{facet.label}</span>
                          </div>
                          <span className="rounded-full bg-muted px-2 py-0.5 text-xxs tabular-nums text-muted-foreground group-hover/facet:bg-grep-2">
                            {facet.count}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Main Content Area */}
            <div className="flex w-full flex-1 flex-col border-grep-2 md:border-l">
              <SearchResultsView
                results={results}
                loading={loading}
                onScanSite={(site) => {
                  setQuery(site)
                  setViewMode("scan")
                  setTimeout(() => handleScan(), 100)
                }}
                onLoadMore={() => {
                  // TODO: Implement pagination
                  console.log('Load more results')
                }}
              />
            </div>
          </div>
        </div>
      ) : (
        /* Home View - Minimal ContextDS */
        <div className="absolute top-[64px] flex h-[calc(100dvh-64px)] w-full flex-col items-center justify-between overflow-y-auto">
          <div className="flex min-h-full w-full shrink-0 select-none flex-col items-center justify-center px-4 py-12">

            {/* Hero Content */}
            <div className="max-w-3xl mx-auto text-center space-y-6">

              {/* Headline - Clear value prop */}
              <div className="space-y-4">
                <h1 className="text-[2.5rem]/[3rem] sm:text-6xl font-bold tracking-tight text-foreground">
                  Extract design tokens<br />from any website
                </h1>
                <p className="text-base sm:text-lg text-grep-9 max-w-2xl mx-auto leading-relaxed">
                  Scan sites like{" "}
                  <button
                    onClick={() => { setQuery('stripe.com'); setViewMode('scan'); }}
                    className="text-foreground font-medium hover:underline"
                  >
                    Stripe
                  </button>
                  ,{" "}
                  <button
                    onClick={() => { setQuery('linear.app'); setViewMode('scan'); }}
                    className="text-foreground font-medium hover:underline"
                  >
                    Linear
                  </button>
                  , and{" "}
                  <button
                    onClick={() => { setQuery('github.com'); setViewMode('scan'); }}
                    className="text-foreground font-medium hover:underline"
                  >
                    GitHub
                  </button>
                  {" "}to extract colors, typography, spacing. Then search across{" "}
                  <span className="text-foreground font-semibold">{realtimeStats.tokens > 0 ? realtimeStats.tokens.toLocaleString() : '17,000'}+ tokens</span>.
                </p>
              </div>

              {/* Visual Example - Token Preview */}
              <div className="flex items-center justify-center pt-4 pb-2">
                <div className="inline-flex items-center gap-4 px-5 py-4 rounded-xl border border-grep-2 bg-grep-0">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-lg border-2 border-grep-3 shadow-sm" style={{backgroundColor: '#0070f3'}} />
                    <div className="w-10 h-10 rounded-lg border-2 border-grep-3 shadow-sm" style={{backgroundColor: '#7928ca'}} />
                    <div className="w-10 h-10 rounded-lg border-2 border-grep-3 shadow-sm" style={{backgroundColor: '#ff0080'}} />
                    <div className="w-10 h-10 rounded-lg border-2 border-grep-3 shadow-sm" style={{backgroundColor: '#50e3c2'}} />
                  </div>
                  <div className="w-px h-10 bg-grep-3" />
                  <div className="text-left">
                    <p className="text-[10px] text-grep-9 uppercase tracking-wide font-semibold mb-0.5">Extracted Tokens</p>
                    <code className="text-xs text-foreground font-mono">#0070f3, #7928ca, #ff0080...</code>
                  </div>
                </div>
              </div>

              {/* Stats - Prominent & Live */}
              {!realtimeStats.loading && (
                <div className="flex items-center justify-center gap-8 pt-6 text-[13px]">
                  <div className="text-center">
                    <p className={cn(
                      "text-2xl font-bold text-foreground tabular-nums transition-all duration-300",
                      realtimeStats.tokens > 0 && "animate-in fade-in"
                    )}>
                      {realtimeStats.tokens.toLocaleString()}
                    </p>
                    <p className="text-grep-9">design tokens</p>
                  </div>
                  <div className="w-px h-12 bg-grep-3" />
                  <div className="text-center">
                    <p className={cn(
                      "text-2xl font-bold text-foreground tabular-nums transition-all duration-300",
                      realtimeStats.sites > 0 && "animate-in fade-in"
                    )}>
                      {realtimeStats.sites}
                    </p>
                    <p className="text-grep-9">sites analyzed</p>
                  </div>
                  <div className="w-px h-12 bg-grep-3" />
                  <div className="text-center">
                    <p className={cn(
                      "text-2xl font-bold text-foreground tabular-nums transition-all duration-300",
                      realtimeStats.scans > 0 && "animate-in fade-in"
                    )}>
                      {realtimeStats.scans}
                    </p>
                    <p className="text-grep-9">scans completed</p>
                  </div>
                </div>
              )}

              {/* Popular Sites - Interactive Examples */}
              {popularSites.length > 0 && (
                <div className="pt-8">
                  <p className="text-xs text-grep-9 uppercase tracking-wide font-semibold mb-3">Try scanning</p>
                  <div className="flex items-center justify-center gap-2 flex-wrap">
                    {popularSites.slice(0, 6).map((site) => (
                      <button
                        key={site.domain}
                        onClick={() => {
                          setQuery(site.domain || '')
                          setViewMode("scan")
                          setTimeout(() => handleScan(), 100)
                        }}
                        className="group px-4 py-2 rounded-lg border border-grep-3 bg-grep-0 hover:border-foreground hover:bg-grep-1 transition-all text-sm text-foreground font-medium flex items-center gap-2"
                      >
                        <div className="w-2 h-2 rounded-full bg-grep-9 group-hover:bg-emerald-500 transition-colors" />
                        {site.domain}
                        <span className="text-xs text-grep-9">{site.tokens}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

            {/* Footer with Theme Toggle */}
            <div className="w-full select-none border-t border-grep-2 px-4 py-6 text-sm text-grep-9 sm:px-12 sm:py-8">
              <div className="relative flex flex-col gap-6">
                <div className="flex min-h-8 w-full flex-wrap items-center gap-6">
                  <div className="max-sm:w-full">
                    <Link href="/">
                      <div className="flex items-center gap-2">
                        <Palette className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                        <span className="font-medium text-black dark:text-white">ContextDS</span>
                      </div>
                    </Link>
                  </div>
                  <div className="max-sm:w-36">
                    <Link className="text-grep-9 hover:text-foreground" href="/docs">Docs</Link>
                  </div>
                  <div className="max-sm:w-36">
                    <Link className="text-grep-9 hover:text-foreground" href="/api">API</Link>
                  </div>
                  <div className="max-sm:w-36">
                    <Link className="text-grep-9 hover:text-foreground" href="/community">Community</Link>
                  </div>
                  <div className="max-sm:w-36">
                    <Link className="text-grep-9 hover:text-foreground" href="/pricing">Pricing</Link>
                  </div>
                  <div className="max-sm:w-36">
                    <Link className="text-grep-9 hover:text-foreground" href="/privacy">Privacy</Link>
                  </div>
                  <div className="max-sm:w-36">
                    <Link className="text-grep-9 hover:text-foreground" href="/terms">Terms</Link>
                  </div>
                </div>
                <div className="flex items-center max-sm:h-8">© 2025, ContextDS Inc.</div>

                {/* Theme Toggle - Exact Grep.app Style */}
                <div className="absolute right-0 max-sm:bottom-0">
                  <div className="relative flex h-8 w-[96px] items-center justify-between rounded-full border border-grep-2">
                    <div className="absolute h-8 w-8 rounded-full border border-grep-3" style={{transform: 'translateX(calc(-1px))'}}></div>
                    <button className="relative z-10 mx-[-1px] flex h-8 w-8 items-center justify-center transition-colors duration-200 text-foreground" aria-label="Switch to system theme">
                      <Monitor className="h-4 w-4" />
                    </button>
                    <button className="relative z-10 mx-[-1px] flex h-8 w-8 items-center justify-center transition-colors duration-200 text-grep-9 hover:text-foreground" aria-label="Switch to light theme">
                      <Sun className="h-4 w-4" />
                    </button>
                    <button className="relative z-10 mx-[-1px] flex h-8 w-8 items-center justify-center transition-colors duration-200 text-grep-9 hover:text-foreground" aria-label="Switch to dark theme">
                      <Moon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
        </div>
      )}
    </div>
  )
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

function normalizeTokenValue(value?: string | number | string[]): string {
  if (Array.isArray(value)) {
    return value.join(", ")
  }
  if (typeof value === "number") {
    return value.toString()
  }
  return value ?? ""
}

export default function HomePage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen w-full items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-8 h-8 border-2 border-neutral-200 dark:border-neutral-800 border-t-blue-500 rounded-full animate-spin mx-auto" />
          <p className="text-sm text-neutral-600 dark:text-neutral-400">Loading ContextDS...</p>
        </div>
      </div>
    }>
      <HomePageContent />
    </Suspense>
  )
}
