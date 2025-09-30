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
import { cn } from "@/lib/utils"

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
    confidence: number
    completeness: number
    reliability: number
    processingTime: number
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

        {/* Left: Brand */}
        <div className="flex pl-4 md:pl-6">
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
        </div>

          {/* Center: Ultra-Clear Search/Scan Interface */}
          <div className="hidden md:flex flex-1 max-w-3xl mx-6">
            {/* Mode Selector - Large & Clear */}
            <div className="flex rounded-xl border-2 border-grep-3 bg-grep-0 p-1 mr-3 shadow-sm">
              <button
                onClick={() => {
                  setViewMode("search")
                  setResults([])
                  setScanResult(null)
                }}
                className={cn(
                  "px-4 py-2 text-sm font-semibold rounded-lg transition-all duration-200 flex items-center gap-2 min-w-[100px] justify-center",
                  viewMode === "search"
                    ? "bg-blue-500 text-white shadow-lg scale-105"
                    : "text-grep-9 hover:text-foreground hover:bg-grep-1"
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
                  "px-4 py-2 text-sm font-semibold rounded-lg transition-all duration-200 flex items-center gap-2 min-w-[100px] justify-center",
                  viewMode === "scan"
                    ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg scale-105"
                    : "text-grep-9 hover:text-foreground hover:bg-grep-1"
                )}
              >
                <Sparkles className="h-4 w-4" />
                Scan
              </button>
            </div>

            {/* Search Bar with Color-Coded Mode */}
            <div className="relative flex-1">
              {/* Mode Indicator Badge */}
              <div className="absolute -top-2 left-4 z-30">
                <div className={cn(
                  "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide shadow-sm border-2 border-white dark:border-black",
                  viewMode === "search"
                    ? "bg-blue-500 text-white"
                    : "bg-gradient-to-r from-emerald-500 to-teal-500 text-white"
                )}>
                  {viewMode === "search" ? "Search Mode" : "Scan Mode"}
                </div>
              </div>

              {/* Input with Mode-Specific Styling */}
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && query.trim()) {
                    viewMode === "scan" ? handleScan() : null
                  }
                }}
                placeholder={viewMode === "scan" ? "Enter URL: https://stripe.com" : "Search 17K+ design tokens..."}
                id="search-input"
                className={cn(
                  "w-full h-11 pl-4 pr-36 rounded-xl border-2 transition-all duration-200 text-sm font-medium",
                  viewMode === "search" && [
                    "border-blue-200 dark:border-blue-900",
                    "bg-blue-50/50 dark:bg-blue-950/20",
                    "focus-visible:border-blue-400 focus-visible:ring-4 focus-visible:ring-blue-100 dark:focus-visible:ring-blue-950",
                    "placeholder:text-blue-600/50 dark:placeholder:text-blue-400/50"
                  ],
                  viewMode === "scan" && [
                    "border-emerald-200 dark:border-emerald-900",
                    "bg-emerald-50/50 dark:bg-emerald-950/20",
                    "focus-visible:border-emerald-400 focus-visible:ring-4 focus-visible:ring-emerald-100 dark:focus-visible:ring-emerald-950",
                    "placeholder:text-emerald-600/50 dark:placeholder:text-emerald-400/50"
                  ]
                )}
                spellCheck="false"
                autoCapitalize="off"
                autoComplete="off"
                autoCorrect="off"
              />

              {/* Right Controls - Mode Specific */}
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                {viewMode === "search" ? (
                  <>
                    {/* Search Filter Toggles - Blue Theme */}
                    <div className="flex items-center gap-1 bg-white dark:bg-black rounded-lg px-1 py-1 border border-blue-200 dark:border-blue-900 shadow-sm">
                      <button
                        type="button"
                        onClick={() => setCaseInsensitive(!caseInsensitive)}
                        className={cn(
                          "h-7 w-7 rounded-md inline-flex items-center justify-center transition-all duration-200",
                          caseInsensitive
                            ? "bg-blue-500 text-white"
                            : "text-grep-9 hover:bg-blue-50 dark:hover:bg-blue-950 hover:text-blue-600"
                        )}
                        aria-pressed={caseInsensitive}
                        title="Match case (Aa)"
                      >
                        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5">
                          <path d="M11.6667 11C12.7713 11 13.6667 10.1046 13.6667 9C13.6667 7.89543 12.7713 7 11.6667 7C10.5621 7 9.66669 7.89543 9.66669 9C9.66669 10.1046 10.5621 11 11.6667 11Z" stroke="currentColor" strokeWidth="1.5"/>
                          <path d="M13.6667 7V11" stroke="currentColor" strokeWidth="1.5"/>
                          <path fillRule="evenodd" clipRule="evenodd" d="M3.26242 10.0789L2.63419 11.8414L2.57767 12H0.985229L1.22126 11.3378L4.22128 2.92102L5.63421 2.92102L8.63419 11.3378L8.87023 12H7.27779L7.22126 11.8414L6.59305 10.0789H6.5777H3.2777H3.26242ZM3.79707 8.57885H6.0584L4.92774 5.40668L3.79707 8.57885Z" fill="currentColor"/>
                        </svg>
                      </button>
                      <button
                        type="button"
                        onClick={() => setWholeWords(!wholeWords)}
                        className={cn(
                          "h-7 w-7 rounded-md inline-flex items-center justify-center transition-all duration-200",
                          wholeWords
                            ? "bg-blue-500 text-white"
                            : "text-grep-9 hover:bg-blue-50 dark:hover:bg-blue-950 hover:text-blue-600"
                        )}
                        aria-pressed={wholeWords}
                        title="Whole words"
                      >
                        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5">
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
                          "h-7 w-7 rounded-md inline-flex items-center justify-center transition-all duration-200",
                          useRegex
                            ? "bg-blue-500 text-white"
                            : "text-grep-9 hover:bg-blue-50 dark:hover:bg-blue-950 hover:text-blue-600"
                        )}
                        aria-pressed={useRegex}
                        title="Regex"
                      >
                        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5">
                          <path d="M10.8867 2V8.66667" stroke="currentColor" strokeWidth="1.5"/>
                          <path d="M8 3.66675L13.7733 7.00008" stroke="currentColor" strokeWidth="1.5"/>
                          <path d="M8 7.00008L13.7733 3.66675" stroke="currentColor" strokeWidth="1.5"/>
                          <rect x="2" y="9" width="4" height="4" fill="currentColor"/>
                        </svg>
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    {/* Scan Button - Emerald Theme */}
                    <Button
                      onClick={handleScan}
                      disabled={!query.trim() || scanLoading}
                      size="sm"
                      className="h-8 px-5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-semibold rounded-lg shadow-md hover:shadow-lg disabled:opacity-50 transition-all duration-200"
                    >
                      {scanLoading ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          Scanning...
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-4 w-4 mr-2" />
                          Scan Now
                        </>
                      )}
                    </Button>
                  </>
                )}

                {/* Keyboard Shortcut */}
                <kbd className="hidden xl:inline-flex h-7 px-2 items-center gap-0.5 rounded-md bg-white dark:bg-black border border-grep-3 text-xs text-grep-9 font-mono shadow-sm">
                  <span className="text-[11px] font-bold">⌘</span>
                  <span className="font-semibold">K</span>
                </kbd>
              </div>
            </div>
          </div>

          {/* Right: Actions + Theme */}
          <div className="flex items-center gap-3">
            {/* Quick Actions */}
            <div className="hidden md:flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-3 text-xs font-medium text-grep-9 hover:text-foreground hover:bg-grep-1"
              >
                Docs
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-3 text-xs font-medium text-grep-9 hover:text-foreground hover:bg-grep-1"
              >
                API
              </Button>
            </div>

            {/* Theme Toggle - Minimal */}
            <div className="hidden sm:flex items-center">
              <button
                className="h-8 w-8 rounded-md flex items-center justify-center transition-colors hover:bg-grep-1 text-grep-9 hover:text-foreground"
                title="Toggle theme"
              >
                <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
              </button>
            </div>

            {/* Sign In Button */}
            <Button
              size="sm"
              className="h-8 px-4 bg-black dark:bg-white text-white dark:text-black hover:bg-black/90 dark:hover:bg-white/90 font-medium rounded-md shadow-sm"
            >
              Sign In
            </Button>
          </div>

        {/* Mobile Search Bar */}
        <div className="md:hidden border-t border-grep-2 px-4 py-3">
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
      </header>

      {/* Main Content */}
      {viewMode === "scan" && scanError ? (
        /* Scan Error */
        <div className="flex-1 flex items-center justify-center p-12">
          <div className="text-center space-y-4 max-w-md">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
              <svg className="h-8 w-8 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-foreground">Scan Failed</h3>
              <p className="text-sm text-grep-9">{scanError}</p>
            </div>
            <Button
              onClick={() => {
                setScanError(null)
                handleScan()
              }}
              className="mt-4"
            >
              Try Again
            </Button>
          </div>
        </div>
      ) : viewMode === "scan" && scanResult ? (
        /* World-Class Scan Results */
        <div className="flex-1 w-full overflow-y-auto bg-grep-0">
          <div className="w-full max-w-7xl mx-auto px-4 py-8 md:px-8 md:py-12">
            {/* Hero Header */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-600 p-8 md:p-12 text-white shadow-2xl mb-8">
              <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iZ3JpZCIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIj48cGF0aCBkPSJNIDQwIDAgTCAwIDAgMCA0MCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLW9wYWNpdHk9IjAuMSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-30"></div>
              <div className="relative z-10">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                        <Sparkles className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <p className="text-white/80 text-sm font-medium">Design System Analysis</p>
                        <h1 className="text-3xl md:text-4xl font-bold text-white truncate">{scanResult.domain}</h1>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mt-6">
                      <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Palette className="h-5 w-5 text-white/80" />
                          <span className="text-white/70 text-sm">Tokens</span>
                        </div>
                        <p className="text-3xl font-bold text-white">{scanResult.summary?.tokensExtracted || 0}</p>
                      </div>
                      <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <TrendingUp className="h-5 w-5 text-white/80" />
                          <span className="text-white/70 text-sm">Confidence</span>
                        </div>
                        <p className="text-3xl font-bold text-white">{scanResult.summary?.confidence || 0}%</p>
                      </div>
                      <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Monitor className="h-5 w-5 text-white/80" />
                          <span className="text-white/70 text-sm">Completeness</span>
                        </div>
                        <p className="text-3xl font-bold text-white">{scanResult.summary?.completeness || 0}%</p>
                      </div>
                      <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <svg className="h-5 w-5 text-white/80" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                          </svg>
                          <span className="text-white/70 text-sm">Reliability</span>
                        </div>
                        <p className="text-3xl font-bold text-white">{scanResult.summary?.reliability || 0}%</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleCopyToken(JSON.stringify(scanResult.curatedTokens, null, 2))}
                      className="bg-white/20 hover:bg-white/30 text-white border-white/30 backdrop-blur-sm"
                    >
                      <Copy className="h-4 w-4 mr-2" />
                      Copy All
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        const blob = new Blob([JSON.stringify(scanResult.curatedTokens, null, 2)], { type: "application/json" })
                        const url = URL.createObjectURL(blob)
                        const anchor = document.createElement("a")
                        anchor.href = url
                        anchor.download = `${scanResult.domain}-curated-tokens.json`
                        document.body.appendChild(anchor)
                        anchor.click()
                        anchor.remove()
                        URL.revokeObjectURL(url)
                      }}
                      className="bg-white/20 hover:bg-white/30 text-white border-white/30 backdrop-blur-sm"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Export
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* AI-Powered Design Insights */}
            {scanResult.aiInsights && (
              <div className="bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-950/20 dark:to-blue-950/20 rounded-xl border-2 border-purple-200 dark:border-purple-900 p-6 mb-8 shadow-lg">
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <h2 className="text-2xl font-bold text-foreground mb-2 flex items-center gap-2">
                      <Sparkles className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                      AI Design Analysis
                    </h2>
                    <p className="text-sm text-grep-9">{scanResult.aiInsights.summary}</p>
                  </div>
                  <Badge variant="secondary" className="bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-700">
                    Powered by AI Gateway
                  </Badge>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                  {/* Color Palette Analysis */}
                  <div className="p-4 rounded-lg bg-white/80 dark:bg-black/40 border border-purple-200 dark:border-purple-800 backdrop-blur-sm">
                    <div className="flex items-center gap-2 mb-2">
                      <Palette className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                      <p className="text-xs font-semibold text-grep-9 uppercase tracking-wide">Color Palette</p>
                    </div>
                    <p className="text-base font-bold text-foreground mb-1 capitalize">{scanResult.aiInsights.colorPalette.style}</p>
                    <p className="text-sm text-grep-9 capitalize">{scanResult.aiInsights.colorPalette.mood}</p>
                  </div>

                  {/* Typography Analysis */}
                  <div className="p-4 rounded-lg bg-white/80 dark:bg-black/40 border border-purple-200 dark:border-purple-800 backdrop-blur-sm">
                    <div className="flex items-center gap-2 mb-2">
                      <Type className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                      <p className="text-xs font-semibold text-grep-9 uppercase tracking-wide">Typography</p>
                    </div>
                    <p className="text-base font-bold text-foreground mb-1">{scanResult.aiInsights.typography.style}</p>
                    <p className="text-sm text-grep-9">{scanResult.aiInsights.typography.hierarchy}</p>
                  </div>

                  {/* Spacing System */}
                  <div className="p-4 rounded-lg bg-white/80 dark:bg-black/40 border border-purple-200 dark:border-purple-800 backdrop-blur-sm">
                    <div className="flex items-center gap-2 mb-2">
                      <svg className="h-4 w-4 text-purple-600 dark:text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                      </svg>
                      <p className="text-xs font-semibold text-grep-9 uppercase tracking-wide">Spacing</p>
                    </div>
                    <p className="text-base font-bold text-foreground mb-1">{scanResult.aiInsights.spacing.system}</p>
                    <p className="text-sm text-grep-9">{scanResult.aiInsights.spacing.consistency}</p>
                  </div>

                  {/* Maturity Level */}
                  <div className="p-4 rounded-lg bg-white/80 dark:bg-black/40 border border-purple-200 dark:border-purple-800 backdrop-blur-sm">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                      <p className="text-xs font-semibold text-grep-9 uppercase tracking-wide">Maturity</p>
                    </div>
                    <p className="text-base font-bold text-foreground mb-1 capitalize">{scanResult.aiInsights.overall.maturity}</p>
                    <p className="text-sm text-grep-9">{scanResult.aiInsights.overall.consistency}% consistent</p>
                  </div>
                </div>

                {/* AI Recommendations */}
                {scanResult.aiInsights.overall.aiRecommendations && scanResult.aiInsights.overall.aiRecommendations.length > 0 && (
                  <div className="p-5 rounded-lg bg-white/80 dark:bg-black/40 border border-purple-200 dark:border-purple-800">
                    <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
                      <svg className="h-4 w-4 text-purple-600 dark:text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                      </svg>
                      AI Recommendations
                    </h3>
                    <ul className="space-y-2">
                      {scanResult.aiInsights.overall.aiRecommendations.slice(0, 5).map((rec, index) => (
                        <li key={index} className="flex items-start gap-2 text-sm text-grep-9">
                          <span className="text-purple-500 dark:text-purple-400 mt-0.5">•</span>
                          <span>{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Curated Design Tokens */}
            {scanResult.curatedTokens && (
              <div className="space-y-6">
                {/* Top 8 Colors */}
                {scanResult.curatedTokens.colors && scanResult.curatedTokens.colors.length > 0 && (
                  <div className="bg-white dark:bg-neutral-900 rounded-xl border border-grep-2 overflow-hidden">
                    <div className="bg-grep-0 border-b border-grep-2 px-6 py-4">
                      <h3 className="text-xl font-bold text-foreground flex items-center gap-3">
                        <Palette className="h-5 w-5 text-blue-500" />
                        Top Colors
                        <Badge variant="secondary" className="ml-2">{scanResult.curatedTokens.colors.length}</Badge>
                      </h3>
                      <p className="text-sm text-grep-9 mt-1">Most frequently used colors in the design system</p>
                    </div>
                    <div className="p-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {scanResult.curatedTokens.colors.map((token, index) => (
                          <div key={`color-${index}`} className="group relative p-4 rounded-lg border border-grep-2 bg-grep-0 hover:border-blue-400 hover:shadow-lg transition-all duration-200">
                            <div className="flex flex-col gap-3">
                              <div
                                className="w-full h-24 rounded-lg border-2 border-grep-3 shadow-md"
                                style={{ backgroundColor: String(token.value) }}
                              />
                              <div>
                                <div className="flex items-center justify-between mb-1">
                                  <code className="text-xs font-mono font-semibold text-foreground">{token.value}</code>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleCopyToken(String(token.value))}
                                    className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                  >
                                    <Copy className="h-3 w-3" />
                                  </Button>
                                </div>
                                {token.semantic && (
                                  <p className="text-xs text-grep-9 mb-2">{token.semantic}</p>
                                )}
                                <div className="flex items-center gap-2 text-xs">
                                  <div className="flex items-center gap-1">
                                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                                    <span className="text-grep-9">{token.percentage}% usage</span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                                    <span className="text-grep-9">{token.confidence}% confident</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Top 4 Fonts */}
                {scanResult.curatedTokens.typography?.families && scanResult.curatedTokens.typography.families.length > 0 && (
                  <div className="bg-white dark:bg-neutral-900 rounded-xl border border-grep-2 overflow-hidden">
                    <div className="bg-grep-0 border-b border-grep-2 px-6 py-4">
                      <h3 className="text-xl font-bold text-foreground flex items-center gap-3">
                        <Type className="h-5 w-5 text-purple-500" />
                        Top Font Families
                        <Badge variant="secondary" className="ml-2">{scanResult.curatedTokens.typography.families.length}</Badge>
                      </h3>
                      <p className="text-sm text-grep-9 mt-1">Most commonly used typefaces</p>
                    </div>
                    <div className="p-6">
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {scanResult.curatedTokens.typography.families.map((token, index) => (
                          <div key={`font-${index}`} className="group relative p-5 rounded-lg border border-grep-2 bg-grep-0 hover:border-purple-400 hover:shadow-lg transition-all duration-200">
                            <div className="flex flex-col gap-3">
                              <div className="p-4 bg-grep-1 dark:bg-grep-2 rounded-lg border border-grep-2" style={{ fontFamily: String(token.value) }}>
                                <p className="text-3xl text-foreground mb-2">Aa Bb Cc 123</p>
                                <p className="text-sm text-grep-9">The quick brown fox jumps over the lazy dog</p>
                              </div>
                              <div>
                                <div className="flex items-center justify-between mb-1">
                                  <code className="text-sm font-mono font-semibold text-foreground">{token.value}</code>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleCopyToken(String(token.value))}
                                    className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                  >
                                    <Copy className="h-3 w-3" />
                                  </Button>
                                </div>
                                {token.semantic && (
                                  <p className="text-xs text-grep-9 mb-2">{token.semantic}</p>
                                )}
                                <div className="flex items-center gap-2 text-xs">
                                  <div className="flex items-center gap-1">
                                    <div className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                                    <span className="text-grep-9">{token.percentage}% usage</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Top Border Radii */}
                {scanResult.curatedTokens.radius && scanResult.curatedTokens.radius.length > 0 && (
                  <div className="bg-white dark:bg-neutral-900 rounded-xl border border-grep-2 overflow-hidden">
                    <div className="bg-grep-0 border-b border-grep-2 px-6 py-4">
                      <h3 className="text-xl font-bold text-foreground flex items-center gap-3">
                        <svg className="h-5 w-5 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                        </svg>
                        Top Border Radii
                        <Badge variant="secondary" className="ml-2">{scanResult.curatedTokens.radius.length}</Badge>
                      </h3>
                      <p className="text-sm text-grep-9 mt-1">Most used corner roundness values</p>
                    </div>
                    <div className="p-6">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {scanResult.curatedTokens.radius.map((token, index) => (
                          <div key={`radius-${index}`} className="group relative p-4 rounded-lg border border-grep-2 bg-grep-0 hover:border-orange-400 hover:shadow-lg transition-all duration-200">
                            <div className="flex flex-col items-center gap-3">
                              <div className="w-20 h-20 bg-gradient-to-br from-orange-400 to-orange-600 border-2 border-grep-3 shadow-md" style={{ borderRadius: String(token.value) }} />
                              <div className="text-center w-full">
                                <code className="text-sm font-mono font-semibold text-foreground">{token.value}</code>
                                {token.semantic && (
                                  <p className="text-xs text-grep-9 mt-1">{token.semantic}</p>
                                )}
                                <p className="text-xs text-grep-9 mt-1">{token.percentage}% usage</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Top Shadows */}
                {scanResult.curatedTokens.shadows && scanResult.curatedTokens.shadows.length > 0 && (
                  <div className="bg-white dark:bg-neutral-900 rounded-xl border border-grep-2 overflow-hidden">
                    <div className="bg-grep-0 border-b border-grep-2 px-6 py-4">
                      <h3 className="text-xl font-bold text-foreground flex items-center gap-3">
                        <svg className="h-5 w-5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                        </svg>
                        Top Shadows
                        <Badge variant="secondary" className="ml-2">{scanResult.curatedTokens.shadows.length}</Badge>
                      </h3>
                      <p className="text-sm text-grep-9 mt-1">Most used elevation effects</p>
                    </div>
                    <div className="p-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {scanResult.curatedTokens.shadows.map((token, index) => (
                          <div key={`shadow-${index}`} className="group relative p-5 rounded-lg border border-grep-2 bg-grep-0 hover:border-indigo-400 hover:shadow-lg transition-all duration-200">
                            <div className="flex flex-col gap-3">
                              <div className="p-8 bg-grep-1 dark:bg-grep-2 rounded-lg border border-grep-2 flex items-center justify-center">
                                <div className="w-32 h-32 bg-white dark:bg-neutral-800 rounded-lg" style={{ boxShadow: String(token.value) }} />
                              </div>
                              <div>
                                <code className="text-xs font-mono text-grep-9 block mb-2 break-all">{token.value}</code>
                                {token.semantic && (
                                  <p className="text-xs text-grep-9 mb-1">{token.semantic}</p>
                                )}
                                <p className="text-xs text-grep-9">{token.percentage}% usage</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Top Spacing Values */}
                {scanResult.curatedTokens.spacing && scanResult.curatedTokens.spacing.length > 0 && (
                  <div className="bg-white dark:bg-neutral-900 rounded-xl border border-grep-2 overflow-hidden">
                    <div className="bg-grep-0 border-b border-grep-2 px-6 py-4">
                      <h3 className="text-xl font-bold text-foreground flex items-center gap-3">
                        <svg className="h-5 w-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                        </svg>
                        Top Spacing Values
                        <Badge variant="secondary" className="ml-2">{scanResult.curatedTokens.spacing.length}</Badge>
                      </h3>
                      <p className="text-sm text-grep-9 mt-1">Most used spacing and sizing values</p>
                    </div>
                    <div className="p-6">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {scanResult.curatedTokens.spacing.map((token, index) => (
                          <div key={`spacing-${index}`} className="group relative p-4 rounded-lg border border-grep-2 bg-grep-0 hover:border-green-400 hover:shadow-lg transition-all duration-200">
                            <div className="flex flex-col items-center gap-3">
                              <div className="w-full p-4 bg-grep-1 dark:bg-grep-2 rounded-lg border border-grep-2 flex items-center justify-start">
                                <div className="bg-gradient-to-r from-green-400 to-green-600 rounded" style={{ width: String(token.value), height: '32px', maxWidth: '100%' }} />
                              </div>
                              <div className="text-center w-full">
                                <code className="text-sm font-mono font-semibold text-foreground">{token.value}</code>
                                {token.semantic && (
                                  <p className="text-xs text-grep-9 mt-1">{token.semantic}</p>
                                )}
                                <p className="text-xs text-grep-9 mt-1">{token.percentage}% usage</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      ) : viewMode === "scan" && scanLoading ? (
        /* Scan Loading */
        <div className="flex-1 flex items-center justify-center p-12">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center animate-pulse">
              <Sparkles className="h-8 w-8 text-white" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-foreground">Scanning {query}...</h3>
              <p className="text-sm text-grep-9">Extracting design tokens and analyzing layout</p>
            </div>
          </div>
        </div>
      ) : viewMode === "search" && searchError ? (
        /* Search Error */
        <div className="flex-1 flex items-center justify-center p-12">
          <div className="text-center space-y-4 max-w-md">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
              <svg className="h-8 w-8 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-foreground">Search Error</h3>
              <p className="text-sm text-grep-9">{searchError}</p>
            </div>
            <Button
              onClick={() => {
                setSearchError(null)
                setQuery("")
              }}
              variant="outline"
            >
              Clear Search
            </Button>
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
        /* Home View - Grep.app Style */
        <div className="absolute top-[64px] flex h-[calc(100dvh-64px)] w-full flex-col items-center justify-between overflow-y-auto">
            <div className="flex min-h-full w-full shrink-0 select-none flex-col items-center justify-center space-y-2">
              {/* Hero Title */}
              <div className="flex w-full flex-row items-center justify-center pt-8 text-center text-[2rem]/[2.5rem] font-semibold tracking-tight sm:text-5xl">
                Design tokens made
                <div className="px-[2px]"></div>
                <span className="hidden align-middle sm:inline-block">
                  <svg width="90" height="56" viewBox="0 0 90 56" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M27.5341 18.8182L26.733 23.5909H11.2557L12.0568 18.8182H27.5341ZM11.5455 45L16.3353 16.3466C16.608 14.5852 17.2046 13.1193 18.125 11.9489C19.0568 10.7784 20.1875 9.90341 21.5171 9.32386C22.858 8.74432 24.2841 8.45454 25.7955 8.45454C26.875 8.45454 27.8125 8.53977 28.608 8.71023C29.4034 8.88068 29.983 9.03409 30.3466 9.17045L28.3523 13.9432C28.0909 13.8636 27.7728 13.7841 27.3978 13.7045C27.0341 13.6136 26.608 13.5682 26.1193 13.5682C24.9716 13.5682 24.1137 13.8466 23.5455 14.4034C22.9773 14.9489 22.6023 15.733 22.4205 16.7557L17.733 45H11.5455ZM31.728 45.5284C30.0689 45.5284 28.6257 45.233 27.3984 44.642C26.1712 44.0398 25.2678 43.1534 24.6882 41.983C24.12 40.8125 23.978 39.3693 24.2621 37.6534C24.5121 36.1761 24.9893 34.9545 25.6939 33.9886C26.4098 33.0227 27.2848 32.25 28.3189 31.6705C29.3643 31.0795 30.5007 30.6364 31.728 30.3409C32.9666 30.0455 34.228 29.8295 35.5121 29.6932C37.0803 29.5341 38.3473 29.3864 39.3132 29.25C40.2905 29.1136 41.0234 28.9091 41.5121 28.6364C42.0007 28.3523 42.2962 27.9205 42.3984 27.3409V27.2386C42.603 25.9545 42.3984 24.9602 41.7848 24.2557C41.1712 23.5511 40.1484 23.1989 38.7166 23.1989C37.2166 23.1989 35.9553 23.5284 34.9325 24.1875C33.9098 24.8466 33.1655 25.625 32.6996 26.5227L27.1087 25.7045C27.8132 24.1136 28.7791 22.7841 30.0064 21.7159C31.2337 20.6364 32.6484 19.8295 34.2507 19.2955C35.8643 18.75 37.5859 18.4773 39.4155 18.4773C40.6655 18.4773 41.8871 18.625 43.0803 18.9205C44.2848 19.2159 45.3473 19.7045 46.2678 20.3864C47.1996 21.0568 47.8814 21.9716 48.3132 23.1307C48.7564 24.2898 48.8303 25.7386 48.5348 27.4773L45.62 45H39.6882L40.3018 41.4034H40.0973C39.6087 42.1307 38.9723 42.8125 38.1882 43.4489C37.4041 44.0739 36.4723 44.5795 35.3928 44.9659C34.3132 45.3409 33.0916 45.5284 31.728 45.5284ZM34.0632 40.9943C35.3018 40.9943 36.4155 40.75 37.4041 40.2614C38.3928 39.7614 39.2053 39.1023 39.8416 38.2841C40.478 37.4659 40.8757 36.5739 41.0348 35.608L41.5462 32.5227C41.3189 32.6818 40.9666 32.8295 40.4893 32.9659C40.0121 33.1023 39.478 33.2216 38.8871 33.3239C38.3075 33.4261 37.7337 33.517 37.1655 33.5966C36.5973 33.6761 36.1087 33.7443 35.6996 33.8011C34.7564 33.9261 33.8928 34.1307 33.1087 34.4148C32.3359 34.6989 31.6939 35.0966 31.1825 35.608C30.6825 36.108 30.37 36.7557 30.245 37.5511C30.0632 38.6761 30.3303 39.5341 31.0462 40.125C31.7621 40.7045 32.7678 40.9943 34.0632 40.9943Z" className="fill-black dark:fill-white"></path>
                    <ellipse cx="10.3333" cy="42.75" rx="5.33333" ry="0.75" className="fill-black dark:fill-white"></ellipse>
                    <ellipse cx="18.3333" cy="11.25" rx="5.33333" ry="0.75" className="fill-black dark:fill-white"></ellipse>
                    <ellipse cx="55.6667" cy="21.0625" rx="3.66667" ry="0.6875" className="fill-black dark:fill-white"></ellipse>
                    <ellipse cx="50.5" cy="17.75" rx="2.5" ry="0.75" className="fill-black dark:fill-white"></ellipse>
                    <ellipse cx="74" cy="14.75" rx="2" ry="0.75" className="fill-black dark:fill-white"></ellipse>
                    <ellipse cx="72.5" cy="44.75" rx="2.5" ry="0.75" className="fill-black dark:fill-white"></ellipse>
                    <ellipse cx="78.5" cy="13" rx="3.5" ry="0.5" className="fill-black dark:fill-white"></ellipse>
                    <ellipse cx="72.5" cy="27.75" rx="2.5" ry="0.75" className="fill-black dark:fill-white"></ellipse>
                    <ellipse cx="28.6667" cy="26.0625" rx="3.66667" ry="0.6875" className="fill-black dark:fill-white"></ellipse>
                    <ellipse cx="8" cy="38.5" rx="2" ry="0.5" className="fill-black dark:fill-white"></ellipse>
                    <ellipse cx="21.5" cy="38.5" rx="2" ry="0.5" className="fill-black dark:fill-white"></ellipse>
                    <ellipse cx="49.5" cy="34.5" rx="1.5" ry="0.5" className="fill-black dark:fill-white"></ellipse>
                    <ellipse cx="51.5" cy="36" rx="2.5" ry="0.5" className="fill-black dark:fill-white"></ellipse>
                    <ellipse cx="52" cy="24.5" rx="2" ry="0.5" className="fill-black dark:fill-white"></ellipse>
                    <ellipse cx="8" cy="33.5" rx="3" ry="0.5" className="fill-black dark:fill-white"></ellipse>
                    <ellipse cx="25" cy="29.5" rx="3" ry="0.5" className="fill-black dark:fill-white"></ellipse>
                    <ellipse cx="11" cy="16.5" rx="3" ry="0.5" className="fill-black dark:fill-white"></ellipse>
                    <ellipse cx="10.3333" cy="41.75" rx="5.33333" ry="0.75" className="fill-white dark:fill-black"></ellipse>
                    <ellipse cx="18.3333" cy="9.75" rx="5.33333" ry="0.75" className="fill-white dark:fill-black"></ellipse>
                    <ellipse cx="55.6667" cy="19.6875" rx="3.66667" ry="0.6875" className="fill-white dark:fill-black"></ellipse>
                    <ellipse cx="28.6667" cy="24.6875" rx="3.66667" ry="0.6875" className="fill-white dark:fill-black"></ellipse>
                    <ellipse cx="14" cy="30.25" rx="3" ry="0.75" className="fill-black dark:fill-white"></ellipse>
                    <ellipse cx="27" cy="33.25" rx="3" ry="0.75" className="fill-black dark:fill-white"></ellipse>
                    <ellipse cx="25" cy="43.25" rx="3" ry="0.75" className="fill-black dark:fill-white"></ellipse>
                    <ellipse cx="53" cy="32.25" rx="3" ry="0.75" className="fill-black dark:fill-white"></ellipse>
                    <ellipse cx="76" cy="42.25" rx="3" ry="0.75" className="fill-black dark:fill-white"></ellipse>
                    <ellipse cx="76" cy="31.25" rx="3" ry="0.75" className="fill-black dark:fill-white"></ellipse>
                    <ellipse cx="51.5" cy="44.25" rx="3.5" ry="0.75" className="fill-black dark:fill-white"></ellipse>
                    <ellipse cx="13.5" cy="25.25" rx="3.5" ry="0.75" className="fill-black dark:fill-white"></ellipse>
                    <ellipse cx="14" cy="28.75" rx="3" ry="0.75" className="fill-white dark:fill-black"></ellipse>
                    <ellipse cx="27" cy="31.75" rx="3" ry="0.75" className="fill-white dark:fill-black"></ellipse>
                    <ellipse cx="25" cy="41.75" rx="3" ry="0.75" className="fill-white dark:fill-black"></ellipse>
                    <ellipse cx="53" cy="30.75" rx="3" ry="0.75" className="fill-white dark:fill-black"></ellipse>
                    <ellipse cx="76" cy="40.75" rx="3" ry="0.75" className="fill-white dark:fill-black"></ellipse>
                    <ellipse cx="76" cy="29.75" rx="3" ry="0.75" className="fill-white dark:fill-black"></ellipse>
                    <ellipse cx="51.5" cy="42.75" rx="3.5" ry="0.75" className="fill-white dark:fill-black"></ellipse>
                    <ellipse cx="13.5" cy="23.75" rx="3.5" ry="0.75" className="fill-white dark:fill-black"></ellipse>
                  </svg>
                </span>
                <span className="inline-block align-middle sm:hidden">
                  <svg width="58" height="40" viewBox="0 0 58 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M15.5036 13.5455L14.9695 16.7273H4.65131L5.1854 13.5455H15.5036Z" className="fill-black dark:fill-white"></path>
                  </svg>
                </span>
              </div>

              {/* Subtitle */}
              <div className="px-[8px] text-center text-sm text-grep-9 sm:text-base">
                Effortlessly extract tokens, analyze design systems,{" "}
                <span className="whitespace-nowrap">and build consistent interfaces.</span>
              </div>

              <div className="py-6"></div>

              {/* Call to Action */}
              <div className="flex flex-col items-center gap-4 text-center px-4">
                <p className="text-sm text-grep-9 max-w-md">
                  Use the header to {viewMode === "search" ? "search for design tokens" : "scan a website"} or switch between modes
                </p>
                {stats && (
                  <div className="flex items-center gap-6 text-xs text-grep-9">
                    <span className="flex items-center gap-1">
                      <Palette className="h-3 w-3" />
                      {stats.tokens.toLocaleString()} tokens
                    </span>
                    <span className="flex items-center gap-1">
                      <Monitor className="h-3 w-3" />
                      {stats.sites.toLocaleString()} sites
                    </span>
                    <span className="flex items-center gap-1">
                      <TrendingUp className="h-3 w-3" />
                      {stats.scans.toLocaleString()} scans
                    </span>
                  </div>
                )}
              </div>

              <div className="h-[min(25dvh,250px)] w-full"></div>
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