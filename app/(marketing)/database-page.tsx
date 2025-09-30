"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Search,
  Plus,
  Palette,
  ExternalLink,
  Loader2,
  Globe,
  Type,
  Hash,
  Copy
} from "lucide-react"
import { useState, useEffect, useCallback } from "react"

interface SearchResult {
  id: string
  domain?: string
  url?: string
  [key: string]: unknown
}

export default function DatabaseHomePage() {
  const [query, setQuery] = useState("")
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [searchMode, setSearchMode] = useState<'tokens' | 'sites'>('tokens')
  const [caseInsensitive, setCaseInsensitive] = useState(true)
  const [databaseStats, setDatabaseStats] = useState({ sites: 0, tokens: 0, scans: 0 })

  // Load database statistics on mount
  const loadDatabaseStats = useCallback(async () => {
    try {
      const response = await fetch('/api/stats')
      if (response.ok) {
        const stats = await response.json()
        setDatabaseStats(stats)
        console.log('📊 Database stats loaded:', stats)
      }
    } catch (error) {
      console.warn('Failed to load database stats:', error)
    }
  }, [])

  const loadInitialData = useCallback(async () => {
    try {
      // Load recent sites or tokens for initial display
      setLoading(true)
      // Implementation would go here
      setLoading(false)
    } catch (error) {
      console.warn('Failed to load initial data:', error)
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadDatabaseStats()
    if (!query) {
      loadInitialData()
    }
  }, [loadDatabaseStats, loadInitialData, query])

  // Real database search
  const handleSearch = async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setSearchResults([])
      return
    }

    setLoading(true)

    try {
      console.log(`🔍 Searching database for: "${searchQuery}" in mode: ${searchMode}`)

      const response = await fetch(`/api/search?${new URLSearchParams({
        query: searchQuery,
        mode: searchMode,
        caseInsensitive: caseInsensitive.toString(),
        limit: '50'
      })}`)

      if (!response.ok) {
        throw new Error('Search failed')
      }

      const data = await response.json()
      setSearchResults(data.results || [])

      console.log(`✅ Found ${data.results?.length || 0} results in database`)

    } catch (error) {
      console.error('❌ Database search failed:', error)
      setSearchResults([])
    } finally {
      setLoading(false)
    }
  }

  // Handle new site scanning
  const handleAddSite = async (url: string) => {
    if (!url.trim()) return

    setLoading(true)

    try {
      console.log(`🔄 Scanning ${url}...`)

      const response = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: url.startsWith('http') ? url : `https://${url}`,
          quality: 'standard'
        })
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const result = await response.json()

      console.log(`✅ Scan completed: ${result.summary?.tokensExtracted} tokens extracted`)

      // Refresh data after successful scan
      await loadDatabaseStats()
      if (query) {
        await handleSearch(query)
      } else {
        await loadInitialData()
      }

    } catch (error) {
      console.error('❌ Scan failed:', error)
    } finally {
      setLoading(false)
    }
  }

  // Debounced search
  useEffect(() => {
    const delayedSearch = setTimeout(() => {
      if (query.trim()) {
        handleSearch(query)
      }
    }, 200)

    return () => clearTimeout(delayedSearch)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, searchMode, caseInsensitive])

  const handleCopyToken = (value: string) => {
    navigator.clipboard.writeText(value)
  }

  const getAvatarForSite = (domain: string): string => {
    if (!domain) return '🎨'
    if (domain.includes('stripe')) return '🔵'
    if (domain.includes('github')) return '🐙'
    if (domain.includes('vercel')) return '▲'
    if (domain.includes('figma')) return '🎭'
    if (domain.includes('tailwind')) return '🎨'
    if (domain.includes('linear')) return '📐'
    return '⚙️'
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header - grep.app style minimal */}
      <header className="border-b border-border/40 px-6 py-4">
        <div className="flex items-center justify-between max-w-6xl mx-auto">
          <Link className="flex items-center gap-2 text-lg font-semibold" href="/">
            <div className="w-6 h-6 bg-blue-600 rounded flex items-center justify-center">
              <Palette className="h-4 w-4 text-white" />
            </div>
            ContextDS
          </Link>

          <nav className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
            <Link href="/docs" className="hover:text-foreground transition-colors">Docs</Link>
            <Link href="/help" className="hover:text-foreground transition-colors">Help</Link>
            {databaseStats.sites > 0 && (
              <span className="text-xs bg-muted px-2 py-1 rounded">
                {databaseStats.sites} sites • {databaseStats.tokens} tokens
              </span>
            )}
          </nav>
        </div>
      </header>

      {/* Main interface */}
      <main className="max-w-6xl mx-auto px-6 py-12">
        <div className="space-y-8">
          {/* Search and scan interface */}
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                type="text"
                placeholder={
                  searchMode === 'tokens'
                    ? "Search design tokens, colors, typography..."
                    : "Search analyzed sites and design systems..."
                }
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="h-12 pl-12 pr-24 text-base bg-background border-border focus:border-blue-500 transition-colors"
              />

              {/* Search options */}
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setCaseInsensitive(!caseInsensitive)}
                  className={`h-6 px-1 min-w-6 border ${caseInsensitive ? 'bg-muted border-border' : 'border-transparent'} text-muted-foreground`}
                  title="Case insensitive"
                >
                  <Type className="h-3 w-3" />
                </Button>
              </div>
            </div>

            {/* Add new site button */}
            <Button
              onClick={() => {
                const newUrl = prompt('Enter website URL to scan:')
                if (newUrl) handleAddSite(newUrl)
              }}
              disabled={loading}
              className="h-12 px-6 bg-blue-600 hover:bg-blue-700 text-white"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Plus className="h-4 w-4 mr-2" />
              )}
              Add Site
            </Button>
          </div>

          {/* Search mode toggle */}
          <div className="flex items-center gap-2">
            <Button
              variant={searchMode === 'tokens' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setSearchMode('tokens')}
              className="h-8"
            >
              <Hash className="h-3 w-3 mr-1" />
              Tokens
            </Button>
            <Button
              variant={searchMode === 'sites' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setSearchMode('sites')}
              className="h-8"
            >
              <Globe className="h-3 w-3 mr-1" />
              Sites
            </Button>
          </div>

          {/* Search results */}
          <div className="space-y-4">
            {/* Search stats */}
            {query && (
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>
                  {loading ? 'Searching database...' : `${searchResults.length} results found`}
                </span>
                {databaseStats.sites > 0 && (
                  <span>
                    Database: {databaseStats.sites} sites, {databaseStats.tokens} tokens
                  </span>
                )}
              </div>
            )}

            {/* Results list */}
            {loading ? (
              <div className="space-y-3">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="h-20 bg-muted rounded-lg animate-pulse" />
                ))}
              </div>
            ) : searchResults.length > 0 ? (
              <div className="space-y-3">
                {searchResults.map((result) => (
                  <div key={result.id} className="p-4 bg-card border border-border rounded-lg hover:shadow-md transition-shadow">
                    {searchMode === 'tokens' ? (
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-semibold">{result.name || 'Unnamed Token'}</h3>
                            <Badge variant="secondary">{result.category || 'token'}</Badge>
                            <span className="text-sm text-muted-foreground">{result.confidence || 80}% confidence</span>
                          </div>
                          <div className="flex items-center gap-2 mb-2">
                            {(result.category === 'color' || result.type === 'color') && result.value?.startsWith('#') && (
                              <div
                                className="w-4 h-4 rounded border border-border"
                                style={{ backgroundColor: result.value }}
                              />
                            )}
                            <code className="text-sm bg-muted px-2 py-1 rounded font-mono">{result.value || 'No value'}</code>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            From <span className="font-medium">{result.domain || result.site || 'Unknown site'}</span>
                            {result.usage && ` • Used ${result.usage} times`}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="sm" onClick={() => handleCopyToken(result.value || '')}>
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="text-xl">{getAvatarForSite(result.domain)}</span>
                            <h3 className="font-semibold text-lg">{result.domain}</h3>
                            <Badge variant="outline">{result.tokenCount || 0} tokens</Badge>
                            <span className="text-sm text-muted-foreground">{result.confidence || 80}% confidence</span>
                          </div>
                          <p className="text-muted-foreground mb-2">{result.title || result.description}</p>
                          <p className="text-xs text-muted-foreground">
                            Last scanned: {result.lastScanned ? new Date(result.lastScanned).toLocaleDateString() : 'Recently'}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="sm" asChild>
                            <Link href={`/site/${result.domain}`}>
                              <Search className="h-4 w-4" />
                            </Link>
                          </Button>
                          <Button variant="ghost" size="sm" asChild>
                            <a href={`https://${result.domain}`} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                {databaseStats.sites === 0 ? (
                  <div className="space-y-4">
                    <div className="w-16 h-16 bg-muted/50 rounded-full flex items-center justify-center mx-auto">
                      <Search className="h-8 w-8 text-muted-foreground/60" />
                    </div>
                    <div>
                      <h3 className="text-lg font-medium mb-2">No sites scanned yet</h3>
                      <p className="text-sm">
                        Add your first website to extract design tokens and start building your database.
                      </p>
                    </div>
                    <Button
                      onClick={() => {
                        const newUrl = prompt('Enter website URL to scan (e.g., stripe.com):')
                        if (newUrl) handleAddSite(newUrl)
                      }}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Scan First Website
                    </Button>
                  </div>
                ) : query ? (
                  <div className="space-y-2">
                    <p>No {searchMode} found for "{query}" in database</p>
                    <p className="text-sm">
                      Try a different search term or{' '}
                      <Button
                        variant="link"
                        className="h-auto p-0"
                        onClick={() => {
                          const newUrl = prompt('Enter website URL to scan:')
                          if (newUrl) handleAddSite(newUrl)
                        }}
                      >
                        scan a new site
                      </Button>
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <Search className="h-12 w-12 mx-auto text-muted-foreground/50" />
                    <div>
                      <h3 className="text-lg font-medium mb-2">Search Design Tokens</h3>
                      <p className="text-sm">
                        Search through {databaseStats.tokens} design tokens from {databaseStats.sites} analyzed websites.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Database analytics */}
          {databaseStats.sites > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-8 border-t">
              <div className="text-center p-4 bg-card border border-border rounded-lg">
                <div className="text-2xl font-bold">{databaseStats.sites}</div>
                <div className="text-sm text-muted-foreground">Sites Analyzed</div>
              </div>
              <div className="text-center p-4 bg-card border border-border rounded-lg">
                <div className="text-2xl font-bold">{databaseStats.tokens}</div>
                <div className="text-sm text-muted-foreground">Tokens Extracted</div>
              </div>
              <div className="text-center p-4 bg-card border border-border rounded-lg">
                <div className="text-2xl font-bold">{databaseStats.scans}</div>
                <div className="text-sm text-muted-foreground">Total Scans</div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/40 py-6 mt-12">
        <div className="max-w-6xl mx-auto px-6 flex items-center justify-between text-sm text-muted-foreground">
          <span>© 2025 ContextDS • Database-powered design token search</span>
          <div className="flex items-center gap-4">
            <Link href="/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-foreground transition-colors">Terms</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}