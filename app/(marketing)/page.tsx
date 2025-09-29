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
  semantic?: string
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

type ViewMode = "search" | "scan"

type ScanTokenCategory = "colors" | "typography" | "spacing" | "radius" | "shadows" | "motion"

export default function HomePage() {
  const searchParams = useSearchParams()
  const [viewMode, setViewMode] = useState<ViewMode>("search")
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
    if (viewMode !== "search" || query.trim()) return

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
      if (viewMode === "search") {
        // Already in search mode, no need to transition
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
    <div className="flex h-full w-full flex-col bg-white dark:bg-black antialiased">
      {/* Vercel-style Header - Clean and Minimal */}
      <header className="flex min-h-[64px] w-full shrink-0 items-center justify-between border-b border-neutral-200/50 backdrop-blur-sm bg-white/80 dark:border-neutral-800/50 dark:bg-black/80 sticky top-0 z-50">
        {/* Left: Brand */}
        <div className="flex items-center pl-6">
          <Link href="/" className="flex items-center gap-2 group" onClick={() => { setQuery(""); setHasResults(false); }}>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-purple-600 transition-transform duration-200 group-hover:scale-105">
              <Palette className="h-4 w-4 text-white" />
            </div>
            <span className="text-lg font-semibold text-black dark:text-white">ContextDS</span>
          </Link>
        </div>

        {/* Center: Always-visible search (grep.app style) */}
        <div className="flex-1 max-w-2xl mx-8">
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <Search className="h-4 w-4 text-neutral-400 transition-colors duration-200 group-focus-within:text-blue-500" />
            </div>
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
              placeholder={viewMode === "scan" ? "Enter website URL to scan..." : "Search design tokens..."}
              className="w-full h-10 pl-10 pr-32 text-sm bg-white border border-neutral-200 rounded-lg transition-all duration-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 hover:border-neutral-300 dark:bg-black dark:border-neutral-700 dark:focus:border-blue-500 dark:focus:ring-blue-900/20 dark:hover:border-neutral-600"
              spellCheck="false"
              autoCapitalize="off"
              autoComplete="off"
              autoCorrect="off"
            />

            {/* Search mode toggle - integrated */}
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
              <div className="flex rounded-md border border-neutral-200 bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900">
                <button
                  onClick={() => setViewMode("search")}
                  className={`px-2 py-1 text-xs font-medium rounded-l-md transition-all duration-200 ${
                    viewMode === "search"
                      ? "bg-white text-black shadow-sm dark:bg-black dark:text-white"
                      : "text-neutral-600 hover:text-black dark:text-neutral-400 dark:hover:text-white"
                  }`}
                >
                  Search
                </button>
                <button
                  onClick={() => setViewMode("scan")}
                  className={`px-2 py-1 text-xs font-medium rounded-r-md transition-all duration-200 ${
                    viewMode === "scan"
                      ? "bg-white text-black shadow-sm dark:bg-black dark:text-white"
                      : "text-neutral-600 hover:text-black dark:text-neutral-400 dark:hover:text-white"
                  }`}
                >
                  Scan
                </button>
              </div>

              {/* Action buttons */}
              {viewMode === "search" && (
                <div className="flex items-center gap-0.5 ml-1">
                  <button
                    onClick={() => setCaseInsensitive(!caseInsensitive)}
                    className={`h-6 w-6 flex items-center justify-center rounded-md transition-all duration-200 hover:scale-105 ${
                      caseInsensitive
                        ? "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
                        : "text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                    }`}
                    title="Match case"
                  >
                    <Type className="h-3 w-3" />
                  </button>
                  <button
                    onClick={() => setWholeWords(!wholeWords)}
                    className={`h-6 w-6 flex items-center justify-center rounded-md transition-all duration-200 hover:scale-105 ${
                      wholeWords
                        ? "bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400"
                        : "text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                    }`}
                    title="Match whole words"
                  >
                    <Filter className="h-3 w-3" />
                  </button>
                  <button
                    onClick={() => setUseRegex(!useRegex)}
                    className={`h-6 w-6 flex items-center justify-center rounded-md transition-all duration-200 hover:scale-105 ${
                      useRegex
                        ? "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400"
                        : "text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                    }`}
                    title="Use regular expression"
                  >
                    <Regex className="h-3 w-3" />
                  </button>
                </div>
              )}

              {viewMode === "scan" && (
                <Button
                  onClick={handleScan}
                  disabled={!query.trim() || scanLoading}
                  size="sm"
                  className="h-7 px-3 ml-1 bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-xs font-medium rounded-lg hover:scale-105 disabled:hover:scale-100 transition-all duration-200"
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

        {/* Right: Controls */}
        <div className="flex items-center gap-3 pr-6">
          <Button variant="ghost" size="sm" className="text-xs text-neutral-600 hover:text-black dark:text-neutral-400 dark:hover:text-white">
            Feedback
          </Button>
          <ThemeToggle />
        </div>
      </header>

      {/* Main Interface - Grep.app style search-first layout */}
      <div className="flex-1 flex flex-col min-h-0">
        {/* Search Mode Interface */}
        {viewMode === "search" && (
          <div className="flex-1 flex">
            {/* Left Sidebar - Filters (Vercel style) */}
            <aside className="w-64 border-r border-neutral-200/50 bg-neutral-50/50 dark:border-neutral-800/50 dark:bg-neutral-950/50 p-6">
              <div className="space-y-6">
                {/* Categories */}
                <div>
                  <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 mb-3">Categories</h3>
                  <div className="space-y-1">
                    {tokenCategoryOptions.map(option => (
                      option.key === "all" || categoryFacets.some(facet => facet.key === option.key) ? (
                        <button
                          key={option.key}
                          onClick={() => setSelectedCategory(option.key)}
                          className={`w-full flex items-center justify-between px-3 py-2 text-sm rounded-lg transition-all duration-200 ${
                            selectedCategory === option.key
                              ? "bg-blue-100 text-blue-900 dark:bg-blue-900/30 dark:text-blue-100"
                              : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
                          }`}
                        >
                          <span>{option.label}</span>
                          {option.key !== "all" && (
                            <Badge variant="secondary" className="text-xs bg-neutral-200 text-neutral-600 dark:bg-neutral-700 dark:text-neutral-300">
                              {categoryFacets.find(facet => facet.key === option.key)?.count ?? 0}
                            </Badge>
                          )}
                        </button>
                      ) : null
                    ))}
                  </div>
                </div>

                {/* Popular Sites */}
                <div>
                  <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 mb-3 flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    Popular Sites
                  </h3>
                  <div className="space-y-1">
                    {popularSites.slice(0, 6).map(site => (
                      <button
                        key={site.domain!}
                        onClick={() => setQuery(site.domain || '')}
                        className="w-full flex items-center justify-between px-3 py-2 text-sm rounded-lg text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-100 transition-all duration-200"
                      >
                        <span className="truncate">{site.domain}</span>
                        <Badge variant="outline" className="text-xs">
                          {site.tokens}
                        </Badge>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Stats */}
                {stats && (
                  <div className="pt-4 border-t border-neutral-200 dark:border-neutral-800">
                    <div className="space-y-3 text-xs text-neutral-500 dark:text-neutral-400">
                      <div className="flex justify-between">
                        <span>Sites indexed</span>
                        <span className="font-semibold text-neutral-900 dark:text-neutral-100">{stats.sites}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Total tokens</span>
                        <span className="font-semibold text-neutral-900 dark:text-neutral-100">{stats.tokens.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Avg confidence</span>
                        <span className="font-semibold text-neutral-900 dark:text-neutral-100">{stats.averageConfidence}%</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 flex flex-col min-h-0">
              {/* Results Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200/50 dark:border-neutral-800/50 bg-white/80 dark:bg-black/80 backdrop-blur-sm">
                <div className="flex items-center gap-3">
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                      <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100">Searching...</span>
                    </>
                  ) : query.trim() ? (
                    <>
                      <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                        {resolvedResults.length.toLocaleString()} results
                      </span>
                      <span className="text-xs text-neutral-500 dark:text-neutral-400">
                        for "{query}"
                      </span>
                    </>
                  ) : (
                    <span className="text-sm text-neutral-500 dark:text-neutral-400">
                      Start typing to search {stats?.tokens.toLocaleString() || 0} design tokens
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" className="text-xs text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300">
                    Export
                  </Button>
                  <Button variant="ghost" size="sm" className="text-xs text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300">
                    <ChevronDown className="h-3 w-3 ml-1" />
                    View
                  </Button>
                </div>
              </div>

              {/* Results Area */}
              <div className="flex-1 overflow-y-auto">
                {/* Empty State */}
                {!query.trim() && !loading && (
                  <div className="flex-1 flex items-center justify-center p-12">
                    <div className="text-center max-w-md space-y-6">
                      <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center dark:from-blue-900/30 dark:to-purple-900/30">
                        <Search className="h-7 w-7 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div className="space-y-2">
                        <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
                          Search Design Tokens
                        </h2>
                        <p className="text-neutral-600 dark:text-neutral-400">
                          Search across {stats?.tokens.toLocaleString() || 0} design tokens from {stats?.sites || 0} websites
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2 justify-center">
                        {["primary", "Inter", "#635bff", "spacing"].map(example => (
                          <button
                            key={example}
                            onClick={() => setQuery(example)}
                            className="px-3 py-1 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 rounded-md text-xs font-medium transition-all duration-200 hover:scale-105"
                          >
                            {example}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Loading State */}
                {loading && (
                  <div className="flex-1 flex items-center justify-center p-12">
                    <div className="text-center space-y-4">
                      <div className="relative">
                        <div className="w-8 h-8 border-2 border-neutral-200 dark:border-neutral-800 rounded-full animate-spin"></div>
                        <div className="absolute inset-0 w-8 h-8 border-2 border-t-blue-500 rounded-full animate-spin"></div>
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                          Searching {query.length === 1 ? 'database' : `"${query}"`}
                        </p>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400">
                          {stats?.tokens.toLocaleString() || 0} tokens • {stats?.sites || 0} sites
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Results */}
                {!loading && resolvedResults.length > 0 && (
                  <div className="p-6 space-y-3">
                    {resolvedResults.map((result, index) => (
                      <div
                        key={result.id}
                        className="group p-4 border border-neutral-200 rounded-xl bg-white hover:border-neutral-300 hover:shadow-sm transition-all duration-200 dark:border-neutral-800 dark:bg-neutral-950 dark:hover:border-neutral-700 animate-in fade-in-0 slide-in-from-bottom-2"
                        style={{ animationDelay: `${index * 50}ms` }}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-semibold text-neutral-900 dark:text-neutral-100 truncate">
                                {result.name}
                              </span>
                              <Badge variant="secondary" className="text-xs">
                                {result.category}
                              </Badge>
                            </div>
                            <code className="block text-sm font-mono text-neutral-600 dark:text-neutral-400 bg-neutral-100 dark:bg-neutral-800 px-2 py-1 rounded-md mt-2">
                              {result.value}
                            </code>
                            {result.site && (
                              <div className="flex items-center gap-1 mt-2 text-xs text-neutral-500 dark:text-neutral-400">
                                <span>from</span>
                                <Link href={`/site/${result.site}`} className="font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300">
                                  {result.site}
                                </Link>
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-2 ml-4">
                            {typeof result.confidence === "number" && (
                              <span className="text-xs text-neutral-500 dark:text-neutral-400">
                                {result.confidence}%
                              </span>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleCopyToken(String(result.value))}
                              className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-all duration-200"
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* No Results */}
                {!loading && query.trim() && resolvedResults.length === 0 && (
                  <div className="flex-1 flex items-center justify-center p-12">
                    <div className="text-center space-y-4">
                      <div className="w-12 h-12 mx-auto rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center">
                        <Search className="h-5 w-5 text-neutral-400" />
                      </div>
                      <div className="space-y-1">
                        <h3 className="font-medium text-neutral-900 dark:text-neutral-100">No results found</h3>
                        <p className="text-sm text-neutral-500 dark:text-neutral-400">
                          Try adjusting your search or browse popular tokens below
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </main>
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
      {viewMode === "search" && !hasResults && !query.trim() && stats && stats.sites > 0 && showScrollContent && (
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
      {viewMode === "search" && !hasResults && !query.trim() && (
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
