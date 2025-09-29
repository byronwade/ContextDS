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

function HomePageContent() {
  const searchParams = useSearchParams()
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

  useEffect(() => {
    setIsSearchActive(query.trim().length > 0)
    setHasResults(results.length > 0)
  }, [query, results])

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
      {/* Grep.app Style Header */}
      <div className="flex min-h-[64px] w-full shrink-0 flex-wrap items-center justify-between border-b border-grep-2 md:flex-nowrap">
        {/* Left: Brand */}
        <div className="flex pl-4 md:pl-6">
          <div className="flex items-center space-x-2 pr-3">
            <Link className="outline-offset-4" href="/">
              <svg aria-label="Vercel Logo" className="fill-black dark:fill-white" viewBox="0 0 75 65" height="22">
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

        {/* Center: Search (only when active) */}
        {(isSearchActive || query.trim()) && (
          <div className="order-1 flex w-full items-center justify-center border-t border-grep-2 px-4 py-3 md:order-none md:border-none md:px-3 md:py-0" id="header-contents">
            <div className="relative z-10 w-full flex-grow">
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search"
                id="search-input"
                className="flex w-full min-w-0 shrink rounded-md border border-grep-4 bg-grep-0 px-3 py-1 text-sm transition-colors focus-visible:border-grep-12 focus-visible:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-grep-4 disabled:cursor-not-allowed disabled:opacity-50 placeholder:text-grep-7 h-[42px] pr-24 md:h-9 max-md:max-w-none"
                style={{paddingLeft: '12px'}}
                spellCheck="false"
                autoCapitalize="off"
                autoComplete="off"
                autoCorrect="off"
              />
              <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1">
                <button
                  type="button"
                  onClick={() => setCaseInsensitive(!caseInsensitive)}
                  className={cn(
                    "border border-transparent inline-flex items-center justify-center gap-2 rounded-md text-sm text-grep-9 font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 bg-transparent h-6 px-1 min-w-6",
                    caseInsensitive && "data-[state=on]:bg-grep-11 data-[state=on]:border-grep-6 data-[state=on]:text-foreground"
                  )}
                  aria-pressed={caseInsensitive}
                  data-state={caseInsensitive ? "on" : "off"}
                  aria-label="Match case"
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-4 w-4">
                    <path d="M11.6667 11C12.7713 11 13.6667 10.1046 13.6667 9C13.6667 7.89543 12.7713 7 11.6667 7C10.5621 7 9.66669 7.89543 9.66669 9C9.66669 10.1046 10.5621 11 11.6667 11Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"></path>
                    <path d="M13.6667 7V11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" strokeLinejoin="round"></path>
                    <path fillRule="evenodd" clipRule="evenodd" d="M3.26242 10.0789L2.63419 11.8414L2.57767 12H0.985229L1.22126 11.3378L4.22128 2.92102L5.63421 2.92102L8.63419 11.3378L8.87023 12H7.27779L7.22126 11.8414L6.59305 10.0789H6.5777H3.2777H3.26242ZM3.79707 8.57885H6.0584L4.92774 5.40668L3.79707 8.57885Z" fill="currentColor"></path>
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => setWholeWords(!wholeWords)}
                  className={cn(
                    "border border-transparent inline-flex items-center justify-center gap-2 rounded-md text-sm text-grep-9 font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 bg-transparent h-6 px-1 min-w-6",
                    wholeWords && "data-[state=on]:bg-grep-11 data-[state=on]:border-grep-6 data-[state=on]:text-foreground"
                  )}
                  aria-pressed={wholeWords}
                  data-state={wholeWords ? "on" : "off"}
                  aria-label="Match whole words"
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-4 w-4">
                    <path d="M4.66669 10C5.77126 10 6.66669 9.10457 6.66669 8C6.66669 6.89543 5.77126 6 4.66669 6C3.56212 6 2.66669 6.89543 2.66669 8C2.66669 9.10457 3.56212 10 4.66669 10Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"></path>
                    <path d="M6.66669 6V10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" strokeLinejoin="round"></path>
                    <path d="M11.3333 10C12.4379 10 13.3333 9.10457 13.3333 8C13.3333 6.89543 12.4379 6 11.3333 6C10.2287 6 9.33331 6.89543 9.33331 8C9.33331 9.10457 10.2287 10 11.3333 10Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"></path>
                    <path d="M9.33331 4.66675V10.0001" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" strokeLinejoin="round"></path>
                    <path d="M1 11V13H15V11" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"></path>
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => setUseRegex(!useRegex)}
                  className={cn(
                    "border border-transparent inline-flex items-center justify-center gap-2 rounded-md text-sm text-grep-9 font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 bg-transparent h-6 px-1 min-w-6",
                    useRegex && "data-[state=on]:bg-grep-11 data-[state=on]:border-grep-6 data-[state=on]:text-foreground"
                  )}
                  aria-pressed={useRegex}
                  data-state={useRegex ? "on" : "off"}
                  aria-label="Use regular expression"
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-4 w-4">
                    <path d="M10.8867 2V8.66667" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" strokeLinejoin="round"></path>
                    <path d="M8 3.66675L13.7733 7.00008" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" strokeLinejoin="round"></path>
                    <path d="M8 7.00008L13.7733 3.66675" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" strokeLinejoin="round"></path>
                    <rect x="2" y="9" width="4" height="4" fill="currentColor"></rect>
                  </svg>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Right: Controls */}
        <div className="flex min-h-[64px] select-none items-center justify-end gap-3 pr-4 md:pr-6">
          <Button
            variant="outline"
            size="sm"
            className="inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-8 rounded-md px-3 text-xs sm:h-9 sm:px-4 py-2 sm:text-sm shadow-none [@media(max-width:374px)]:hidden"
          >
            Feedback
          </Button>
        </div>
      </div>

      {/* Main Content */}
      {hasResults ? (
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
                      <div className="flex flex-col py-1 sm:flex-row sm:gap-2">
                        <div className="flex shrink-0 flex-row items-center gap-2">
                          <div className="w-4 h-4 rounded-sm bg-neutral-300 dark:bg-neutral-700" />
                          <span className="text-sm font-medium hover:underline">{result.site || 'unknown'}</span>
                        </div>
                        <span className="text-sm text-grep-9 hover:underline">
                          {result.category} / {result.name}
                        </span>
                      </div>
                      <div className="hidden text-nowrap text-xs text-grep-9 md:block">1 match</div>
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

              <div className="py-1"></div>

              {/* Main Search Input */}
              <div className="flex w-full flex-row items-center justify-center">
                <div className="px-2"></div>
                <div className="w-[625px]">
                  <div className="relative z-10 w-full flex-grow">
                    <Input
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Search"
                      id="search-input"
                      className="flex w-full min-w-0 shrink rounded-md border border-grep-4 bg-grep-0 px-3 py-1 text-sm transition-colors focus-visible:border-grep-12 focus-visible:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-grep-4 disabled:cursor-not-allowed disabled:opacity-50 placeholder:text-grep-7 h-[42px] pr-24"
                      style={{paddingLeft: '12px'}}
                      spellCheck="false"
                      autoCapitalize="off"
                      autoComplete="off"
                      autoCorrect="off"
                    />
                    <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setCaseInsensitive(!caseInsensitive)}
                        className={cn(
                          "border border-transparent inline-flex items-center justify-center gap-2 rounded-md text-sm text-grep-9 font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 bg-transparent h-6 px-1 min-w-6",
                          caseInsensitive && "data-[state=on]:bg-grep-11 data-[state=on]:border-grep-6 data-[state=on]:text-foreground"
                        )}
                        aria-pressed={caseInsensitive}
                        data-state={caseInsensitive ? "on" : "off"}
                        aria-label="Match case"
                      >
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-4 w-4">
                          <path d="M11.6667 11C12.7713 11 13.6667 10.1046 13.6667 9C13.6667 7.89543 12.7713 7 11.6667 7C10.5621 7 9.66669 7.89543 9.66669 9C9.66669 10.1046 10.5621 11 11.6667 11Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"></path>
                          <path d="M13.6667 7V11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" strokeLinejoin="round"></path>
                          <path fillRule="evenodd" clipRule="evenodd" d="M3.26242 10.0789L2.63419 11.8414L2.57767 12H0.985229L1.22126 11.3378L4.22128 2.92102L5.63421 2.92102L8.63419 11.3378L8.87023 12H7.27779L7.22126 11.8414L6.59305 10.0789H6.5777H3.2777H3.26242ZM3.79707 8.57885H6.0584L4.92774 5.40668L3.79707 8.57885Z" fill="currentColor"></path>
                        </svg>
                      </button>
                      <button
                        type="button"
                        onClick={() => setWholeWords(!wholeWords)}
                        className={cn(
                          "border border-transparent inline-flex items-center justify-center gap-2 rounded-md text-sm text-grep-9 font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 bg-transparent h-6 px-1 min-w-6",
                          wholeWords && "data-[state=on]:bg-grep-11 data-[state=on]:border-grep-6 data-[state=on]:text-foreground"
                        )}
                        aria-pressed={wholeWords}
                        data-state={wholeWords ? "on" : "off"}
                        aria-label="Match whole words"
                      >
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-4 w-4">
                          <path d="M4.66669 10C5.77126 10 6.66669 9.10457 6.66669 8C6.66669 6.89543 5.77126 6 4.66669 6C3.56212 6 2.66669 6.89543 2.66669 8C2.66669 9.10457 3.56212 10 4.66669 10Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"></path>
                          <path d="M6.66669 6V10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" strokeLinejoin="round"></path>
                          <path d="M11.3333 10C12.4379 10 13.3333 9.10457 13.3333 8C13.3333 6.89543 12.4379 6 11.3333 6C10.2287 6 9.33331 6.89543 9.33331 8C9.33331 9.10457 10.2287 10 11.3333 10Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"></path>
                          <path d="M9.33331 4.66675V10.0001" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" strokeLinejoin="round"></path>
                          <path d="M1 11V13H15V11" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"></path>
                        </svg>
                      </button>
                      <button
                        type="button"
                        onClick={() => setUseRegex(!useRegex)}
                        className={cn(
                          "border border-transparent inline-flex items-center justify-center gap-2 rounded-md text-sm text-grep-9 font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 bg-transparent h-6 px-1 min-w-6",
                          useRegex && "data-[state=on]:bg-grep-11 data-[state=on]:border-grep-6 data-[state=on]:text-foreground"
                        )}
                        aria-pressed={useRegex}
                        data-state={useRegex ? "on" : "off"}
                        aria-label="Use regular expression"
                      >
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-4 w-4">
                          <path d="M10.8867 2V8.66667" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" strokeLinejoin="round"></path>
                          <path d="M8 3.66675L13.7733 7.00008" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" strokeLinejoin="round"></path>
                          <path d="M8 7.00008L13.7733 3.66675" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" strokeLinejoin="round"></path>
                          <rect x="2" y="9" width="4" height="4" fill="currentColor"></rect>
                        </svg>
                      </button>
                    </div>
                  </div>
                  <div className="h-[min(25dvh,250px)] w-full"></div>
                </div>
                <div className="px-2"></div>
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