"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { useSearchParams } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
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
  TrendingUp
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

type ExtractedToken = {
  name: string
  value: string
  confidence?: number
  usage?: number
}

type ExtractedTokenGroups = Partial<Record<ScanTokenCategory, ExtractedToken[]>>

type ScanSummary = {
  tokensExtracted: number
  confidence: number
  completeness: number
  reliability: number
  processingTime: number
}

type BrandAnalysis = {
  style?: string
  maturity?: string
  consistency?: number
}

type ScanResultPayload = {
  status: "completed" | "failed"
  domain?: string
  summary?: ScanSummary
  tokens?: ExtractedTokenGroups
  brandAnalysis?: BrandAnalysis
  layoutDNA?: Record<string, unknown>
  error?: string
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

type ViewMode = "home" | "search" | "scan"

type ScanTokenCategory = "colors" | "typography" | "spacing" | "radius" | "shadows" | "motion"

export default function HomePage() {
  const searchParams = useSearchParams()
  const [viewMode, setViewMode] = useState<ViewMode>("home")
  const [query, setQuery] = useState("")
  const [caseInsensitive, setCaseInsensitive] = useState(true)
  const [wholeWords, setWholeWords] = useState(false)
  const [useRegex, setUseRegex] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<TokenCategoryKey>("all")
  const [results, setResults] = useState<TokenSearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [isSearchActive, setIsSearchActive] = useState(false)
  const [showScrollContent, setShowScrollContent] = useState(false)
  const [hasResults, setHasResults] = useState(false)

  const [stats, setStats] = useState<StatsResponse | null>(null)

  const [scanResult, setScanResult] = useState<ScanResultPayload | null>(null)
  const [scanLoading, setScanLoading] = useState(false)
  const [scanError, setScanError] = useState<string | null>(null)
  const [selectedTokenCategory, setSelectedTokenCategory] = useState<ScanTokenCategory>("colors")

  useEffect(() => {
    if (searchParams.get("tab") === "scan") {
      setViewMode("scan")
    }
  }, [searchParams])

  // Handle scroll reveal for home page content
  useEffect(() => {
    if (viewMode !== "home" || query.trim()) return

    const handleScroll = () => {
      const scrolled = window.scrollY > 50
      setShowScrollContent(scrolled)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [viewMode, query])

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

  useEffect(() => {
    if (!query.trim()) {
      // Smooth reset - no layout jumps
      setResults([])
      setSearchError(null)
      setLoading(false)
      setIsSearchActive(false)
      setHasResults(false)
      return
    }

    // Set active immediately for header search bar
    setIsSearchActive(true)

    const controller = new AbortController()
    const searchTimeout = setTimeout(() => {
      handleSearch(query, controller.signal)
    }, 200) // Slightly longer debounce for smooth morphing

    return () => {
      controller.abort()
      clearTimeout(searchTimeout)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, caseInsensitive, wholeWords, useRegex, selectedCategory])

  const handleSearch = async (searchQuery: string, signal?: AbortSignal) => {
    const trimmed = searchQuery.trim()
    if (!trimmed) return

    // Start loading but don't change view yet - wait for results
    setLoading(true)
    setSearchError(null)

    try {
      const params = new URLSearchParams({
        query: trimmed,
        mode: "tokens",
        caseInsensitive: caseInsensitive ? "true" : "false",
        limit: "150"
      })

      if (selectedCategory !== "all") {
        params.set("tokenType", selectedCategory)
      }

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
          console.warn("Invalid regex", error)
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

      // Only set results and change view after successful search
      setResults(items)
      setHasResults(true)

      // Smooth transition to search view only after results are ready
      if (viewMode === "home") {
        setTimeout(() => setViewMode("search"), 50) // Small delay for smooth morphing
      }

    } catch (error) {
      if ((error as Error).name === "AbortError") {
        return
      }
      console.error("Search failed", error)
      setSearchError(error instanceof Error ? error.message : "Search failed")
      setResults([])
      setHasResults(false)
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

    console.log(`🔄 Initiating scan for: ${target}`)
    setScanLoading(true)
    setScanResult(null)
    setScanError(null)

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
      setScanResult(result)
      setSelectedTokenCategory("colors")

      console.log(`✅ Scan completed: ${result.summary?.tokensExtracted} tokens extracted`)

      // Refresh stats to include new scan
      const statsResponse = await fetch("/api/stats")
      if (statsResponse.ok) {
        const statsData = await statsResponse.json()
        setStats(statsData)
        console.log(`📊 Database stats refreshed: ${statsData.sites} sites, ${statsData.tokens} tokens`)
      }

    } catch (error) {
      console.error("❌ Scan failed:", error)
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
    return stats.popularSites.filter(site => site.domain).slice(0, 6)
  }, [stats])

  const resolvedResults = useMemo(() => {
    if (selectedCategory === "all") return results
    return results.filter(result => {
      const category = result.category?.toLowerCase()
      if (!category) return false
      if (selectedCategory === "dimension") {
        return category === "dimension" || category === "spacing"
      }
      if (selectedCategory === "color") {
        return category === "color" || category === "colors"
      }
      return category === selectedCategory
    })
  }, [results, selectedCategory])

  const selectedTokens = scanResult?.tokens?.[selectedTokenCategory] ?? []

  return (
    <div className="flex h-full w-full flex-col items-center justify-between overflow-hidden antialiased bg-white text-black dark:bg-black dark:text-white layout-stable morph-container">
      <header className="flex min-h-[64px] w-full shrink-0 flex-wrap items-center justify-between border-b border-neutral-200 dark:border-neutral-800 md:flex-nowrap">
        {/* Left: Logo and branding */}
        <div className="flex pl-4 md:pl-6">
          <div className="flex items-center space-x-2 pr-3">
            <Link href="/" className="flex items-center gap-2 outline-offset-4" onClick={() => { setViewMode("home"); setQuery(""); }}>
              <div className="flex h-6 w-6 items-center justify-center rounded bg-black dark:bg-white">
                <Palette className="h-4 w-4 text-white dark:text-black" />
              </div>
              <span className="text-sm font-semibold">ContextDS</span>
            </Link>
          </div>
        </div>

        {/* Center: Search bar (only when typing - ultrathink) */}
        {(isSearchActive || query.trim()) && (
          <div className="order-1 flex w-full items-center justify-center border-t border-neutral-200 px-4 py-3 md:order-none md:border-none md:px-3 md:py-0 animate-in fade-in-0 slide-in-from-top-2 duration-300" id="header-contents">
          <div className="relative z-10 w-full flex-grow">
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && query.trim()) {
                  if (viewMode === "scan") {
                    handleScan()
                  }
                }
              }}
              placeholder={
                viewMode === "scan"
                  ? "Enter website URL to scan..."
                  : "Search design tokens..."
              }
              className="flex w-full min-w-0 shrink rounded-md border border-neutral-300 bg-white px-3 py-1 text-sm transition-colors focus-visible:border-black focus-visible:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20 disabled:cursor-not-allowed disabled:opacity-50 placeholder:text-neutral-500 h-[42px] pr-24 md:h-9 max-md:max-w-none dark:border-neutral-700 dark:bg-black dark:focus-visible:border-white dark:focus-visible:ring-white/20"
              style={{ paddingLeft: '12px' }}
              id="search-input"
              spellCheck="false"
              autoCapitalize="off"
              autoComplete="off"
              autoCorrect="off"
              type="text"
            />
            <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1">
              {(viewMode === "search" || isSearchActive) ? (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setCaseInsensitive(!caseInsensitive)}
                    className={`border border-transparent inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-transparent h-6 px-1 min-w-6 ${caseInsensitive ? "bg-neutral-100 border-neutral-200 text-foreground dark:bg-neutral-800 dark:border-neutral-700 dark:text-foreground" : "text-neutral-500"}`}
                    title="Match case"
                    aria-label="Match case"
                  >
                    <Type className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setWholeWords(!wholeWords)}
                    className={`border border-transparent inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-transparent h-6 px-1 min-w-6 ${wholeWords ? "bg-neutral-100 border-neutral-200 text-foreground dark:bg-neutral-800 dark:border-neutral-700 dark:text-foreground" : "text-neutral-500"}`}
                    title="Match whole words"
                    aria-label="Match whole words"
                  >
                    <Filter className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setUseRegex(!useRegex)}
                    className={`border border-transparent inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-transparent h-6 px-1 min-w-6 ${useRegex ? "bg-neutral-100 border-neutral-200 text-foreground dark:bg-neutral-800 dark:border-neutral-700 dark:text-foreground" : "text-neutral-500"}`}
                    title="Use regular expression"
                    aria-label="Use regular expression"
                  >
                    <Regex className="h-4 w-4" />
                  </Button>
                </>
              ) : viewMode === "scan" ? (
                <Button
                  onClick={handleScan}
                  disabled={!query.trim() || scanLoading}
                  size="sm"
                  className="h-6 px-2 bg-black dark:bg-white text-white dark:text-black hover:bg-neutral-800 dark:hover:bg-neutral-200 disabled:opacity-50"
                >
                  {scanLoading ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Sparkles className="h-3 w-3" />
                  )}
                </Button>
              ) : null}
            </div>
          </div>
        </div>
        )}

        {/* Right: Feedback and theme toggle */}
        <div className="flex min-h-[64px] select-none items-center justify-end gap-3 pr-4 md:pr-6">
          <Button variant="outline" size="sm" className="inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-8 rounded-md px-3 text-xs sm:h-9 sm:px-4 py-2 sm:text-sm shadow-none [@media(max-width:374px)]:hidden">
            Feedback
          </Button>
          <ThemeToggle />
        </div>
      </header>

      {/* Hero section - show when in home mode without active search/scan */}
      {viewMode === "home" && !hasResults && (
        <div className="h-[calc(100dvh-130px)] w-full md:h-[calc(100dvh-65px)] relative view-transition fade-morph">
          {/* Loading overlay when typing - smooth morphing */}
          {loading && query.trim() && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/90 backdrop-blur-md dark:bg-black/90 animate-in fade-in-0 duration-400 ease-ultrathink">
              <div className="flex flex-col items-center space-y-6 animate-in fade-in-0 slide-in-from-bottom-4 duration-600 delay-100 ease-ultrathink">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="animate-spin rounded-full h-7 w-7 border-2 border-neutral-200 dark:border-neutral-800"></div>
                    <div className="absolute inset-0 animate-spin rounded-full h-7 w-7 border-2 border-t-black dark:border-t-white border-transparent"></div>
                  </div>
                  <span className="text-base font-medium text-black dark:text-white">
                    {query.length === 1 ? 'Searching database' : `Searching for "${query}"`}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-sm text-neutral-500 dark:text-neutral-400">
                  <span>{stats?.tokens.toLocaleString() || 0} tokens</span>
                  <span>•</span>
                  <span>{stats?.sites || 0} sites</span>
                  <span>•</span>
                  <span>{stats?.averageConfidence || 0}% avg confidence</span>
                </div>
              </div>
            </div>
          )}

          <div className="flex min-h-full w-full shrink-0 select-none flex-col items-center justify-center space-y-2">
            {/* Main heading */}
            <div className="flex w-full flex-row items-center justify-center pt-8 text-center text-[2rem]/[2.5rem] font-semibold tracking-tight sm:text-5xl">
              <span>Design tokens made</span>
              <div className="px-[2px]"></div>
              <span className="italic text-neutral-600 dark:text-neutral-400">fast</span>
            </div>

            {/* Subtitle */}
            <div className="px-[8px] text-center text-sm text-neutral-500 sm:text-base">
              Effortlessly search for tokens, sites, and patterns
              <span className="whitespace-nowrap">across design systems.</span>
            </div>

            <div className="py-1"></div>

            {/* Mode toggle and search input - connected with seamless borders */}
            <div className="flex w-full flex-row items-center justify-center">
              <div className="px-2"></div>
              <div className="w-[625px] space-y-0">
                {/* Toggle above search - left aligned and connected */}
                <div className="flex justify-start mb-[-1px]">
                  <div className="inline-flex items-center rounded-t-lg border border-b-0 border-neutral-300 bg-white p-1 dark:border-neutral-700 dark:bg-black">
                    <button
                      onClick={() => {
                        if (viewMode === "scan") {
                          setViewMode("home");
                        }
                      }}
                      className={`relative rounded-md px-3 py-1.5 text-sm font-medium transition-all duration-200 ${
                        viewMode !== "scan"
                          ? "bg-neutral-100 text-black dark:bg-neutral-800 dark:text-white"
                          : "text-neutral-600 hover:bg-neutral-100/50 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800/50 dark:hover:text-neutral-100"
                      }`}
                    >
                      Search
                    </button>
                    <button
                      onClick={() => setViewMode("scan")}
                      className={`relative rounded-md px-3 py-1.5 text-sm font-medium transition-all duration-200 ${
                        viewMode === "scan"
                          ? "bg-neutral-100 text-black dark:bg-neutral-800 dark:text-white"
                          : "text-neutral-600 hover:bg-neutral-100/50 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800/50 dark:hover:text-neutral-100"
                      }`}
                    >
                      Scan
                    </button>
                  </div>
                </div>

                {/* Search input connected below toggle */}
                <div className="relative z-10 w-full flex-grow">
                  <Input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' && query.trim()) {
                        if (viewMode === "scan") {
                          handleScan()
                        }
                      }
                    }}
                    placeholder={viewMode === "scan" ? "Enter website URL to scan..." : "Search"}
                    className="flex w-full min-w-0 shrink rounded-md rounded-tl-none border border-neutral-300 bg-white px-3 py-1 text-sm transition-colors focus-visible:border-black focus-visible:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20 disabled:cursor-not-allowed disabled:opacity-50 placeholder:text-neutral-500 h-[42px] pr-24 dark:border-neutral-700 dark:bg-black dark:focus-visible:border-white dark:focus-visible:ring-white/20"
                    style={{ paddingLeft: '12px' }}
                    id="search-input-home"
                    spellCheck="false"
                    autoCapitalize="off"
                    autoComplete="off"
                    autoCorrect="off"
                    type="text"
                  />
                  <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1">
                    {viewMode === "search" ? (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setCaseInsensitive(!caseInsensitive)}
                          className={`border border-transparent inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-transparent h-6 px-1 min-w-6 ${caseInsensitive ? "bg-neutral-100 border-neutral-200 text-foreground dark:bg-neutral-800 dark:border-neutral-700 dark:text-foreground" : "text-neutral-500"}`}
                          title="Match case"
                          aria-label="Match case"
                        >
                          <Type className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setWholeWords(!wholeWords)}
                          className={`border border-transparent inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-transparent h-6 px-1 min-w-6 ${wholeWords ? "bg-neutral-100 border-neutral-200 text-foreground dark:bg-neutral-800 dark:border-neutral-700 dark:text-foreground" : "text-neutral-500"}`}
                          title="Match whole words"
                          aria-label="Match whole words"
                        >
                          <Filter className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setUseRegex(!useRegex)}
                          className={`border border-transparent inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-transparent h-6 px-1 min-w-6 ${useRegex ? "bg-neutral-100 border-neutral-200 text-foreground dark:bg-neutral-800 dark:border-neutral-700 dark:text-foreground" : "text-neutral-500"}`}
                          title="Use regular expression"
                          aria-label="Use regular expression"
                        >
                          <Regex className="h-4 w-4" />
                        </Button>
                      </>
                    ) : viewMode === "scan" ? (
                      <Button
                        onClick={handleScan}
                        disabled={!query.trim() || scanLoading}
                        size="sm"
                        className="h-6 px-2 bg-black dark:bg-white text-white dark:text-black hover:bg-neutral-800 dark:hover:bg-neutral-200 disabled:opacity-50"
                      >
                        {scanLoading ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Sparkles className="h-3 w-3" />
                        )}
                      </Button>
                    ) : null}
                  </div>
                </div>
                <div className="h-[min(25dvh,250px)] w-full"></div>
              </div>
              <div className="px-2"></div>
            </div>
          </div>
        </div>
      )}

      {(viewMode === "search" && hasResults) && (
        <div className="flex flex-1 flex-col md:flex-row animate-in fade-in-0 slide-in-from-bottom-6 duration-700 ease-ultrathink view-transition">
          <aside className="w-full border-b border-neutral-200 bg-neutral-50 px-4 py-6 dark:border-neutral-800 dark:bg-neutral-950 md:w-72 md:border-b-0 md:border-r md:px-6 animate-in fade-in-0 slide-in-from-left-4 duration-500 delay-100 ease-ultrathink">
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">Categories</h3>
                <div className="mt-3 space-y-2">
                  {tokenCategoryOptions.map(option => (
                    option.key === "all" || categoryFacets.some(facet => facet.key === option.key) ? (
                      <button
                        key={option.key}
                        onClick={() => setSelectedCategory(option.key)}
                        className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-sm transition ${
                          selectedCategory === option.key
                            ? "bg-white text-black shadow-sm dark:bg-black dark:text-white"
                            : "text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800"
                        }`}
                      >
                        <span>{option.label}</span>
                        {option.key !== "all" && (
                          <Badge variant="secondary" className="bg-neutral-200 text-xs text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
                            {categoryFacets.find(facet => facet.key === option.key)?.count ?? 0}
                          </Badge>
                        )}
                      </button>
                    ) : null
                  ))}
                </div>
              </div>

              <div>
                <h3 className="flex items-center gap-2 text-sm font-semibold text-neutral-800 dark:text-neutral-200">
                  <TrendingUp className="h-4 w-4" />
                  Popular sites
                </h3>
                <div className="mt-3 space-y-2">
                  {popularSites.length === 0 && (
                    <p className="text-xs text-neutral-500 dark:text-neutral-500">No scans yet</p>
                  )}
                  {popularSites.map(site => (
                    <Link
                      key={site.domain!}
                      href={`/site/${site.domain}`}
                      className="flex items-center justify-between rounded-md px-3 py-2 text-sm text-neutral-600 transition hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800"
                    >
                      <span className="truncate">{site.domain}</span>
                      <Badge variant="secondary" className="bg-neutral-200 text-xs text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
                        {site.tokens}
                      </Badge>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </aside>

          <main className="flex-1 overflow-y-auto animate-in fade-in-0 slide-in-from-right-4 duration-600 delay-200 ease-ultrathink">
            <div className="flex items-center justify-between border-b border-neutral-200 px-4 py-3 text-sm text-neutral-600 dark:border-neutral-800 dark:text-neutral-400 md:px-6">
              <div className="flex items-center gap-2">
                {loading ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Searching database...</span>
                  </div>
                ) : (
                  <span>{resolvedResults.length} results found</span>
                )}
                {searchError && <span className="text-xs text-red-500">• {searchError}</span>}
              </div>
              <div className="hidden items-center gap-2 md:flex">
                <span className="text-xs text-neutral-500">
                  from {stats?.sites || 0} sites
                </span>
                <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-neutral-500">
                  Compact
                  <ChevronDown className="ml-1 h-3 w-3" />
                </Button>
              </div>
            </div>

            <div className="space-y-4 px-4 py-4 md:px-6">
              {loading && (
                <div className="space-y-4">
                  {/* Skeleton loading states for instant feedback */}
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Card key={i} className="border-neutral-200 dark:border-neutral-800 animate-pulse">
                      <CardHeader className="flex flex-row items-center justify-between space-y-0">
                        <div className="flex flex-col space-y-2">
                          <div className="h-4 bg-neutral-200 rounded w-32 dark:bg-neutral-800"></div>
                          <div className="h-3 bg-neutral-100 rounded w-20 dark:bg-neutral-900"></div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="h-6 bg-neutral-200 rounded w-16 dark:bg-neutral-800"></div>
                          <div className="h-8 w-8 bg-neutral-200 rounded dark:bg-neutral-800"></div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="h-12 bg-neutral-100 rounded dark:bg-neutral-900"></div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {!loading && query.trim() && resolvedResults.length === 0 && (
                <Card className="border-neutral-200 dark:border-neutral-800">
                  <CardContent className="flex flex-col items-center gap-3 py-10 text-center text-neutral-500">
                    <Sparkles className="h-6 w-6" />
                    <div className="text-sm">No tokens matched your search. Try another query or scan a site.</div>
                  </CardContent>
                </Card>
              )}

              {!loading && resolvedResults.map((result, index) => (
                <Card key={result.id} className="border-neutral-200 transition-all duration-300 hover:border-black/40 dark:border-neutral-800 dark:hover:border-white/40 animate-in fade-in-0 slide-in-from-bottom-3 ease-ultrathink transform-gpu" style={{ animationDelay: `${index * 50}ms`, animationDuration: '400ms' }}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0">
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2 text-sm text-neutral-500 dark:text-neutral-400">
                        <span className="font-medium text-black dark:text-white">{result.name}</span>
                        <Badge variant="secondary" className="bg-neutral-200 text-xs text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
                          {result.category}
                        </Badge>
                      </div>
                      {result.site && (
                        <Link href={`/site/${result.site}`} className="text-xs text-neutral-500 hover:underline dark:text-neutral-400">
                          {result.site}
                        </Link>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {typeof result.confidence === "number" && (
                        <span className="text-xs text-neutral-500 dark:text-neutral-400">{result.confidence}% confidence</span>
                      )}
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0 transition-colors" onClick={() => handleCopyToken(String(result.value))} title="Copy token value">
                        <Copy className="h-4 w-4" />
                      </Button>
                      {result.site && (
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 transition-colors" asChild title="Open site analysis">
                          <Link href={`/site/${result.site}`}>
                            <ExternalLink className="h-4 w-4" />
                          </Link>
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <code className="block rounded-md bg-neutral-100 p-3 text-sm text-neutral-800 dark:bg-neutral-900 dark:text-neutral-100 transition-colors">
                      {result.value}
                    </code>
                    {result.source && (
                      <div className="text-xs text-neutral-500 dark:text-neutral-500">
                        Source: {result.source}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </main>
        </div>
      )}

      {/* Scroll-triggered content - Vercel style with rich database data */}
      {viewMode === "home" && !hasResults && !query.trim() && stats && stats.sites > 0 && showScrollContent && (
        <div className="flex w-full items-center justify-center px-6 py-16 animate-in fade-in-0 slide-in-from-bottom-6 duration-700">
          <div className="w-full max-w-2xl space-y-8">
            {/* Header with stats */}
            <div className="text-center space-y-3">
              <h2 className="text-xl font-semibold text-black dark:text-white tracking-tight">
                Design System Directory
              </h2>
              <div className="flex items-center justify-center gap-6 text-sm text-neutral-500 dark:text-neutral-400">
                <span><strong className="text-black dark:text-white">{stats.sites}</strong> sites</span>
                <span><strong className="text-black dark:text-white">{stats.tokens.toLocaleString()}</strong> tokens</span>
                <span><strong className="text-black dark:text-white">{stats.averageConfidence}%</strong> avg confidence</span>
              </div>
            </div>

            {/* Sites list - Vercel style with rich data */}
            <div className="space-y-1">
              {stats.popularSites?.slice(0, 6).map((site, index) => (
                <div
                  key={site.domain!}
                  className="group flex items-center justify-between rounded-lg border border-neutral-200 bg-white px-4 py-3 transition-all duration-300 hover:border-neutral-300 hover:shadow-sm hover:scale-[1.01] dark:border-neutral-800 dark:bg-neutral-950 dark:hover:border-neutral-700 cursor-pointer animate-in fade-in-0 slide-in-from-left-3 transform-gpu"
                  style={{ animationDelay: `${index * 100}ms` }}
                  onClick={() => setQuery(site.domain || '')}
                >
                  {/* Left: Site info */}
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-neutral-100 to-neutral-200 text-sm dark:from-neutral-800 dark:to-neutral-900 shadow-sm transition-all duration-300 group-hover:scale-110">
                      {site.domain?.includes('stripe') ? '💳' :
                       site.domain?.includes('github') ? '🐙' :
                       site.domain?.includes('vercel') ? '▲' :
                       site.domain?.includes('tailwind') ? '🎨' :
                       site.domain?.includes('figma') ? '🎭' :
                       site.domain?.includes('linear') ? '📐' : '🌐'}
                    </div>
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-black dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                          {site.domain}
                        </span>
                        <Badge variant="secondary" className="text-[10px] bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400 px-1.5 py-0.5">
                          #{stats.popularSites?.indexOf(site)! + 1}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-neutral-500 dark:text-neutral-400">
                        <span className="flex items-center gap-1">
                          <Palette className="h-3 w-3" />
                          <strong className="text-black dark:text-white">{site.tokens}</strong> tokens
                        </span>
                        <span className="flex items-center gap-1">
                          <TrendingUp className="h-3 w-3" />
                          <strong className="text-black dark:text-white">{site.popularity}%</strong> popularity
                        </span>
                        {site.lastScanned && (
                          <span className="flex items-center gap-1">
                            <Sparkles className="h-3 w-3" />
                            {new Date(site.lastScanned).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Action */}
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-2 group-hover:translate-x-0">
                    <Button size="sm" variant="outline" className="h-7 px-2 text-xs border-neutral-300 hover:border-black dark:border-neutral-700 dark:hover:border-white">
                      <Search className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}

              {/* Recent activity */}
              {stats.recentActivity && stats.recentActivity.length > 0 && (
                <div className="mt-12 space-y-4">
                  <div className="text-center">
                    <h3 className="text-sm font-semibold text-neutral-600 dark:text-neutral-400 uppercase tracking-wide">Recent Activity</h3>
                  </div>
                  <div className="space-y-1">
                    {stats.recentActivity.slice(0, 4).map((activity, index) => (
                      <div
                        key={`${activity.domain}-${activity.scannedAt}`}
                        className="flex items-center justify-between rounded-lg border border-neutral-100 bg-neutral-50 px-3 py-2 transition-all duration-300 hover:border-neutral-200 hover:bg-neutral-100 hover:scale-[1.01] dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-neutral-700 dark:hover:bg-neutral-800 cursor-pointer animate-in fade-in-0 slide-in-from-right-3 transform-gpu"
                        style={{ animationDelay: `${(index + 6) * 120}ms` }}
                        onClick={() => setQuery(activity.domain || '')}
                      >
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse shadow-sm"></div>
                          <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                            {activity.domain}
                          </span>
                          <Badge variant="outline" className="text-[10px] border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-900/20 dark:text-green-400 px-1.5 py-0.5">
                            +{activity.tokens}
                          </Badge>
                        </div>
                        <span className="text-xs text-neutral-400 dark:text-neutral-500 font-mono">
                          {activity.scannedAt ? new Date(activity.scannedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'now'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Footer - grep.app style */}
      {viewMode === "home" && !hasResults && !query.trim() && (
        <div className="w-full select-none border-t border-neutral-200 px-4 py-6 text-sm text-neutral-500 dark:border-neutral-800 dark:text-neutral-400 sm:px-12 sm:py-8">
          <div className="relative flex flex-col gap-6">
            <div className="flex min-h-8 w-full flex-wrap items-center gap-6">
              <div className="max-sm:w-full">
                <Link href="/" className="flex items-center gap-2">
                  <div className="flex h-5 w-5 items-center justify-center rounded bg-black dark:bg-white">
                    <Palette className="h-3 w-3 text-white dark:text-black" />
                  </div>
                  <span className="font-medium">ContextDS</span>
                </Link>
              </div>
              <div className="max-sm:w-36">
                <a className="text-neutral-500 hover:text-foreground transition-colors" href="/docs">
                  Docs
                </a>
              </div>
              <div className="max-sm:w-36">
                <a className="text-neutral-500 hover:text-foreground transition-colors" href="/api">
                  API
                </a>
              </div>
              <div className="max-sm:w-36">
                <a className="text-neutral-500 hover:text-foreground transition-colors" href="/about">
                  About
                </a>
              </div>
              <div className="max-sm:w-36">
                <a className="text-neutral-500 hover:text-foreground transition-colors" href="/privacy">
                  Privacy
                </a>
              </div>
              <div className="max-sm:w-36">
                <a className="text-neutral-500 hover:text-foreground transition-colors" href="/terms">
                  Terms
                </a>
              </div>
            </div>
            <div className="flex items-center max-sm:h-8">
              © 2025 ContextDS. Built with ultrathink principles.
            </div>
            <div className="absolute right-0 max-sm:bottom-0">
              <ThemeToggle />
            </div>
          </div>
        </div>
      )}

      {viewMode === "scan" && (
        <section className="flex flex-1 flex-col bg-white dark:bg-black">
          {/* Centered scan interface */}
          <div className="flex flex-1 items-center justify-center px-6 py-16">
            <div className="w-full max-w-2xl text-center">
              {!scanResult && !scanLoading ? (
                <div className="space-y-8">
                  {/* Icon and main heading */}
                  <div className="space-y-4">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg">
                      <Sparkles className="h-8 w-8 text-white" />
                    </div>
                    <div className="space-y-2">
                      <h1 className="text-2xl font-semibold text-black dark:text-white">
                        Extract Design Tokens
                      </h1>
                      <p className="text-neutral-600 dark:text-neutral-400">
                        Enter any website URL to automatically analyze and extract design tokens
                      </p>
                    </div>
                  </div>

                  {/* Example sites */}
                  <div className="space-y-3">
                    <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                      Try these popular sites:
                    </p>
                    <div className="flex flex-wrap justify-center gap-2">
                      {[
                        { name: "stripe.com", icon: "🔵" },
                        { name: "vercel.com", icon: "▲" },
                        { name: "github.com", icon: "🐙" },
                        { name: "figma.com", icon: "🎭" },
                        { name: "tailwindcss.com", icon: "🎨" }
                      ].map((site) => (
                        <button
                          key={site.name}
                          onClick={() => setQuery(site.name)}
                          className="inline-flex items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm font-medium text-neutral-700 transition-all hover:border-neutral-300 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:border-neutral-600 dark:hover:bg-neutral-800"
                        >
                          <span>{site.icon}</span>
                          {site.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Instructions */}
                  <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4 text-left dark:border-neutral-800 dark:bg-neutral-900">
                    <h3 className="mb-2 text-sm font-medium text-neutral-900 dark:text-neutral-100">
                      How it works:
                    </h3>
                    <ul className="space-y-1 text-sm text-neutral-600 dark:text-neutral-400">
                      <li>• Analyzes live CSS and computed styles</li>
                      <li>• Extracts colors, typography, spacing, and shadows</li>
                      <li>• Generates W3C design token format</li>
                      <li>• Provides confidence scores and usage data</li>
                    </ul>
                  </div>

                  {/* Error display */}
                  {scanError && (
                    <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-600 dark:border-red-800 dark:bg-red-900/10 dark:text-red-400">
                      {scanError}
                    </div>
                  )}
                </div>
              ) : scanLoading ? (
                <div className="space-y-4">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600">
                    <Loader2 className="h-8 w-8 animate-spin text-white" />
                  </div>
                  <div className="space-y-2">
                    <h2 className="text-xl font-semibold text-black dark:text-white">
                      Scanning {query}...
                    </h2>
                    <p className="text-neutral-600 dark:text-neutral-400">
                      Analyzing CSS sources and extracting design tokens
                    </p>
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          {scanResult && (
              <div className="mx-auto max-w-7xl px-6 py-10">
                <div className="mb-8 flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-semibold text-black dark:text-white">{scanResult.domain}</h2>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400">
                      {scanResult.summary?.tokensExtracted} tokens • {scanResult.summary?.processingTime}s processing
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Button variant="outline" className="border-neutral-300 dark:border-neutral-700" onClick={() => handleCopyToken(JSON.stringify(scanResult.tokens, null, 2))}>
                      <Copy className="mr-2 h-4 w-4" /> Copy JSON
                    </Button>
                    <Button
                      variant="outline"
                      className="border-neutral-300 dark:border-neutral-700"
                      onClick={() => {
                        const blob = new Blob([JSON.stringify(scanResult.tokens, null, 2)], { type: "application/json" })
                        const url = URL.createObjectURL(blob)
                        const anchor = document.createElement("a")
                        anchor.href = url
                        anchor.download = `${scanResult.domain}-tokens.json`
                        document.body.appendChild(anchor)
                        anchor.click()
                        anchor.remove()
                        URL.revokeObjectURL(url)
                      }}
                    >
                      <Download className="mr-2 h-4 w-4" /> Download
                    </Button>
                    <Button className="bg-black text-white hover:bg-neutral-800 dark:bg-white dark:text-black dark:hover:bg-neutral-200">
                      <Plus className="mr-2 h-4 w-4" /> Submit to directory
                    </Button>
                  </div>
                </div>

                <div className="mb-10 grid gap-4 sm:grid-cols-2 md:grid-cols-4">
                  <Card className="border-neutral-200 dark:border-neutral-800">
                    <CardContent className="py-6 text-center">
                      <div className="text-2xl font-semibold text-black dark:text-white">{scanResult.summary?.tokensExtracted}</div>
                      <div className="text-xs uppercase tracking-wide text-neutral-500">Tokens extracted</div>
                    </CardContent>
                  </Card>
                  <Card className="border-neutral-200 dark:border-neutral-800">
                    <CardContent className="py-6 text-center">
                      <div className="text-2xl font-semibold text-black dark:text-white">{scanResult.summary?.confidence}%</div>
                      <div className="text-xs uppercase tracking-wide text-neutral-500">Confidence</div>
                    </CardContent>
                  </Card>
                  <Card className="border-neutral-200 dark:border-neutral-800">
                    <CardContent className="py-6 text-center">
                      <div className="text-2xl font-semibold text-black dark:text-white">{scanResult.summary?.completeness}%</div>
                      <div className="text-xs uppercase tracking-wide text-neutral-500">Completeness</div>
                    </CardContent>
                  </Card>
                  <Card className="border-neutral-200 dark:border-neutral-800">
                    <CardContent className="py-6 text-center">
                      <div className="text-2xl font-semibold text-black dark:text-white">{scanResult.summary?.reliability}%</div>
                      <div className="text-xs uppercase tracking-wide text-neutral-500">Reliability</div>
                    </CardContent>
                  </Card>
                </div>

                <div className="grid gap-8 md:grid-cols-[280px_1fr]">
                  <aside className="space-y-4">
                    {(["colors", "typography", "spacing", "radius", "shadows", "motion"] as ScanTokenCategory[]).map(category => {
                      const labelMap: Record<ScanTokenCategory, string> = {
                        colors: "Colors",
                        typography: "Typography",
                        spacing: "Spacing",
                        radius: "Radius",
                        shadows: "Shadows",
                        motion: "Motion"
                      }

                      const tokens = scanResult.tokens?.[category] ?? []
                      if (!Array.isArray(tokens) || tokens.length === 0) return null

                      return (
                        <button
                          key={category}
                          onClick={() => setSelectedTokenCategory(category)}
                          className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-sm transition ${
                            selectedTokenCategory === category
                              ? "bg-neutral-900 text-white dark:bg-neutral-100 dark:text-black"
                              : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800"
                          }`}
                        >
                          <span>{labelMap[category]}</span>
                          <Badge variant="secondary" className="bg-neutral-200 text-xs text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
                            {tokens.length}
                          </Badge>
                        </button>
                      )
                    })}
                  </aside>

                  <div className="space-y-4">
                    {/* Enhanced color card display */}
                    {selectedTokenCategory === 'colors' && selectedTokens.length > 0 ? (
                      <div className="space-y-6">
                        {/* Category header */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-pink-500 rounded-lg flex items-center justify-center shadow-md">
                              <Palette className="h-5 w-5 text-white" />
                            </div>
                            <div>
                              <h3 className="text-lg font-semibold text-black dark:text-white">Colors</h3>
                              <p className="text-sm text-neutral-600 dark:text-neutral-400">{selectedTokens.length} color tokens extracted</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleCopyToken(JSON.stringify(selectedTokens, null, 2))}
                              className="border-neutral-300 dark:border-neutral-700"
                            >
                              <Copy className="h-4 w-4 mr-1" />
                              Copy All
                            </Button>
                          </div>
                        </div>

                        {/* Beautiful color cards grid - like color palette sites */}
                        <ColorCardGrid
                          colors={selectedTokens.map(token => ({
                            name: token.name,
                            value: token.value,
                            confidence: token.confidence || 80,
                            usage: token.usage,
                            semantic: token.semantic
                          }))}
                          onColorCopy={(color) => {
                            handleCopyToken(color.value)
                            console.log(`🎨 Copied color: ${color.name} (${color.value})`)
                          }}
                          onColorSave={(color) => {
                            console.log(`❤️ Saved color: ${color.name}`)
                          }}
                          className="mt-6"
                        />
                      </div>
                    ) : selectedTokens.length > 0 ? (
                      /* Other token categories */
                      <Card className="border-neutral-200 dark:border-neutral-800">
                        <CardHeader>
                          <CardTitle className="text-base font-semibold">
                            {selectedTokenCategory.charAt(0).toUpperCase() + selectedTokenCategory.slice(1)}
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          {selectedTokens.map((token, index) => (
                            <div key={`${token.name}-${index}`} className="flex items-center justify-between rounded-md border border-neutral-200 px-3 py-2 text-sm dark:border-neutral-800">
                              <div className="flex flex-col">
                                <span className="font-medium text-black dark:text-white">{token.name}</span>
                                <span className="text-xs text-neutral-500 dark:text-neutral-500">{token.value}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                {typeof token.confidence === "number" && (
                                  <span className="text-xs text-neutral-500 dark:text-neutral-500">{token.confidence}%</span>
                                )}
                                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => handleCopyToken(String(token.value))}>
                                  <Copy className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </CardContent>
                      </Card>
                    ) : (
                      <Card className="border-neutral-200 dark:border-neutral-800">
                        <CardContent className="py-10 text-center text-sm text-neutral-500">
                          No tokens in this category for the current scan.
                        </CardContent>
                      </Card>
                    )}

                    {scanResult.brandAnalysis && (
                      <Card className="border-neutral-200 dark:border-neutral-800">
                        <CardHeader>
                          <CardTitle className="text-base font-semibold">Brand analysis</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2 text-sm text-neutral-600 dark:text-neutral-400">
                          <div>Style: {scanResult.brandAnalysis.style}</div>
                          <div>Maturity: {scanResult.brandAnalysis.maturity}</div>
                          <div>Consistency: {scanResult.brandAnalysis.consistency}%</div>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </div>
              </div>
            )}
        </section>
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
