"use client"

import Link from "next/link"

import { useEffect, useMemo, useState, Suspense } from "react"
import { useRouter } from "next/navigation"
import {
  Palette,
  Monitor,
  Sun,
  Moon
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useRealtimeStats } from "@/hooks/use-realtime-stats"
import { useRealtimeStore } from "@/stores/realtime-store"
import { LiveActivityFeed } from "@/components/molecules/live-activity-feed"
import { RealtimeTokenPreview } from "@/components/molecules/realtime-token-preview"
import { VercelHeader } from "@/components/organisms/vercel-header"
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
    <div className="flex h-full w-full flex-col items-center justify-between overflow-hidden antialiased">
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

      {/* Home View - Minimal ContextDS */}
      <main id="main-content" className="absolute top-[64px] flex h-[calc(100dvh-64px)] w-full flex-col items-center justify-between overflow-y-auto" role="main" aria-label="Main content">
        <div className="flex min-h-full w-full shrink-0 select-none flex-col items-center justify-center px-4 py-12">

          {/* Hero Content */}
          <div className="max-w-3xl mx-auto text-center space-y-6">

            {/* Headline - SEO optimized heading hierarchy */}
            <div className="space-y-4">
              <h1 className="text-[2.5rem]/[3rem] sm:text-6xl font-bold tracking-tight text-foreground">
                Extract Design Tokens<br />from Any Website
              </h1>
              <p className="text-base sm:text-lg text-grep-9 max-w-2xl mx-auto leading-relaxed">
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

            {/* Grep.app Style Action Section */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2 pb-8">
              <button
                onClick={() => {
                  window.open('https://github.com/anthropics/claude-code#contextds-mcp-server', '_blank')
                }}
                className="group inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-grep-1 hover:bg-grep-2 border border-grep-3 hover:border-grep-4 transition-all duration-200 text-sm font-medium text-foreground"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="7,10 12,15 17,10"/>
                  <line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
                Install MCP Server
                <span className="text-xs text-grep-9 font-mono">for Claude</span>
              </button>
              <div className="text-xs text-grep-8 hidden sm:block">or</div>
              <div className="text-xs text-grep-8 font-mono">
                Extract tokens from any website instantly
              </div>
            </div>

            {/* Compact Metrics Grid - No Horizontal Scroll */}
            <div className="w-full max-w-5xl px-4">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                {/* Total Scans */}
                <div className="flex flex-col gap-3 rounded-lg py-4 px-3 sm:px-4 border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/30">
                  <div className="flex items-center justify-between">
                    <div className="text-[10px] sm:text-xs text-blue-500 font-medium uppercase tracking-wide">Scans</div>
                    <svg className="w-3 h-3 sm:w-4 sm:h-4 text-blue-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"/>
                    </svg>
                  </div>
                  <div className="flex items-end justify-between">
                    <div className="text-xl sm:text-2xl font-mono font-bold text-foreground">
                      {realtimeStats?.scans || liveMetrics?.totalScans || 102}
                    </div>
                    <div className="text-[10px] text-blue-600 dark:text-blue-400">live</div>
                  </div>
                </div>

                {/* Design Tokens */}
                <div className="flex flex-col gap-3 rounded-lg py-4 px-3 sm:px-4 border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30">
                  <div className="flex items-center justify-between">
                    <div className="text-[10px] sm:text-xs text-emerald-500 font-medium uppercase tracking-wide">Tokens</div>
                    <svg className="w-3 h-3 sm:w-4 sm:h-4 text-emerald-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path d="M16 7h6v6"/>
                      <path d="m22 7-8.5 8.5-5-5L2 17"/>
                    </svg>
                  </div>
                  <div className="flex items-end justify-between">
                    <div className="text-xl sm:text-2xl font-mono font-bold text-foreground">
                      {((realtimeStats?.tokens || liveMetrics?.totalTokens || 62300) / 1000).toFixed(1)}K
                    </div>
                    <div className="text-[10px] text-emerald-600 dark:text-emerald-400">+8%</div>
                  </div>
                </div>

                {/* Sites Analyzed */}
                <div className="flex flex-col gap-3 rounded-lg py-4 px-3 sm:px-4 border border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-950/30">
                  <div className="flex items-center justify-between">
                    <div className="text-[10px] sm:text-xs text-purple-500 font-medium uppercase tracking-wide">Sites</div>
                    <svg className="w-3 h-3 sm:w-4 sm:h-4 text-purple-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <circle cx="12" cy="12" r="10"/>
                      <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/>
                      <path d="M2 12h20"/>
                    </svg>
                  </div>
                  <div className="flex items-end justify-between">
                    <div className="text-xl sm:text-2xl font-mono font-bold text-foreground">
                      {realtimeStats?.sites || liveMetrics?.totalSites || 38}
                    </div>
                    <div className="text-[10px] text-purple-600 dark:text-purple-400">+24%</div>
                  </div>
                </div>

                {/* Active Status */}
                <div className="flex flex-col gap-3 rounded-lg py-4 px-3 sm:px-4 border border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-950/30">
                  <div className="flex items-center justify-between">
                    <div className="text-[10px] sm:text-xs text-orange-500 font-medium uppercase tracking-wide">Active</div>
                    <svg className="w-3 h-3 sm:w-4 sm:h-4 text-orange-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path d="M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.49 12H2"/>
                    </svg>
                  </div>
                  <div className="flex items-end justify-between">
                    <div className="text-xl sm:text-2xl font-mono font-bold text-foreground">
                      {liveMetrics?.activeScans || 0}
                    </div>
                    <div className="flex items-center text-[10px] text-emerald-600 dark:text-emerald-400">
                      Live
                      <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse ml-1"></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Popular Sites - Interactive Examples */}
            {popularSites.length > 0 && (
              <div className="pt-8">
                <p className="text-xs text-grep-9 uppercase tracking-wide font-semibold mb-3">Try scanning</p>
                <div className="flex items-center justify-center gap-2 flex-wrap">
                  {popularSites.slice(0, 6).map((site) => (
                    <button
                      key={site.domain}
                      onClick={() => handleScan(site.domain || '')}
                      className="group px-4 py-2 rounded-lg border border-grep-3 bg-grep-0 hover:border-foreground hover:bg-grep-1 transition-all text-sm text-foreground font-medium flex items-center gap-2"
                    >
                      <div className="w-2 h-2 rounded-full bg-grep-9 group-hover:bg-emerald-500 transition-colors" />
                      {site.domain}
                      <span className="text-xs text-grep-9">{site.tokens}</span>
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

          {/* Footer with Theme Toggle */}
          <footer className="w-full select-none border-t border-grep-2 px-4 py-6 text-sm text-grep-9 sm:px-12 sm:py-8" role="contentinfo" aria-label="Site footer">
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
                  <Link className="text-grep-9 hover:text-foreground" href="/community">Community</Link>
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
          </footer>
      </main>
    </div>
  )
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
