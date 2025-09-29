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

function HomePageContent() {
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
  }, [query, caseInsensitive, wholeWords, useRegex, selectedCategory])

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
    <div className="flex h-full w-full flex-col bg-white dark:bg-black">
      {/* Vercel-style Header - Always visible, clean design */}
      <header className="flex h-16 w-full shrink-0 items-center justify-between border-b border-neutral-200/60 bg-white/80 backdrop-blur-md dark:border-neutral-800/60 dark:bg-black/80 sticky top-0 z-50">
        {/* Brand */}
        <div className="flex items-center pl-6">
          <Link href="/" className="flex items-center gap-2 group" onClick={() => { setQuery(""); setScanResult(null); }}>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-purple-600 shadow-sm transition-transform duration-200 group-hover:scale-105">
              <Palette className="h-4 w-4 text-white" />
            </div>
            <span className="text-lg font-semibold bg-gradient-to-r from-neutral-900 to-neutral-600 bg-clip-text text-transparent dark:from-neutral-100 dark:to-neutral-400">
              ContextDS
            </span>
          </Link>
        </div>

        {/* Center: Always-visible search */}
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
              className="w-full h-10 pl-10 pr-36 text-sm bg-white border border-neutral-200 rounded-lg transition-all duration-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 hover:border-neutral-300 dark:bg-black dark:border-neutral-700 dark:focus:border-blue-500 dark:focus:ring-blue-500/20 dark:hover:border-neutral-600"
              spellCheck="false"
              autoCapitalize="off"
              autoComplete="off"
              autoCorrect="off"
            />

            {/* Integrated controls */}
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
              {/* Mode toggle */}
              <div className="flex rounded-md border border-neutral-200 bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900" role="tablist" aria-label="Application mode">
                <button
                  onClick={() => setViewMode("search")}
                  className={`px-2 py-1 text-xs font-medium rounded-l-md transition-all duration-200 ${
                    viewMode === "search"
                      ? "bg-white text-black shadow-sm dark:bg-black dark:text-white"
                      : "text-neutral-600 hover:text-black dark:text-neutral-400 dark:hover:text-white"
                  }`}
                  role="tab"
                  aria-selected={viewMode === "search"}
                  aria-controls="search-panel"
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
                  role="tab"
                  aria-selected={viewMode === "scan"}
                  aria-controls="scan-panel"
                >
                  Scan
                </button>
              </div>

              {/* Search options */}
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

              {/* Scan button */}
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

      {/* Main Content - Search First Design */}
      <div className="flex-1 flex min-h-0">
        {viewMode === "search" ? (
          <>
            {/* Left Sidebar - Filters */}
            <aside className="w-64 border-r border-neutral-200/50 bg-neutral-50/50 dark:border-neutral-800/50 dark:bg-neutral-950/50 p-6 overflow-y-auto">
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
                            <Badge variant="secondary" className="text-xs">
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
                    {popularSites.map(site => (
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

            {/* Main Search Results */}
            <main id="main-content" className="flex-1 flex flex-col min-h-0" role="main" aria-label="Search results">
              {/* Results Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200/50 dark:border-neutral-800/50">
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
                      {searchError && <span className="text-xs text-red-500">• {searchError}</span>}
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
                </div>
              </div>

              {/* Results Area */}
              <div className="flex-1 overflow-y-auto">
                {/* Empty State */}
                {!query.trim() && !loading && (
                  <div className="flex-1 flex items-center justify-center p-12">
                    <div className="text-center max-w-lg space-y-6">
                      <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center dark:from-blue-900/30 dark:to-purple-900/30">
                        <Search className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div className="space-y-3">
                        <h2 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100">
                          Search Design Tokens
                        </h2>
                        <p className="text-neutral-600 dark:text-neutral-400">
                          Search across {stats?.tokens.toLocaleString() || 0} design tokens from {stats?.sites || 0} websites. Find colors, typography, spacing, and more.
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2 justify-center">
                        {["primary", "Inter", "#635bff", "spacing-4", "border-radius"].map(example => (
                          <button
                            key={example}
                            onClick={() => setQuery(example)}
                            className="px-3 py-1.5 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 rounded-lg text-xs font-medium transition-all duration-200 hover:scale-105"
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
                  <div className="p-6 space-y-4">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} className="animate-pulse">
                        <div className="h-4 bg-neutral-200 rounded w-1/3 mb-2 dark:bg-neutral-800"></div>
                        <div className="h-12 bg-neutral-100 rounded-lg dark:bg-neutral-900"></div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Results */}
                {!loading && resolvedResults.length > 0 && (
                  <div className="p-6 space-y-4">
                    {resolvedResults.map((result, index) => (
                      <div
                        key={result.id}
                        className="group p-4 border border-neutral-200 rounded-xl bg-white hover:border-neutral-300 hover:shadow-sm transition-all duration-200 dark:border-neutral-800 dark:bg-neutral-950 dark:hover:border-neutral-700 animate-in fade-in-0 slide-in-from-bottom-2"
                        style={{ animationDelay: `${index * 30}ms` }}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="font-semibold text-neutral-900 dark:text-neutral-100 truncate">
                                {result.name}
                              </span>
                              <Badge className="text-xs bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
                                {result.category}
                              </Badge>
                              {typeof result.confidence === "number" && (
                                <Badge variant="outline" className="text-xs">
                                  {result.confidence}%
                                </Badge>
                              )}
                            </div>
                            <code className="block text-sm font-mono text-neutral-600 dark:text-neutral-400 bg-neutral-100 dark:bg-neutral-800 px-3 py-2 rounded-lg">
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
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleCopyToken(String(result.value))}
                              className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-all duration-200 hover:scale-105"
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                            {result.site && (
                              <Button
                                variant="ghost"
                                size="sm"
                                asChild
                                className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-all duration-200 hover:scale-105"
                              >
                                <Link href={`/site/${result.site}`}>
                                  <ExternalLink className="h-3 w-3" />
                                </Link>
                              </Button>
                            )}
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
                      <div className="w-16 h-16 mx-auto rounded-2xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center">
                        <Search className="h-6 w-6 text-neutral-400" />
                      </div>
                      <div className="space-y-2">
                        <h3 className="text-lg font-medium text-neutral-900 dark:text-neutral-100">No results found</h3>
                        <p className="text-sm text-neutral-500 dark:text-neutral-400">
                          Try adjusting your search terms or browse popular tokens in the sidebar
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </main>
          </>
        ) : (
          /* Scan Mode Interface */
          <div className="flex-1 flex items-center justify-center p-12">
            <div className="w-full max-w-3xl">
              {!scanResult && !scanLoading ? (
                <div className="text-center space-y-8">
                  <div className="space-y-4">
                    <div className="w-24 h-24 mx-auto rounded-3xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-xl">
                      <Sparkles className="h-12 w-12 text-white" />
                    </div>
                    <div className="space-y-3">
                      <h1 className="text-3xl font-bold text-neutral-900 dark:text-neutral-100">
                        Extract Design Tokens
                      </h1>
                      <p className="text-lg text-neutral-600 dark:text-neutral-400 max-w-2xl mx-auto">
                        Enter any website URL to automatically analyze and extract design tokens from live CSS sources
                      </p>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div>
                      <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-4">
                        Try these popular design systems:
                      </p>
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        {[
                          { name: "stripe.com", icon: "💳", desc: "Payment UI", color: "from-blue-500 to-purple-500" },
                          { name: "vercel.com", icon: "▲", desc: "Clean design", color: "from-black to-neutral-800" },
                          { name: "github.com", icon: "🐙", desc: "Developer tools", color: "from-neutral-700 to-neutral-900" },
                          { name: "figma.com", icon: "🎭", desc: "Design platform", color: "from-purple-500 to-pink-500" }
                        ].map((site) => (
                          <button
                            key={site.name}
                            onClick={() => setQuery(site.name)}
                            className="group p-4 border border-neutral-200 rounded-xl bg-white hover:border-neutral-300 hover:shadow-md transition-all duration-300 hover:scale-[1.02] dark:border-neutral-700 dark:bg-neutral-950 dark:hover:border-neutral-600 text-left"
                          >
                            <div className={`w-12 h-12 mx-auto mb-3 rounded-xl bg-gradient-to-br ${site.color} flex items-center justify-center text-xl shadow-lg group-hover:scale-110 transition-transform duration-200`}>
                              {site.icon}
                            </div>
                            <div className="space-y-1">
                              <div className="font-semibold text-sm text-neutral-900 dark:text-neutral-100">{site.name}</div>
                              <div className="text-xs text-neutral-500 dark:text-neutral-400">{site.desc}</div>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="bg-neutral-50 dark:bg-neutral-900 rounded-xl p-6">
                      <h3 className="font-semibold text-neutral-900 dark:text-neutral-100 mb-3">How it works:</h3>
                      <div className="grid md:grid-cols-2 gap-4 text-sm text-neutral-600 dark:text-neutral-400">
                        <div className="flex gap-3">
                          <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <span className="text-xs font-bold text-blue-600 dark:text-blue-400">1</span>
                          </div>
                          <div>
                            <div className="font-medium text-neutral-900 dark:text-neutral-100">Analyze Live CSS</div>
                            <div>Captures computed styles and CSS sources from the live website</div>
                          </div>
                        </div>
                        <div className="flex gap-3">
                          <div className="w-6 h-6 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <span className="text-xs font-bold text-purple-600 dark:text-purple-400">2</span>
                          </div>
                          <div>
                            <div className="font-medium text-neutral-900 dark:text-neutral-100">Extract Tokens</div>
                            <div>Identifies colors, typography, spacing, shadows and converts to W3C format</div>
                          </div>
                        </div>
                        <div className="flex gap-3">
                          <div className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">3</span>
                          </div>
                          <div>
                            <div className="font-medium text-neutral-900 dark:text-neutral-100">Generate Insights</div>
                            <div>Provides confidence scores, usage patterns, and brand analysis</div>
                          </div>
                        </div>
                        <div className="flex gap-3">
                          <div className="w-6 h-6 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <span className="text-xs font-bold text-amber-600 dark:text-amber-400">4</span>
                          </div>
                          <div>
                            <div className="font-medium text-neutral-900 dark:text-neutral-100">Export & Use</div>
                            <div>Download JSON tokens or add to searchable database</div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {scanError && (
                      <div className="p-4 border border-red-200 bg-red-50 rounded-xl dark:border-red-800/50 dark:bg-red-900/10">
                        <div className="flex items-center gap-2">
                          <div className="w-5 h-5 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                            <span className="text-xs text-red-600 dark:text-red-400">!</span>
                          </div>
                          <p className="text-sm text-red-600 dark:text-red-400">{scanError}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : scanLoading ? (
                <div className="text-center space-y-8">
                  <div className="w-24 h-24 mx-auto rounded-3xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-xl">
                    <Loader2 className="h-12 w-12 text-white animate-spin" />
                  </div>
                  <div className="space-y-3">
                    <h2 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100">
                      Scanning {query}...
                    </h2>
                    <p className="text-neutral-600 dark:text-neutral-400">
                      Analyzing CSS sources and extracting design tokens
                    </p>
                  </div>
                </div>
              ) : scanResult && (
                <div className="p-8 space-y-8">
                  {/* Scan Results Header */}
                  <div className="text-center space-y-4">
                    <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-lg">
                      <Sparkles className="h-8 w-8 text-white" />
                    </div>
                    <div className="space-y-2">
                      <h2 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
                        {scanResult.domain}
                      </h2>
                      <div className="flex items-center justify-center gap-6 text-sm">
                        <span className="flex items-center gap-1 text-neutral-600 dark:text-neutral-400">
                          <Palette className="h-4 w-4 text-blue-500" />
                          <strong className="text-neutral-900 dark:text-neutral-100">{scanResult.summary?.tokensExtracted}</strong> tokens
                        </span>
                        <span className="flex items-center gap-1 text-neutral-600 dark:text-neutral-400">
                          <TrendingUp className="h-4 w-4 text-green-500" />
                          <strong className="text-neutral-900 dark:text-neutral-100">{scanResult.summary?.confidence}%</strong> confidence
                        </span>
                        <span className="flex items-center gap-1 text-neutral-600 dark:text-neutral-400">
                          <Sparkles className="h-4 w-4 text-purple-500" />
                          <strong className="text-neutral-900 dark:text-neutral-100">{scanResult.summary?.processingTime}s</strong>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Token Categories */}
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {(["colors", "typography", "spacing", "radius", "shadows", "motion"] as ScanTokenCategory[]).map(category => {
                      const tokens = scanResult.tokens?.[category] ?? []
                      if (!Array.isArray(tokens) || tokens.length === 0) return null

                      return (
                        <button
                          key={category}
                          onClick={() => setSelectedTokenCategory(category)}
                          className={`p-4 border rounded-xl text-left transition-all duration-200 hover:scale-[1.02] ${
                            selectedTokenCategory === category
                              ? "border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/30"
                              : "border-neutral-200 bg-white hover:border-neutral-300 hover:shadow-sm dark:border-neutral-800 dark:bg-neutral-950 dark:hover:border-neutral-700"
                          }`}
                        >
                          <div className="font-semibold text-sm text-neutral-900 dark:text-neutral-100 capitalize mb-1">
                            {category}
                          </div>
                          <div className="text-xs text-neutral-500 dark:text-neutral-400">
                            {tokens.length} tokens extracted
                          </div>
                        </button>
                      )
                    })}
                  </div>

                  {/* Selected tokens display */}
                  {selectedTokenCategory === 'colors' && selectedTokens.length > 0 ? (
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">Color Tokens</h3>
                      <ColorCardGrid
                        colors={selectedTokens.map(token => ({
                          name: token.name,
                          value: token.value,
                          confidence: token.confidence || 80,
                          usage: token.usage,
                          semantic: token.semantic
                        }))}
                        onColorCopy={(color) => handleCopyToken(color.value)}
                        onColorSave={() => {}}
                        className="grid-cols-2 md:grid-cols-4 lg:grid-cols-6"
                      />
                    </div>
                  ) : selectedTokens.length > 0 ? (
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 capitalize">
                        {selectedTokenCategory} Tokens
                      </h3>
                      <div className="grid gap-3">
                        {selectedTokens.map((token, index) => (
                          <div key={`${token.name}-${index}`} className="group flex items-center justify-between p-4 border border-neutral-200 rounded-xl bg-white hover:border-neutral-300 hover:shadow-sm dark:border-neutral-800 dark:bg-neutral-950 dark:hover:border-neutral-700 transition-all duration-200">
                            <div className="flex-1">
                              <div className="font-semibold text-sm text-neutral-900 dark:text-neutral-100 mb-1">{token.name}</div>
                              <code className="text-sm text-neutral-600 dark:text-neutral-400 bg-neutral-100 dark:bg-neutral-800 px-2 py-1 rounded">{token.value}</code>
                              {token.confidence && (
                                <div className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                                  {token.confidence}% confidence
                                </div>
                              )}
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleCopyToken(String(token.value))}
                              className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-all duration-200"
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {/* Actions */}
                  {scanResult && (
                    <div className="flex justify-center gap-4 pt-6">
                      <Button
                        variant="outline"
                        onClick={() => handleCopyToken(JSON.stringify(scanResult.tokens, null, 2))}
                        className="flex items-center gap-2"
                      >
                        <Copy className="h-4 w-4" />
                        Copy JSON
                      </Button>
                      <Button
                        variant="outline"
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
                        className="flex items-center gap-2"
                      >
                        <Download className="h-4 w-4" />
                        Download
                      </Button>
                      <Button className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white">
                        <Plus className="h-4 w-4" />
                        Add to Directory
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
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