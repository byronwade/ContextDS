"use client"

import Link from "next/link"

// Type for token export functions
type TokenExportData = {
  colors?: Array<{ value: string; name?: string; semantic?: string }>
  typography?: {
    families?: Array<{ value: string; name?: string }>
    sizes?: Array<{ value: string; name?: string }>
  }
  spacing?: Array<{ value: string; name?: string }>
  radius?: Array<{ value: string; name?: string }>
  shadows?: Array<{ value: string; name?: string }>
  gradients?: Array<{ value: string; name?: string }>
}
import { useEffect, useMemo, useState, Suspense, useCallback } from "react"
import { useSearchParams, useRouter } from "next/navigation"
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
import { SearchSidebar } from "@/components/organisms/search-sidebar"
import { ScanResultsLayout } from "@/components/organisms/scan-results-layout"
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
    setError: setSearchError,
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

  // Router for navigation
  const router = useRouter()

  // Destructure search preferences
  const { caseInsensitive, wholeWords, useRegex } = preferences

  // Load stats on mount
  useEffect(() => {
    loadStats()
  }, [loadStats])

  // Handle URL params (from scan page navigation)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const scanParam = params.get('scan')
    const searchParam = params.get('q')

    if (scanParam) {
      setViewMode('scan')
      setQuery(scanParam)
      // Trigger scan after a short delay
      setTimeout(() => {
        startScan(scanParam)
      }, 100)
      // Clean up URL
      window.history.replaceState({}, '', '/')
    } else if (searchParam) {
      setViewMode('search')
      setQuery(searchParam)
      // Clean up URL
      window.history.replaceState({}, '', '/')
    }
  }, []) // Only run on mount

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
      const shareUrl = `${window.location.origin}/scan?domain=${encodeURIComponent(scanResult.domain)}`
      navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleExport = (format: string) => {
    if (!scanResult?.curatedTokens) return

    let content = ''
    let mimeType = 'text/plain'
    let extension: string = format

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

      case 'ts':
        content = generateTypeScript(scanResult.curatedTokens)
        mimeType = 'text/typescript'
        extension = 'ts'
        break

      default:
        content = JSON.stringify(scanResult.curatedTokens, null, 2)
        mimeType = 'application/json'
        extension = 'json'
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

  const generateCSS = (tokens: TokenExportData) => {
    let css = ':root {\n'
    if (tokens.colors) {
      css += '  /* Colors */\n'
      tokens.colors.forEach((token, i: number) => {
        css += `  --color-${i + 1}: ${token.value};\n`
      })
      css += '\n'
    }
    if (tokens.typography?.families) {
      css += '  /* Fonts */\n'
      tokens.typography.families.forEach((token, i: number) => {
        css += `  --font-${i + 1}: ${token.value};\n`
      })
      css += '\n'
    }
    if (tokens.spacing) {
      css += '  /* Spacing */\n'
      tokens.spacing.forEach((token, i: number) => {
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

  const generateSCSS = (tokens: TokenExportData) => {
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

  const generateJS = (tokens: TokenExportData) => {
    return `export const tokens = ${JSON.stringify(tokens, null, 2)};\n`
  }

  const generateTailwind = (tokens: TokenExportData) => {
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

  const generateFigma = (tokens: TokenExportData) => {
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

  const generateXD = (tokens: TokenExportData) => {
    return generateFigma(tokens)
  }

  const generateSwift = (tokens: TokenExportData) => {
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

  const generateTypeScript = (tokens: TokenExportData) => {
    let ts = '// Design Tokens\n\n'
    ts += 'export const tokens = {\n'

    if (tokens.colors && tokens.colors.length > 0) {
      ts += '  colors: {\n'
      tokens.colors.forEach((token: any, i: number) => {
        ts += `    color${i + 1}: '${token.value}',\n`
      })
      ts += '  },\n\n'
    }

    if (tokens.typography?.families && tokens.typography.families.length > 0) {
      ts += '  fonts: {\n'
      tokens.typography.families.forEach((token: any, i: number) => {
        ts += `    font${i + 1}: '${token.value}',\n`
      })
      ts += '  },\n\n'
    }

    if (tokens.spacing && tokens.spacing.length > 0) {
      ts += '  spacing: {\n'
      tokens.spacing.forEach((token: any, i: number) => {
        ts += `    spacing${i + 1}: '${token.value}',\n`
      })
      ts += '  },\n\n'
    }

    if (tokens.radius && tokens.radius.length > 0) {
      ts += '  radius: {\n'
      tokens.radius.forEach((token: any, i: number) => {
        ts += `    radius${i + 1}: '${token.value}',\n`
      })
      ts += '  },\n'
    }

    ts += '} as const\n\n'
    ts += 'export type Tokens = typeof tokens\n'
    return ts
  }

  const generateAndroid = (tokens: TokenExportData) => {
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
    setViewMode('scan') // Switch to scan view immediately
    await startScan(target) // Zustand handles all state updates
  }

  // Watch for scan completion and navigate to scan page (only from home page)
  useEffect(() => {
    if (!scanResult || !scanResult.domain) return

    // Don't navigate if we're already on the scan page
    if (typeof window !== 'undefined' && window.location.pathname.includes('/scan')) {
      return
    }

    console.log('🎯 SCAN COMPLETE - Navigating to scan page', {
      domain: scanResult.domain,
      scanLoading,
      viewMode,
      hasTokens: !!scanResult.curatedTokens,
      tokensCount: scanResult.summary?.tokensExtracted
    })

    // Preload fonts for preview
    if (scanResult.curatedTokens?.typography?.families) {
      const fontFamilies = scanResult.curatedTokens.typography.families.map((f: { value: string }) => f.value)
      preloadFonts(fontFamilies)
    }

    // Refresh stats and add to recent scans
    if (scanResult.summary) {
      loadStats()
      addScan({
        domain: scanResult.domain,
        tokensExtracted: scanResult.summary.tokensExtracted,
        confidence: scanResult.summary.confidence,
        url: `/scan?domain=${encodeURIComponent(scanResult.domain)}`
      })
    }

    // Navigate to scan page with domain param
    router.push(`/scan?domain=${encodeURIComponent(scanResult.domain)}`)
  }, [scanResult, loadStats, addScan, scanLoading, viewMode, router])

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
              className="flex w-full min-w-0 shrink rounded-md border border-grep-4 bg-grep-0 py-1 text-sm transition-colors focus-visible:border-grep-12 focus-visible:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-grep-4 disabled:cursor-not-allowed disabled:opacity-50 placeholder:text-grep-7 h-[42px] md:h-9 max-md:max-w-none"
              style={{
                paddingLeft: 'clamp(95px, 100px, 105px)',
                paddingRight: viewMode === "search" ? 'clamp(90px, 92px, 96px)' : 'clamp(68px, 70px, 72px)'
              }}
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
        /* Scan Results - New Grep.app Style Layout */
        <ScanResultsLayout
          result={scanResult}
          isLoading={scanLoading}
          scanId={scanId}
          progress={scanProgress}
          onCopy={handleCopyToken}
          onExport={handleExport}
          onShare={handleShareUrl}
          showDiff={showDiff}
          onToggleDiff={() => setShowDiff(!showDiff)}
          onNewScan={() => {
            resetScan()
            setViewMode('search')
            setQuery('')
          }}
          onScanHistory={() => {
            // Could open a modal or navigate to history page
            console.log('Show scan history')
          }}
        />
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
        /* Search Results - Grep.app Style with ChatGPT Sidebar */
        <div className="h-[calc(100dvh-130px)] w-full md:h-[calc(100dvh-65px)]">
          <div className="group flex h-full w-full">
            {/* ChatGPT-Style Sidebar */}
            <SearchSidebar
              popularSites={popularSites}
              categoryFacets={categoryFacets}
              onSiteClick={(site) => setQuery(site)}
              onCategoryClick={(category) => {
                // TODO: Implement category filtering
                console.log('Filter by category:', category)
              }}
            />

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
