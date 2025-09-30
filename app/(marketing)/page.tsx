"use client"

import Link from "next/link"
import { useEffect, useMemo, useState, Suspense } from "react"
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
  Moon
} from "lucide-react"
import { ColorCardGrid } from "@/components/organisms/color-card-grid"
import { ThemeToggle } from "@/components/atoms/theme-toggle"
import { RealtimeStat } from "@/components/atoms/realtime-stat"
import { ScanProgressViewer } from "@/components/organisms/scan-progress-viewer"
import { FontPreviewCard, preloadFonts } from "@/components/molecules/font-preview"
import { ComprehensiveAnalysisDisplay } from "@/components/organisms/comprehensive-analysis-display"
import { cn } from "@/lib/utils"
import { useRealtimeStats } from "@/hooks/use-realtime-stats"

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
  layoutDNA?: Record<string, unknown>
  error?: string
}

function HomePageContent() {
  const searchParams = useSearchParams()
  const [viewMode, setViewMode] = useState<ViewMode>("search")
  const [query, setQuery] = useState("")
  const [isSearchActive, setIsSearchActive] = useState(false)
  const [hasResults, setHasResults] = useState(false)
  const [caseInsensitive, setCaseInsensitive] = useState(false)
  const [wholeWords, setWholeWords] = useState(false)
  const [useRegex, setUseRegex] = useState(false)
  const [results, setResults] = useState<TokenSearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [stats, setStats] = useState<StatsResponse | null>(null)
  const [scanResult, setScanResult] = useState<ScanResultPayload | null>(null)
  const [scanLoading, setScanLoading] = useState(false)
  const [scanError, setScanError] = useState<string | null>(null)

  // Expandable sections state
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set())

  const toggleSection = (section: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev)
      if (next.has(section)) {
        next.delete(section)
      } else {
        next.add(section)
      }
      return next
    })
  }

  // Real-time stats from Neon database
  const realtimeStats = useRealtimeStats(5000) // Updates every 5 seconds

  useEffect(() => {
    setIsSearchActive(query.trim().length > 0)
    setHasResults(results.length > 0 || scanResult !== null)
  }, [query, results, scanResult])

  useEffect(() => {
    const loadStats = async () => {
      try {
        const response = await fetch("/api/stats")
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        const data = await response.json()
        setStats(data)
      } catch (error) {
        console.error("Failed to load stats", error)
        setStats(null)
      }
    }

    loadStats()
  }, [])

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

  useEffect(() => {
    if (!query.trim()) {
      setResults([])
      setSearchError(null)
      setLoading(false)
      return
    }

    const controller = new AbortController()
    const searchTimeout = setTimeout(() => {
      handleSearch(query, controller.signal)
    }, 150)

    return () => {
      controller.abort()
      clearTimeout(searchTimeout)
    }
  }, [query, caseInsensitive, wholeWords, useRegex])

  const handleSearch = async (searchQuery: string, signal?: AbortSignal) => {
    const trimmed = searchQuery.trim()
    if (!trimmed) return

    setLoading(true)
    setSearchError(null)

    try {
      const params = new URLSearchParams({
        query: trimmed,
        mode: "tokens",
        caseInsensitive: caseInsensitive ? "true" : "false",
        limit: "150"
      })

      const response = await fetch(`/api/search?${params.toString()}`, { signal })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)

      const data = (await response.json()) as TokenSearchApiResponse
      let items: TokenSearchResult[] = (data.results ?? []).map((item) => ({
        id: item.id,
        type: item.type,
        name: item.name,
        value: normalizeTokenValue(item.value),
        category: item.category,
        site: item.site,
        confidence: item.confidence,
        usage: item.usage,
        source: item.source
      }))

      if (useRegex) {
        try {
          const regex = new RegExp(trimmed, caseInsensitive ? "i" : undefined)
          items = items.filter(result => regex.test(result.name) || regex.test(String(result.value)))
        } catch (error) {
          setSearchError("Invalid regular expression")
          items = []
        }
      } else if (wholeWords) {
        const searchTerm = caseInsensitive ? trimmed.toLowerCase() : trimmed
        items = items.filter(result => {
          const tokenName = caseInsensitive ? result.name.toLowerCase() : result.name
          const tokenValue = caseInsensitive ? String(result.value).toLowerCase() : String(result.value)
          const wordBoundary = new RegExp(`\\b${escapeRegex(searchTerm)}\\b`, caseInsensitive ? "i" : undefined)
          return wordBoundary.test(tokenName) || wordBoundary.test(tokenValue)
        })
      }

      setResults(items)

    } catch (error) {
      if ((error as Error).name === "AbortError") return
      setSearchError(error instanceof Error ? error.message : "Search failed")
      setResults([])
    } finally {
      setLoading(false)
    }
  }

  const handleCopyToken = (value: string) => {
    navigator.clipboard.writeText(value)
  }

  const handleScan = async () => {
    const target = query.trim()
    if (!target) return

    setScanLoading(true)
    setScanResult(null)
    setScanError(null)
    setResults([]) // Clear search results

    try {
      const response = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: target.startsWith("http") ? target : `https://${target}`,
          prettify: false,
          quality: "standard"
        })
      })

      if (!response.ok) {
        throw new Error(`Scan failed with status ${response.status}`)
      }

      const result = (await response.json()) as ScanResultPayload

      if (result.status === "failed") {
        throw new Error(result.error || "Scan failed")
      }

      setScanResult(result)

      // Preload fonts for preview (non-blocking)
      if (result.curatedTokens?.typography?.families) {
        const fontFamilies = result.curatedTokens.typography.families.map(f => f.value)
        preloadFonts(fontFamilies)
      }

      // Refresh stats
      const statsResponse = await fetch("/api/stats")
      if (statsResponse.ok) {
        const statsData = await statsResponse.json()
        setStats(statsData)
      }

    } catch (error) {
      setScanError(error instanceof Error ? error.message : "Scan failed")
    } finally {
      setScanLoading(false)
    }
  }

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
          <div className="flex items-center space-x-2 pr-3">
            <Link className="outline-offset-4" href="/">
              <svg aria-label="ContextDS" className="fill-black dark:fill-white" viewBox="0 0 75 65" height="22">
                <path d="M37.59.25l36.95 64H.64l36.95-64z"></path>
              </svg>
            </Link>
            <svg fill="none" height="24" shapeRendering="geometricPrecision" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" viewBox="0 0 24 24" width="24" className="stroke-grep-4" style={{width: '22px', height: '22px'}}>
              <path d="M16.88 3.549L7.12 20.451"></path>
            </svg>
            <Link className="outline-offset-4" href="/">
              <div className="flex items-center gap-2">
                <Palette className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                <span className="text-lg font-semibold text-black dark:text-white">ContextDS</span>
              </div>
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
                  setResults([])
                  setScanResult(null)
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
                    onClick={() => setCaseInsensitive(!caseInsensitive)}
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
                    onClick={() => setWholeWords(!wholeWords)}
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
                    onClick={() => setUseRegex(!useRegex)}
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
        <div className="flex min-h-[64px] select-none items-center justify-end gap-3 pr-4 md:pr-6">
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
                setResults([])
                setScanResult(null)
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
                setResults([])
                setScanResult(null)
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

      {/* Main Content */}
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
                    setScanError(null)
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
                    setScanError(null)
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
      ) : viewMode === "scan" && scanResult ? (
        /* Scan Results - Grep Terminal Style */
        <div className="flex-1 w-full overflow-y-auto bg-grep-0">
          <div className="w-full max-w-6xl mx-auto px-4 py-6 md:px-8 md:py-8">

            {/* Minimal Header */}
            <div className="mb-6 flex items-center justify-between border-b border-grep-2 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <h1 className="text-xl font-medium text-foreground font-mono">
                  {scanResult.domain}
                </h1>
              </div>
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleCopyToken(JSON.stringify(scanResult.curatedTokens, null, 2))}
                  className="h-7 px-2 text-xs font-mono text-grep-9 hover:text-foreground"
                >
                  <Copy className="h-3.5 w-3.5 mr-1" />
                  copy
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const blob = new Blob([JSON.stringify(scanResult.curatedTokens, null, 2)], { type: "application/json" })
                    const url = URL.createObjectURL(blob)
                    const anchor = document.createElement("a")
                    anchor.href = url
                    anchor.download = `${scanResult.domain}-tokens.json`
                    document.body.appendChild(anchor)
                    anchor.click()
                    anchor.remove()
                    URL.revokeObjectURL(url)
                  }}
                  className="h-7 px-2 text-xs font-mono text-grep-9 hover:text-foreground"
                >
                  <Download className="h-3.5 w-3.5 mr-1" />
                  export
                </Button>
              </div>
            </div>

            {/* Summary Stats - Terminal Style */}
            <div className="mb-6 rounded-md border border-grep-2 bg-grep-0 font-mono text-[13px] overflow-hidden">
              <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-grep-2">
                <div className="px-4 py-3 border-b border-grep-2 md:border-b-0">
                  <div className="text-grep-9 text-xs mb-1">tokens</div>
                  <div className="text-2xl font-bold text-foreground tabular-nums">
                    {scanResult.summary?.tokensExtracted || 0}
                  </div>
                </div>
                <div className="px-4 py-3 border-b border-grep-2 md:border-b-0">
                  <div className="text-grep-9 text-xs mb-1">confidence</div>
                  <div className="text-2xl font-bold text-foreground tabular-nums">
                    {scanResult.summary?.confidence || 0}%
                  </div>
                </div>
                <div className="px-4 py-3">
                  <div className="text-grep-9 text-xs mb-1">complete</div>
                  <div className="text-2xl font-bold text-foreground tabular-nums">
                    {scanResult.summary?.completeness || 0}%
                  </div>
                </div>
                <div className="px-4 py-3">
                  <div className="text-grep-9 text-xs mb-1">quality</div>
                  <div className="text-2xl font-bold text-foreground tabular-nums">
                    {scanResult.summary?.reliability || 0}%
                  </div>
                </div>
              </div>
            </div>

            {/* Comprehensive AI Analysis - Feature Showcase */}
            {scanResult.comprehensiveAnalysis && (
              <ComprehensiveAnalysisDisplay analysis={scanResult.comprehensiveAnalysis} />
            )}

            {/* Token Categories - Minimal Grep Style */}
            {scanResult.curatedTokens && (
              <div className="space-y-4">

                {/* Colors - Compact Grid */}
                {scanResult.curatedTokens.colors && scanResult.curatedTokens.colors.length > 0 && (
                  <div className="rounded-md border border-grep-2 bg-grep-0 font-mono text-[13px] overflow-hidden">
                    <div className="px-4 py-2.5 border-b border-grep-2 bg-background flex items-center justify-between">
                      <span className="text-grep-9 text-xs uppercase tracking-wide font-semibold">
                        Colors ({scanResult.curatedTokens.colors.length})
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCopyToken(JSON.stringify(scanResult.curatedTokens.colors, null, 2))}
                        className="h-6 px-2 text-xs text-grep-9 hover:text-foreground"
                      >
                        copy
                      </Button>
                    </div>
                    <div className="p-4">
                      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                        {scanResult.curatedTokens.colors.map((token, index) => (
                          <button
                            key={`color-${index}`}
                            onClick={() => handleCopyToken(String(token.value))}
                            className="group flex flex-col gap-2 p-2 rounded border border-grep-2 bg-background hover:border-foreground transition-colors"
                            title={`${token.value} · ${token.usage} uses (${token.percentage}% of colors)`}
                          >
                            <div
                              className="w-full h-16 rounded border border-grep-3"
                              style={{ backgroundColor: String(token.value) }}
                            />
                            <div className="text-left w-full">
                              <code className="text-xs text-foreground block truncate">{token.value}</code>
                              <div className="flex items-center justify-between mt-1">
                                <span className="text-[10px] text-grep-9">{token.usage} uses</span>
                                <div className="flex items-center gap-1">
                                  <div className="w-8 h-0.5 bg-grep-3 rounded-full overflow-hidden">
                                    <div
                                      className="h-full bg-blue-500 rounded-full transition-all"
                                      style={{ width: `${token.percentage}%` }}
                                    />
                                  </div>
                                  <span className="text-[9px] text-grep-9 tabular-nums">{token.percentage}%</span>
                                </div>
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Typography - Accurate Preview */}
                {scanResult.curatedTokens.typography?.families && scanResult.curatedTokens.typography.families.length > 0 && (
                  <div className="rounded-md border border-grep-2 bg-grep-0 font-mono text-[13px] overflow-hidden">
                    <div className="px-4 py-2.5 border-b border-grep-2 bg-background flex items-center justify-between">
                      <span className="text-grep-9 text-xs uppercase tracking-wide font-semibold">
                        Typography ({scanResult.curatedTokens.typography.families.length})
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
              </div>
            )}
          </div>
        </div>
      ) : viewMode === "scan" && scanLoading ? (
        /* Scan Loading - Live Progress Viewer */
        <div className="flex-1 flex items-center justify-center p-4 md:p-12 bg-grep-0">
          <ScanProgressViewer domain={query} />
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
              {/* Results Header */}
              <div className="flex min-h-[48px] w-full flex-row items-center justify-between border-b border-grep-2 px-4 text-[13px]/[13px] md:pr-0 [@media(max-height:480px)]:hidden">
                <div className="flex flex-row items-center gap-1">
                  <span className="font-medium text-grep-9">{results.length.toLocaleString()} results found</span>
                </div>
                <div className="hidden md:flex">
                  <Button variant="ghost" size="sm" className="h-7 w-32 select-none justify-end gap-1 border-none text-[13px] shadow-none">
                    <span style={{pointerEvents: 'none'}}>Compact</span>
                    <ChevronDown className="h-4 w-4 opacity-50" />
                  </Button>
                </div>
              </div>

              {/* Results List */}
              <div className="flex max-h-full w-full flex-1 flex-col items-center space-y-4 overflow-y-auto px-4 py-4">
                {loading && (
                  <div className="w-full space-y-4">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <div key={i} className="flex w-full min-w-32 shrink-0 flex-col overflow-hidden rounded-md border border-grep-2 animate-pulse">
                        <div className="h-12 bg-grep-1"></div>
                        <div className="h-24 bg-grep-0"></div>
                      </div>
                    ))}
                  </div>
                )}

                {!loading && results.map((result, index) => (
                  <div key={result.id} className="flex w-full min-w-32 shrink-0 flex-col overflow-hidden text-wrap rounded-md border border-grep-2">
                    <div className="flex min-h-10 w-full items-center justify-between border-b bg-grep-0 px-4">
                      <div className="flex flex-col py-1 sm:flex-row sm:gap-2 sm:items-center flex-1">
                        <div className="flex shrink-0 flex-row items-center gap-2">
                          <div className="w-4 h-4 rounded-sm bg-neutral-300 dark:bg-neutral-700" />
                          <span className="text-sm font-medium hover:underline">{result.site || 'unknown'}</span>
                        </div>
                        <span className="text-sm text-grep-9 hover:underline">
                          {result.category} / {result.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {result.site && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setQuery(result.site || '')
                              setViewMode("scan")
                              setTimeout(() => handleScan(), 100)
                            }}
                            className="h-7 px-2 text-xs gap-1 hover:bg-gradient-to-r hover:from-emerald-500 hover:to-teal-500 hover:text-white transition-all duration-200"
                          >
                            <Sparkles className="h-3 w-3" />
                            Scan Site
                          </Button>
                        )}
                        <div className="hidden text-nowrap text-xs text-grep-9 md:block">1 match</div>
                      </div>
                    </div>
                    <div className="cursor-pointer p-4">
                      <div className="space-y-2">
                        <div className="font-semibold text-sm">{result.name}</div>
                        <code className="block text-sm font-mono bg-grep-1 dark:bg-grep-1 px-3 py-2 rounded">
                          {result.value}
                        </code>
                        {result.confidence && (
                          <div className="text-xs text-grep-9">
                            Confidence: {result.confidence}%
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}

                {!loading && results.length > 0 && (
                  <Button className="w-full shadow-none">
                    Load More Results
                  </Button>
                )}
                <div className="min-h-3"></div>
              </div>
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
                    <Link className="text-grep-9 hover:text-foreground" href="/directory">Directory</Link>
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