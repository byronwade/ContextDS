"use client"

import Link from "next/link"

import { useEffect, useMemo, useState, Suspense } from "react"
import { useRouter } from "next/navigation"
import { useRealtimeStats } from "@/hooks/use-realtime-stats"
import { useRealtimeStore } from "@/stores/realtime-store"
import { LiveActivityFeed } from "@/components/molecules/live-activity-feed"
import { RealtimeTokenPreview } from "@/components/molecules/realtime-token-preview"
import { VercelHeader } from "@/components/organisms/vercel-header"
import { MarketingFooter } from "@/components/organisms/marketing-footer"
import { useStatsStore } from "@/stores/stats-store"


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

type ViewMode = "home" | "scan"

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
  versionInfo?: {
    versionNumber: number
    isNewVersion: boolean
    previousVersionNumber?: number
    changeCount: number
    diff?: any
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
  liveMetrics?: {
    cssRules: number
    variables: number
    colors: number
    tokens: number
    qualityScore: number
  }
  layoutDNA?: Record<string, unknown>
  error?: string
}

function HomePageContent() {
  const {
    stats,
    loadStats
  } = useStatsStore()

  // Real-time stats from Neon database
  const realtimeStats = useRealtimeStats(5000)

  // Global real-time store
  const { metrics: liveMetrics, isConnected, activities } = useRealtimeStore()

  // Router for navigation
  const router = useRouter()

  // Local state for header search
  const [searchQuery, setSearchQuery] = useState("")

  // Load stats on mount
  useEffect(() => {
    loadStats()
  }, [loadStats])

  const handleScan = (domain: string) => {
    // Navigate to the site page to handle scanning
    router.push(`/site/${encodeURIComponent(domain)}`)
  }

  const handleSearchChange = (value: string) => {
    setSearchQuery(value)
  }


  const popularSites = useMemo(() => {
    if (!stats?.popularSites) return []

    // Deduplicate by domain and take first 8 unique sites
    const seen = new Set<string>()
    const uniqueSites = stats.popularSites.filter(site => {
      if (!site.domain || seen.has(site.domain)) return false
      seen.add(site.domain)
      return true
    })

    return uniqueSites.slice(0, 8)
  }, [stats])

  return (
    <div className="flex h-full w-full flex-col overflow-hidden">
      {/* Unified Vercel-Style Header with Search */}
      <VercelHeader
        currentPage="home"
        showSearch={true}
        searchValue={searchQuery}
        onSearchChange={handleSearchChange}
        onScan={handleScan}
        isScanning={false}
        recentSites={popularSites.slice(0, 5).map(site => ({
          domain: site.domain || '',
          tokens: site.tokens,
          lastScanned: site.lastScanned
        }))}
      />

      <main id="main-content" className="flex flex-1 flex-col" role="main" aria-label="Main content">
        <div className="flex w-full flex-col items-center px-4 py-16 sm:py-24">

          <div className="mx-auto max-w-3xl space-y-8 text-center">

            <div className="space-y-5">
              <div className="hero-badge mx-auto w-fit">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
                </span>
                AI-powered design token extraction
              </div>
              <h1 className="text-[2.5rem]/[3rem] font-bold tracking-tight text-foreground sm:text-6xl sm:leading-[1.1]">
                Extract design tokens
                <br />
                <span className="text-gradient-brand">from any website</span>
              </h1>
              <p className="mx-auto max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
                AI-powered CSS analysis and design token extraction. Scan sites like{" "}
                <button
                  onClick={() => handleScan('stripe.com')}
                  className="text-foreground font-medium hover:underline"
                  aria-label="Scan Stripe.com for design tokens"
                >
                  Stripe
                </button>
                ,{" "}
                <button
                  onClick={() => handleScan('linear.app')}
                  className="text-foreground font-medium hover:underline"
                  aria-label="Scan Linear.app for design tokens"
                >
                  Linear
                </button>
                , and{" "}
                <button
                  onClick={() => handleScan('github.com')}
                  className="text-foreground font-medium hover:underline"
                  aria-label="Scan GitHub.com for design tokens"
                >
                  GitHub
                </button>
                {" "}to extract colors, typography, spacing across{" "}
                <span className="text-foreground font-semibold">{(realtimeStats?.tokens || liveMetrics?.totalTokens || 62000).toLocaleString()}+ tokens</span>.
              </p>
            </div>

            {/* Live Token Preview - Compact */}
            <div className="flex items-center justify-center pt-4 pb-6">
              <RealtimeTokenPreview />
            </div>

            {/* CTA row */}
            <div className="flex flex-col items-center justify-center gap-3 pt-2 pb-4 sm:flex-row">
              <Link
                href="/scan"
                className="inline-flex h-11 items-center gap-2 rounded-lg bg-primary px-6 text-sm font-medium text-primary-foreground shadow-sm transition-all hover:bg-primary/90 hover:shadow-md"
              >
                Start scanning
              </Link>
              <a
                href="https://github.com/byronwade/ContextDS"
                target="_blank"
                rel="noopener noreferrer"
                className="surface-interactive inline-flex h-11 items-center gap-2 px-5"
              >
                Install MCP Server
                <span className="font-mono text-xs text-muted-foreground">for Claude</span>
              </a>
            </div>

            {/* Metrics */}
            <div className="w-full max-w-5xl px-0">
              <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
                {[
                  { label: "Scans", value: realtimeStats?.scans || liveMetrics?.totalScans || 102, suffix: "live", accent: "text-chart-2" },
                  { label: "Tokens", value: `${((realtimeStats?.tokens || liveMetrics?.totalTokens || 62300) / 1000).toFixed(1)}K`, suffix: "+8%", accent: "text-chart-3" },
                  { label: "Sites", value: realtimeStats?.sites || liveMetrics?.totalSites || 38, suffix: "+24%", accent: "text-chart-5" },
                  { label: "Active", value: liveMetrics?.activeScans || 0, suffix: "live", accent: "text-chart-4", pulse: true },
                ].map((stat) => (
                  <div key={stat.label} className="stat-card relative overflow-hidden">
                    <div className="stat-card-accent" />
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground sm:text-xs">
                        {stat.label}
                      </span>
                      <span className={`text-[10px] font-medium ${stat.accent}`}>{stat.suffix}</span>
                    </div>
                    <div className="flex items-end justify-between">
                      <span className="font-mono text-xl font-bold text-foreground sm:text-2xl">
                        {stat.value}
                      </span>
                      {stat.pulse && (
                        <span className="flex items-center gap-1 text-[10px] text-success">
                          Live
                          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-success" />
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Popular Sites - Interactive Examples */}
            {popularSites.length > 0 && (
              <div className="pt-6">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Try scanning
                </p>
                <div className="flex flex-wrap items-center justify-center gap-2">
                  {popularSites.slice(0, 6).map((site) => (
                    <button
                      key={site.domain}
                      type="button"
                      onClick={() => handleScan(site.domain || "")}
                      className="surface-interactive group flex items-center gap-2"
                    >
                      <span className="h-2 w-2 rounded-full bg-muted-foreground transition-colors group-hover:bg-primary" />
                      {site.domain}
                      <span className="text-xs text-muted-foreground">{site.tokens}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Live Activity Feed */}
            {activities.length > 0 && (
              <div className="pt-12 w-full max-w-2xl">
                <LiveActivityFeed compact={true} limit={5} className="border-0 bg-transparent p-0" />
              </div>
            )}
          </div>
        </div>

        <MarketingFooter />
      </main>
    </div>
  )
}


export default function HomePage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-[50vh] w-full items-center justify-center">
        <div className="space-y-4 text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-border border-t-primary" />
          <p className="text-sm text-muted-foreground">Loading ContextDS...</p>
        </div>
      </div>
    }>
      <HomePageContent />
    </Suspense>
  )
}
