"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import Script from "next/script"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { ArrowUp, Search, TrendingUp, Clock, Sparkles, ExternalLink, Filter, Palette, Star, Globe } from "lucide-react"
import { cn } from "@/lib/utils"
import { useVotingStore } from "@/stores/voting-store"

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

type Stats = {
  totalSites: number
  totalTokens: number
  activeScans: number
  avgConfidence: number
}

export default function CommunityPage() {
  const [sites, setSites] = useState<Site[]>([])
  const [filteredSites, setFilteredSites] = useState<Site[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [sortBy, setSortBy] = useState<SortOption>("votes")
  const [loading, setLoading] = useState(true)
  const [votingId, setVotingId] = useState<string | null>(null)
  const [stats, setStats] = useState<Stats>({
    totalSites: 0,
    totalTokens: 0,
    activeScans: 0,
    avgConfidence: 0,
  })

  // Generate structured data for SEO
  const generateStructuredData = () => {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://contextds.com'

    return {
      '@context': 'https://schema.org',
      '@graph': [
        // Main WebSite schema
        {
          '@type': 'WebSite',
          '@id': `${baseUrl}/#website`,
          url: baseUrl,
          name: 'ContextDS',
          description: 'AI-powered design token extraction and analysis platform',
          potentialAction: {
            '@type': 'SearchAction',
            target: {
              '@type': 'EntryPoint',
              urlTemplate: `${baseUrl}/community?search={search_term_string}`
            },
            'query-input': 'required name=search_term_string'
          }
        },
        // WebPage schema
        {
          '@type': 'WebPage',
          '@id': `${baseUrl}/community#webpage`,
          url: `${baseUrl}/community`,
          name: 'Design Token Community | Browse 1000+ Design Systems',
          isPartOf: { '@id': `${baseUrl}/#website` },
          about: {
            '@type': 'Thing',
            name: 'Design Tokens'
          },
          description: 'Explore design tokens from top brands. Browse 17,000+ curated design tokens including colors, typography, spacing, and shadows.',
          breadcrumb: { '@id': `${baseUrl}/community#breadcrumb` }
        },
        // BreadcrumbList schema
        {
          '@type': 'BreadcrumbList',
          '@id': `${baseUrl}/community#breadcrumb`,
          itemListElement: [
            {
              '@type': 'ListItem',
              position: 1,
              name: 'Home',
              item: baseUrl
            },
            {
              '@type': 'ListItem',
              position: 2,
              name: 'Community',
              item: `${baseUrl}/community`
            }
          ]
        },
        // ItemList schema for sites
        {
          '@type': 'ItemList',
          '@id': `${baseUrl}/community#itemlist`,
          itemListElement: filteredSites.slice(0, 100).map((site, index) => ({
            '@type': 'ListItem',
            position: index + 1,
            item: {
              '@type': 'SoftwareApplication',
              name: site.domain,
              url: `${baseUrl}/community/${site.domain}`,
              description: site.description || `Design tokens extracted from ${site.domain}`,
              applicationCategory: 'DesignApplication',
              operatingSystem: 'Web',
              aggregateRating: site.votes > 0 ? {
                '@type': 'AggregateRating',
                ratingValue: site.consensusScore / 20, // Convert to 5-star scale
                ratingCount: site.votes,
                bestRating: 5,
                worstRating: 0
              } : undefined,
              offers: {
                '@type': 'Offer',
                price: '0',
                priceCurrency: 'USD'
              }
            }
          }))
        },
        // CollectionPage schema
        {
          '@type': 'CollectionPage',
          '@id': `${baseUrl}/community#collection`,
          name: 'Design Token Directory',
          description: 'Curated collection of design token extractions from popular websites and design systems',
          numberOfItems: stats.totalSites,
          hasPart: filteredSites.slice(0, 10).map(site => ({
            '@type': 'CreativeWork',
            name: site.domain,
            url: `${baseUrl}/community/${site.domain}`,
            dateModified: site.lastScanned
          }))
        }
      ]
    }
  }

  // Voting store for client-side vote tracking
  const { hasVoted, addVote, loadVotes } = useVotingStore()

  // Load votes from localStorage on mount
  useEffect(() => {
    loadVotes()
  }, [loadVotes])

  // Load community sites and stats
  useEffect(() => {
    loadSites()
    loadStats()
  }, [sortBy])

  // Filter sites based on search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredSites(sites)
      return
    }

    const query = searchQuery.toLowerCase()
    const filtered = sites.filter(
      (site) =>
        site.domain.toLowerCase().includes(query) ||
        site.title?.toLowerCase().includes(query) ||
        site.description?.toLowerCase().includes(query)
    )
    setFilteredSites(filtered)
  }, [searchQuery, sites])

  const loadStats = async () => {
    try {
      const response = await fetch("/api/stats")
      if (response.ok) {
        const data = await response.json()
        setStats({
          totalSites: data.sites || 0,
          totalTokens: data.tokens || 0,
          activeScans: data.scans || 0,
          avgConfidence: Math.round(data.averageConfidence || 0),
        })
      }
    } catch (error) {
      console.error("Error loading stats:", error)
    }
  }

  const loadSites = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/community/sites?sort=${sortBy}`)

      if (!response.ok) {
        throw new Error("Failed to load sites")
      }

      const data = await response.json()

      // Mark sites as voted if user has already voted
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
  }

  const handleVote = async (siteId: string) => {
    // Check if already voted
    if (hasVoted(siteId)) {
      return
    }

    // Optimistic update
    setVotingId(siteId)
    addVote(siteId)

    setSites((prev) =>
      prev.map((site) =>
        site.id === siteId
          ? { ...site, votes: site.votes + 1, hasVoted: true }
          : site
      )
    )

    try {
      const response = await fetch("/api/community/vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ siteId, voteType: "upvote" }),
      })

      if (!response.ok) {
        // Revert on error
        setSites((prev) =>
          prev.map((site) =>
            site.id === siteId
              ? { ...site, votes: site.votes - 1, hasVoted: false }
              : site
          )
        )
      }
    } catch (error) {
      console.error("Error voting:", error)
      // Revert on error
      setSites((prev) =>
        prev.map((site) =>
          site.id === siteId
            ? { ...site, votes: site.votes - 1, hasVoted: false }
            : site
        )
      )
    } finally {
      setVotingId(null)
    }
  }

  const featuredSites = filteredSites.slice(0, 3)

  return (
    <>
      {/* JSON-LD Structured Data */}
      <Script
        id="community-structured-data"
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(generateStructuredData())
        }}
      />

      <div className="min-h-screen bg-background">
        {/* SEO-Optimized Header */}
        <header className="border-b border-grep-2 bg-grep-0">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
            <div className="flex-1">
              <h1 className="text-4xl font-bold text-foreground mb-2">
                Design Token Community
              </h1>
              <p className="text-lg text-grep-9 max-w-2xl">
                Explore {stats.totalSites.toLocaleString()}+ analyzed websites and vote for the best design token extractions.
                Browse {stats.totalTokens.toLocaleString()}+ design tokens from top brands and companies.
              </p>
            </div>
            <Link href="/scan">
              <Button size="lg" className="gap-2 shadow-lg">
                <Sparkles className="h-5 w-5" />
                Scan Your Site
              </Button>
            </Link>
          </div>

          {/* Stats Grid - Above the fold for SEO */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="rounded-lg border border-grep-2 bg-background p-4">
              <div className="flex items-center gap-2 mb-2">
                <Globe className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <span className="text-xs text-grep-9 uppercase font-semibold">Sites</span>
              </div>
              <div className="text-2xl font-bold text-foreground tabular-nums">
                {stats.totalSites.toLocaleString()}
              </div>
            </div>

            <div className="rounded-lg border border-grep-2 bg-background p-4">
              <div className="flex items-center gap-2 mb-2">
                <Palette className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                <span className="text-xs text-grep-9 uppercase font-semibold">Tokens</span>
              </div>
              <div className="text-2xl font-bold text-foreground tabular-nums">
                {stats.totalTokens.toLocaleString()}
              </div>
            </div>

            <div className="rounded-lg border border-grep-2 bg-background p-4">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                <span className="text-xs text-grep-9 uppercase font-semibold">Scans</span>
              </div>
              <div className="text-2xl font-bold text-foreground tabular-nums">
                {stats.activeScans}
              </div>
            </div>

            <div className="rounded-lg border border-grep-2 bg-background p-4">
              <div className="flex items-center gap-2 mb-2">
                <Star className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                <span className="text-xs text-grep-9 uppercase font-semibold">Quality</span>
              </div>
              <div className="text-2xl font-bold text-foreground tabular-nums">
                {stats.avgConfidence}%
              </div>
            </div>
          </div>

          {/* Search & Sort Controls */}
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-grep-9" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by domain, company name, or description..."
                className="pl-10 h-11"
                aria-label="Search design tokens"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant={sortBy === "votes" ? "default" : "outline"}
                onClick={() => setSortBy("votes")}
                size="default"
                className="gap-2"
                aria-label="Sort by top voted"
              >
                <TrendingUp className="h-4 w-4" />
                <span className="hidden sm:inline">Top Voted</span>
              </Button>
              <Button
                variant={sortBy === "recent" ? "default" : "outline"}
                onClick={() => setSortBy("recent")}
                size="default"
                className="gap-2"
                aria-label="Sort by recently scanned"
              >
                <Clock className="h-4 w-4" />
                <span className="hidden sm:inline">Recent</span>
              </Button>
              <Button
                variant={sortBy === "tokens" ? "default" : "outline"}
                onClick={() => setSortBy("tokens")}
                size="default"
                className="gap-2"
                aria-label="Sort by most tokens"
              >
                <Filter className="h-4 w-4" />
                <span className="hidden sm:inline">Most Tokens</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Featured Sites - SEO Rich Content */}
      {featuredSites.length > 0 && (
        <section className="border-b border-grep-2 bg-grep-0" aria-labelledby="featured-heading">
          <div className="container mx-auto px-4 py-6">
            <h2 id="featured-heading" className="text-lg font-semibold text-foreground mb-4">
              🔥 Featured Design Systems
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {featuredSites.map((site) => (
                <Link
                  key={site.id}
                  href={`/community/${site.domain}`}
                  className="group block p-4 rounded-lg border border-grep-2 bg-background hover:border-foreground transition-all"
                >
                  <div className="flex items-center gap-3 mb-2">
                    {site.favicon && (
                      <img
                        src={site.favicon}
                        alt={`${site.domain} favicon - Design system brand identity`}
                        className="w-6 h-6 rounded"
                        loading="lazy"
                        width={24}
                        height={24}
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-foreground truncate group-hover:underline">
                        {site.domain}
                      </h3>
                      <p className="text-xs text-grep-9 truncate">
                        {site.title || site.description}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-grep-9">
                    <span>{site.tokensCount} tokens</span>
                    <span>·</span>
                    <span>{site.votes} votes</span>
                    <span>·</span>
                    <span>{site.consensusScore}% quality</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Main Site Grid */}
      <main className="container mx-auto px-4 py-8">
        {/* SEO-rich heading */}
        <h2 className="text-2xl font-bold text-foreground mb-6">
          Browse All Design Token Extractions
        </h2>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" role="status" aria-label="Loading sites">
            {Array.from({ length: 9 }).map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader className="h-32 bg-grep-1" />
                <CardContent className="h-24 bg-grep-0" />
              </Card>
            ))}
          </div>
        ) : filteredSites.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-grep-9 text-lg mb-4">
              {searchQuery ? `No design systems match "${searchQuery}"` : "No sites available yet"}
            </p>
            <Link href="/scan">
              <Button size="lg">
                Be the first to scan a site
              </Button>
            </Link>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredSites.map((site) => (
                <article
                  key={site.id}
                  className="group relative overflow-hidden rounded-lg border border-grep-2 hover:border-foreground transition-all duration-200 bg-background"
                  itemScope
                  itemType="https://schema.org/SoftwareApplication"
                >
                  {/* Vote Button */}
                  <div className="absolute top-4 right-4 z-10">
                    <button
                      onClick={() => handleVote(site.id)}
                      disabled={site.hasVoted || votingId === site.id}
                      className={cn(
                        "flex flex-col items-center justify-center min-w-[52px] px-3 py-2 rounded-lg border transition-all duration-200",
                        site.hasVoted
                          ? "bg-blue-500 text-white border-blue-500 cursor-default"
                          : "bg-grep-0 text-foreground border-grep-2 hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950",
                        votingId === site.id && "opacity-50 cursor-wait"
                      )}
                      aria-label={site.hasVoted ? `Already voted for ${site.domain}` : `Vote for ${site.domain}`}
                    >
                      <ArrowUp className="h-4 w-4" aria-hidden="true" />
                      <span className="text-sm font-bold tabular-nums mt-0.5">
                        {site.votes}
                      </span>
                    </button>
                  </div>

                  <CardHeader>
                    <div className="flex items-start gap-3 pr-16">
                      {site.favicon && (
                        <img
                          src={site.favicon}
                          alt={`${site.domain} logo - ${site.tokensCount} design tokens extracted`}
                          className="w-10 h-10 rounded border border-grep-2"
                          loading="lazy"
                          width={40}
                          height={40}
                          onError={(e) => {
                            e.currentTarget.style.display = "none"
                          }}
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-lg truncate">
                          <Link
                            href={`/community/${site.domain}`}
                            className="hover:underline"
                            itemProp="name"
                          >
                            {site.domain}
                          </Link>
                        </CardTitle>
                        <CardDescription className="line-clamp-2 mt-1" itemProp="description">
                          {site.title || site.description || `Design tokens extracted from ${site.domain}`}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent>
                    <div className="space-y-3">
                      {/* Stats */}
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-4">
                          <div>
                            <span className="text-grep-9">Tokens:</span>{" "}
                            <strong className="text-foreground" itemProp="softwareVersion">
                              {site.tokensCount}
                            </strong>
                          </div>
                          <div>
                            <span className="text-grep-9">Quality:</span>{" "}
                            <strong className="text-foreground" itemProp="aggregateRating">
                              {site.consensusScore}%
                            </strong>
                          </div>
                        </div>
                      </div>

                      {/* Last Scanned */}
                      {site.lastScanned && (
                        <p className="text-xs text-grep-9">
                          <time dateTime={site.lastScanned}>
                            Scanned {new Date(site.lastScanned).toLocaleDateString()}
                          </time>
                        </p>
                      )}

                      {/* Actions */}
                      <div className="flex gap-2 pt-2">
                        <Link href={`/community/${site.domain}`} className="flex-1">
                          <Button variant="outline" size="sm" className="w-full">
                            View Design Tokens
                          </Button>
                        </Link>
                        <Button
                          variant="ghost"
                          size="sm"
                          asChild
                          className="px-3"
                          aria-label={`Visit ${site.domain}`}
                        >
                          <a
                            href={`https://${site.domain}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            itemProp="url"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </Button>
                      </div>
                    </div>
                  </CardContent>

                  {/* Popularity Badge */}
                  {site.popularity > 80 && (
                    <Badge
                      className="absolute top-4 left-4 bg-gradient-to-r from-yellow-400 to-orange-500 text-white border-0"
                    >
                      <TrendingUp className="h-3 w-3 mr-1" aria-hidden="true" />
                      Popular
                    </Badge>
                  )}
                </article>
              ))}
            </div>

            {/* Pagination/Load More */}
            {!loading && filteredSites.length > 0 && filteredSites.length % 9 === 0 && (
              <div className="text-center mt-8">
                <Button variant="outline" size="lg">
                  Load More Design Systems
                </Button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
    </>
  )
}