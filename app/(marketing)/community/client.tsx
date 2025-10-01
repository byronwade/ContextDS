"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { ArrowUp, Search, TrendingUp, Clock, Sparkles, ExternalLink, Palette, Star, Globe } from "lucide-react"
import { cn } from "@/lib/utils"
import { useVotingStore } from "@/stores/voting-store"
import { useRealtimeStore } from "@/stores/realtime-store"
import { LiveActivityFeed } from "@/components/molecules/live-activity-feed"
import { LiveMetricsDashboard } from "@/components/molecules/live-metrics-dashboard"
import { MarketingHeader } from "@/components/organisms/marketing-header"
import { MarketingFooter } from "@/components/organisms/marketing-footer"

type Site = {
  id: string
  domain: string
  title: string | null
  description: string | null
  favicon: string | null
  tokensCount: number
  popularity: number
  votes: number
  lastScanned: string | null
  consensusScore: number
  hasVoted: boolean
}

type SortOption = "votes" | "recent" | "tokens"

export default function CommunityClient() {
  const [sites, setSites] = useState<Site[]>([])
  const [filteredSites, setFilteredSites] = useState<Site[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [sortBy, setSortBy] = useState<SortOption>("votes")
  const [loading, setLoading] = useState(true)
  const [votingId, setVotingId] = useState<string | null>(null)

  const { votes, hasVoted, addVote } = useVotingStore()
  const { metrics: liveMetrics, isConnected, activities, addActivity } = useRealtimeStore()

  const loadSites = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/community/sites?sort=${sortBy}`)

      if (!response.ok) {
        throw new Error("Failed to load sites")
      }

      const data = await response.json()

      const sitesWithVoteStatus = (data.sites || []).map((site: Site) => ({
        ...site,
        hasVoted: hasVoted(site.id),
      }))

      setSites(sitesWithVoteStatus)
      setFilteredSites(sitesWithVoteStatus)
    } catch (error) {
      console.error("Error loading sites:", error)
      setSites([])
      setFilteredSites([])
    } finally {
      setLoading(false)
    }
  }, [sortBy, hasVoted])

  useEffect(() => {
    loadSites()
  }, [loadSites])

  useEffect(() => {
    if (searchQuery.trim()) {
      const filtered = sites.filter(
        (site) =>
          site.domain.toLowerCase().includes(searchQuery.toLowerCase()) ||
          site.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          site.description?.toLowerCase().includes(searchQuery.toLowerCase())
      )
      setFilteredSites(filtered)
    } else {
      setFilteredSites(sites)
    }
  }, [searchQuery, sites])

  const handleVote = async (siteId: string) => {
    if (hasVoted(siteId)) {
      return
    }

    setVotingId(siteId)

    try {
      const response = await fetch("/api/community/vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ siteId }),
      })

      if (response.ok) {
        addVote(siteId)

        // Find the site being voted on
        const votedSite = sites.find(site => site.id === siteId)

        // Add real-time activity for the vote
        if (votedSite) {
          addActivity({
            id: Math.random().toString(36).substring(7),
            type: 'user_joined' as const,
            message: `Someone voted for ${votedSite.domain}`,
            domain: votedSite.domain,
            timestamp: Date.now(),
            data: { votes: votedSite.votes + 1 }
          })
        }

        setSites((prev) =>
          prev.map((site) =>
            site.id === siteId
              ? {
                  ...site,
                  votes: site.votes + 1,
                  popularity: site.popularity + 1,
                  hasVoted: true,
                }
              : site
          )
        )
        setFilteredSites((prev) =>
          prev.map((site) =>
            site.id === siteId
              ? {
                  ...site,
                  votes: site.votes + 1,
                  popularity: site.popularity + 1,
                  hasVoted: true,
                }
              : site
          )
        )
      }
    } catch (error) {
      console.error("Error voting:", error)
    } finally {
      setVotingId(null)
    }
  }

  const formatTimeAgo = (dateString: string | null) => {
    if (!dateString) return "Never"
    const date = new Date(dateString)
    const now = new Date()
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000)

    if (seconds < 60) return "Just now"
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
    if (seconds < 2592000) return `${Math.floor(seconds / 86400)}d ago`
    return `${Math.floor(seconds / 2592000)}mo ago`
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <MarketingHeader currentPage="community" showSearch={true} />

      <main className="flex-1 w-full" id="main-content" role="main" aria-label="Community design token database">
        {/* Hero Section */}
        <div className="border-b border-grep-2 bg-gradient-to-b from-grep-0 to-background">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
            <div className="text-center max-w-3xl mx-auto">
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-4">
                Design Token Community
              </h1>
              <p className="text-base sm:text-lg text-grep-9 mb-8">
                Explore design tokens from top brands and design systems. Browse curated collections of colors, typography, spacing, and more.
              </p>

              {/* Live Community Stats */}
              {liveMetrics && (
                <div className="mb-8">
                  <LiveMetricsDashboard layout="compact" className="justify-center text-sm" />
                </div>
              )}

              {/* Search Bar */}
              <div className="relative max-w-xl mx-auto mb-8">
                <label htmlFor="community-search" className="sr-only">
                  Search sites, brands, or design systems
                </label>
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-grep-9" aria-hidden="true" />
                <Input
                  id="community-search"
                  type="search"
                  placeholder="Search sites, brands, or design systems..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-11 sm:h-12 text-sm sm:text-base bg-background border-grep-4 focus-visible:border-grep-12"
                  aria-label="Search community design tokens database"
                />
              </div>

              {/* Live Activity Feed */}
              {activities.length > 0 && (
                <div className="max-w-2xl mx-auto">
                  <LiveActivityFeed compact={true} limit={3} className="border-0 bg-transparent p-0" />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Filters & Sort */}
        <div className="border-b border-grep-2 bg-background sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 text-sm text-grep-9">
                  <Palette className="h-4 w-4" aria-hidden="true" />
                  <span className="hidden sm:inline">
                    {filteredSites.length} {filteredSites.length === 1 ? "site" : "sites"}
                  </span>
                  <span className="sm:hidden">{filteredSites.length}</span>
                </div>

                {/* Live connection indicator */}
                {isConnected && (
                  <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" aria-hidden="true" />
                    <span className="hidden md:inline">Live</span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                <span className="text-sm text-grep-9 hidden sm:inline">Sort by:</span>
                <div className="flex gap-1 bg-grep-0 rounded-lg p-1 border border-grep-2" role="tablist" aria-label="Sort options">
                  <button
                    onClick={() => setSortBy("votes")}
                    className={cn(
                      "px-3 py-1.5 text-xs sm:text-sm font-medium rounded-md transition-all",
                      sortBy === "votes"
                        ? "bg-background text-foreground shadow-sm"
                        : "text-grep-9 hover:text-foreground"
                    )}
                    role="tab"
                    aria-selected={sortBy === "votes"}
                    aria-label="Sort by popularity"
                  >
                    <TrendingUp className="h-3.5 w-3.5 sm:hidden" aria-hidden="true" />
                    <span className="hidden sm:inline">Popular</span>
                  </button>
                  <button
                    onClick={() => setSortBy("recent")}
                    className={cn(
                      "px-3 py-1.5 text-xs sm:text-sm font-medium rounded-md transition-all",
                      sortBy === "recent"
                        ? "bg-background text-foreground shadow-sm"
                        : "text-grep-9 hover:text-foreground"
                    )}
                    role="tab"
                    aria-selected={sortBy === "recent"}
                    aria-label="Sort by most recent"
                  >
                    <Clock className="h-3.5 w-3.5 sm:hidden" aria-hidden="true" />
                    <span className="hidden sm:inline">Recent</span>
                  </button>
                  <button
                    onClick={() => setSortBy("tokens")}
                    className={cn(
                      "px-3 py-1.5 text-xs sm:text-sm font-medium rounded-md transition-all",
                      sortBy === "tokens"
                        ? "bg-background text-foreground shadow-sm"
                        : "text-grep-9 hover:text-foreground"
                    )}
                    role="tab"
                    aria-selected={sortBy === "tokens"}
                    aria-label="Sort by token count"
                  >
                    <Sparkles className="h-3.5 w-3.5 sm:hidden" aria-hidden="true" />
                    <span className="hidden sm:inline">Tokens</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sites Grid */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" role="status" aria-label="Loading sites">
              {[...Array(6)].map((_, i) => (
                <Card key={i} className="p-6 border-grep-2">
                  <div className="space-y-4 animate-pulse">
                    <div className="h-4 w-3/4 bg-grep-2 rounded" />
                    <div className="h-3 w-full bg-grep-2 rounded" />
                    <div className="h-3 w-2/3 bg-grep-2 rounded" />
                  </div>
                </Card>
              ))}
            </div>
          ) : filteredSites.length === 0 ? (
            <div className="text-center py-16">
              <Globe className="h-12 w-12 text-grep-7 mx-auto mb-4" aria-hidden="true" />
              <h2 className="text-lg font-medium text-foreground mb-2">No sites found</h2>
              <p className="text-sm text-grep-9 mb-6">
                {searchQuery ? "Try adjusting your search query" : "Check back soon for new design systems"}
              </p>
              {searchQuery && (
                <Button onClick={() => setSearchQuery("")} variant="outline" size="sm">
                  Clear search
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" role="grid" aria-label="Design token sites">
              {filteredSites.map((site) => (
                <Card
                  key={site.id}
                  className="group hover:border-grep-4 transition-all duration-200 border-grep-2 overflow-hidden"
                  role="gridcell"
                >
                  <div className="p-6">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-3 mb-4">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        {site.favicon ? (
                          <img src={site.favicon} alt={`${site.domain} favicon`} className="h-8 w-8 rounded flex-shrink-0" />
                        ) : (
                          <div className="h-8 w-8 rounded bg-gradient-to-br from-blue-500 to-purple-500 flex-shrink-0" aria-hidden="true" />
                        )}
                        <div className="min-w-0 flex-1">
                          <h3 className="font-semibold text-foreground text-sm truncate">
                            {site.title || site.domain}
                          </h3>
                          <p className="text-xs text-grep-9 truncate">{site.domain}</p>
                        </div>
                      </div>

                      {/* Vote Button */}
                      <button
                        onClick={() => handleVote(site.id)}
                        disabled={site.hasVoted || votingId === site.id}
                        className={cn(
                          "flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-lg border transition-all flex-shrink-0",
                          site.hasVoted
                            ? "bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900 text-blue-600 dark:text-blue-400"
                            : "border-grep-2 hover:border-grep-4 hover:bg-grep-0 text-grep-9 hover:text-foreground"
                        )}
                        aria-label={`Vote for ${site.domain} (${site.votes} votes)`}
                        aria-pressed={site.hasVoted}
                      >
                        <ArrowUp className={cn("h-3.5 w-3.5", site.hasVoted && "fill-current")} aria-hidden="true" />
                        <span className="text-xs font-medium">{site.votes}</span>
                      </button>
                    </div>

                    {/* Description */}
                    {site.description && (
                      <p className="text-sm text-grep-9 mb-4 line-clamp-2">{site.description}</p>
                    )}

                    {/* Stats */}
                    <div className="flex items-center gap-4 mb-4 text-xs text-grep-9">
                      <div className="flex items-center gap-1.5">
                        <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>{site.tokensCount} tokens</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>{formatTimeAgo(site.lastScanned)}</span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      <Link href={`/site/${site.domain}`} className="flex-1">
                        <Button variant="outline" size="sm" className="w-full text-xs">
                          View Tokens
                        </Button>
                      </Link>
                      <Button
                        variant="ghost"
                        size="sm"
                        asChild
                        className="px-2"
                      >
                        <a
                          href={`https://${site.domain}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={`Visit ${site.domain} website`}
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>

      <MarketingFooter />
    </div>
  )
}