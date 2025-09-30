"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import {
  Search,
  Plus,
  Palette,
  ExternalLink,
  Download,
  Copy,
  Loader2,
  Globe,
  Eye
} from "lucide-react"
import { useState, useEffect } from "react"
import { scanStorage, convertApiResultToStoredResult, getTokensForSearch, getSitesForSearch } from "@/lib/storage/scan-storage"

interface TokenSearchResult {
  id: string
  type: 'token'
  name: string
  category: string
  confidence: number
  value: string
  site: string
  usage?: number
  scannedAt?: string
}

interface SiteSearchResult {
  id: string
  type: 'site'
  domain: string
  tokensExtracted: number
  confidence: number
  title?: string
  frameworks?: string[]
  lastScanned: string
}

type SearchResult = TokenSearchResult | SiteSearchResult

export default function HomePage() {
  const [query, setQuery] = useState("")
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [searchMode, setSearchMode] = useState<'tokens' | 'sites'>('tokens')

  // Load stored data on mount
  useEffect(() => {
    if (scanStorage.isAvailable()) {
      const storedTokens = getTokensForSearch()
      const storedSites = getSitesForSearch()

      if (searchMode === 'tokens') {
        setSearchResults(storedTokens.slice(0, 50))
      } else {
        setSearchResults(storedSites.slice(0, 20))
      }
    }
  }, [searchMode])

  // Real-time search through stored data
  const handleSearch = async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      // Show all stored data when no search
      if (searchMode === 'tokens') {
        setSearchResults(getTokensForSearch().slice(0, 50))
      } else {
        setSearchResults(getSitesForSearch().slice(0, 20))
      }
      return
    }

    setLoading(true)

    try {
      if (searchMode === 'tokens') {
        const tokens = scanStorage.searchStoredTokens(searchQuery, {
          caseInsensitive: true,
          minConfidence: 70
        })
        setSearchResults(tokens)
      } else {
        const sites = getSitesForSearch().filter(site =>
          site.domain.toLowerCase().includes(searchQuery.toLowerCase()) ||
          site.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          site.frameworks?.some(fw => fw.toLowerCase().includes(searchQuery.toLowerCase()))
        )
        setSearchResults(sites)
      }

    } catch (error) {
      console.error('Search failed:', error)
      setSearchResults([])
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
  }, [query, searchMode])

  // Handle new site scanning
  const handleAddSite = async (url: string) => {
    if (!url.trim()) return

    setLoading(true)

    try {
      // Validate URL
      const parsedUrl = new URL(url.startsWith('http') ? url : `https://${url}`)

      // Check if already scanned recently
      const existing = scanStorage.getScanResult(parsedUrl.hostname)
      if (existing && new Date(existing.scannedAt).getTime() > Date.now() - 30 * 60 * 1000) {
        console.log('Using recent scan result from localStorage')
        setLoading(false)
        return
      }

      const response = await fetch('/api/scan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: parsedUrl.toString(),
          quality: 'standard',
          prettify: false
        })
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const result = await response.json()

      // Store successful scans in localStorage
      if (result.status === 'completed') {
        const storedResult = convertApiResultToStoredResult(result)
        scanStorage.storeScanResult(storedResult)

        // Refresh search results with new data
        if (searchMode === 'tokens') {
          setSearchResults(getTokensForSearch().slice(0, 50))
        } else {
          setSearchResults(getSitesForSearch().slice(0, 20))
        }

        console.log(`✅ Scan completed: ${result.summary.tokensExtracted} tokens extracted from ${result.domain}`)
      }

    } catch (error) {
      console.error('❌ Scan failed:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCopyToken = (value: string) => {
    navigator.clipboard.writeText(value)
  }

  const handleExportData = () => {
    scanStorage.downloadBackup()
  }

  // Get storage stats for display
  const storageStats = scanStorage.getStorageStats()

  return (
    <div className="min-h-screen bg-background">
      {/* Header - grep.app style */}
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
            {storageStats.totalScans > 0 && (
              <Button variant="ghost" size="sm" onClick={handleExportData}>
                <Download className="h-4 w-4 mr-1" />
                Export ({storageStats.totalScans})
              </Button>
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
                className="h-12 pl-12 text-base bg-background border-border focus:border-blue-500 transition-colors"
              />
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
              <Palette className="h-3 w-3 mr-1" />
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
            {/* Storage stats */}
            {storageStats.totalScans > 0 && (
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>
                  {loading ? 'Searching...' : `${searchResults.length} results`}
                  {searchMode === 'tokens' && ` from ${storageStats.totalScans} scanned sites`}
                </span>
                <span>
                  {storageStats.totalTokens.toLocaleString()} total tokens • {Math.round(storageStats.averageConfidence)}% avg confidence
                </span>
              </div>
            )}

            {/* Results list */}
            {searchResults.length > 0 ? (
              <div className="space-y-3">
                {searchResults.map((result) => (
                  <Card key={result.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      {result.type === 'token' ? (
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="font-semibold">{result.name}</h3>
                              <Badge variant="secondary">{result.category}</Badge>
                              <span className="text-sm text-muted-foreground">{result.confidence}% confidence</span>
                            </div>
                            <div className="flex items-center gap-2 mb-2">
                              {result.category === 'color' && (
                                <div
                                  className="w-4 h-4 rounded border border-border"
                                  style={{ backgroundColor: result.value }}
                                />
                              )}
                              <code className="text-sm bg-muted px-2 py-1 rounded font-mono">{result.value}</code>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              From <Link href={`/site/${result.site}`} className="text-blue-600 hover:underline">{result.site}</Link>
                              {result.usage && ` • Used ${result.usage} times`}
                              {result.scannedAt && ` • Scanned ${new Date(result.scannedAt).toLocaleDateString()}`}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button variant="ghost" size="sm" onClick={() => handleCopyToken(result.value)}>
                              <Copy className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="font-semibold text-lg">{result.domain}</h3>
                              <Badge variant="outline">{result.tokensExtracted} tokens</Badge>
                              <span className="text-sm text-muted-foreground">{result.confidence}% confidence</span>
                            </div>
                            <p className="text-muted-foreground mb-2">{result.title}</p>
                            <div className="flex flex-wrap gap-2 mb-2">
                              {result.frameworks?.map((framework: string) => (
                                <Badge key={framework} variant="outline" className="text-xs">
                                  {framework}
                                </Badge>
                              ))}
                            </div>
                            <p className="text-xs text-muted-foreground">
                              Last scanned: {new Date(result.lastScanned).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button variant="ghost" size="sm" asChild>
                              <Link href={`/site/${result.domain}`}>
                                <Eye className="h-4 w-4" />
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
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                {storageStats.totalScans === 0 ? (
                  <div className="space-y-4">
                    <div className="w-16 h-16 bg-muted/50 rounded-full flex items-center justify-center mx-auto">
                      <Search className="h-8 w-8 text-muted-foreground/60" />
                    </div>
                    <div>
                      <h3 className="text-lg font-medium mb-2">No scanned sites yet</h3>
                      <p className="text-sm">
                        Add your first website to extract design tokens and start building your library.
                      </p>
                    </div>
                    <Button
                      onClick={() => {
                        const newUrl = prompt('Enter website URL to scan:')
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
                    <p>No {searchMode} found for &quot;{query}&quot;</p>
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
                  <p>Loading stored data...</p>
                )}
              </div>
            )}
          </div>

          {/* Storage analytics */}
          {storageStats.totalScans > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-8 border-t">
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold">{storageStats.totalScans}</div>
                  <div className="text-sm text-muted-foreground">Sites Scanned</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold">{storageStats.totalTokens.toLocaleString()}</div>
                  <div className="text-sm text-muted-foreground">Tokens Extracted</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold">{Math.round(storageStats.averageConfidence)}%</div>
                  <div className="text-sm text-muted-foreground">Avg Confidence</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold">{Math.round(storageStats.storageSize / 1024)}KB</div>
                  <div className="text-sm text-muted-foreground">Storage Used</div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/40 py-6 mt-12">
        <div className="max-w-6xl mx-auto px-6 flex items-center justify-between text-sm text-muted-foreground">
          <span>© 2025 ContextDS</span>
          <div className="flex items-center gap-4">
            <Link href="/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-foreground transition-colors">Terms</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}