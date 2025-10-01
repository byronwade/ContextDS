"use client"

import Link from "next/link"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Palette, Menu, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/atoms/theme-toggle"
import { AnimatedCounter } from "@/components/atoms/animated-counter"
import { useRealtimeStore } from "@/stores/realtime-store"
import { useStatsStore } from "@/stores/stats-store"
import { cn } from "@/lib/utils"

interface VercelHeaderProps {
  currentPage?: "home" | "features" | "pricing" | "docs" | "about" | "community" | "metrics" | "scan" | "site" | "contact"
  showSearch?: boolean
  searchValue?: string
  onSearchChange?: (value: string) => void
  onScan?: (url: string) => void
  isScanning?: boolean
  className?: string
  recentSites?: Array<{
    domain: string
    tokens: number
    lastScanned?: string
  }>
}

export function VercelHeader({
  currentPage = "home",
  showSearch = false,
  searchValue = "",
  onSearchChange,
  onScan,
  isScanning = false,
  className,
  recentSites = []
}: VercelHeaderProps) {
  const router = useRouter()
  const { metrics, isConnected } = useRealtimeStore()
  const { stats, loadStats } = useStatsStore()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  // Load stats on mount if not already loaded
  useEffect(() => {
    if (!stats) {
      loadStats()
    }
  }, [stats, loadStats])

  const formatCompact = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
    return num.toString()
  }

  const handleScan = (url: string) => {
    // Clean the URL to get just the domain
    let domain = url.trim()
    // Remove protocol if present
    domain = domain.replace(/^https?:\/\//, '')
    // Remove www. if present
    domain = domain.replace(/^www\./, '')
    // Remove trailing slash and path
    domain = domain.split('/')[0]

    // Navigate to site/[domain] route
    router.push(`/site/${encodeURIComponent(domain)}`)
    setMobileMenuOpen(false)
  }

  const [localSearchValue, setLocalSearchValue] = useState(searchValue)

  // Update local value when prop changes
  useEffect(() => {
    setLocalSearchValue(searchValue)
  }, [searchValue])

  const handleSearchChange = (value: string) => {
    setLocalSearchValue(value)
    if (onSearchChange) {
      onSearchChange(value)
    }
  }

  return (
    <header className={cn(
      "sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur-md supports-[backdrop-filter]:bg-background/80",
      className
    )} role="banner" aria-label="Site header">
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between w-full">

          {/* Left: Brand + Live Stats */}
          <div className="flex items-center gap-6">
            <Link
              href="/"
              className="flex items-center gap-2 outline-offset-4 transition-opacity hover:opacity-80"
            >
              <Palette className="h-5 w-5 text-primary" />
              <span className="text-lg font-semibold text-foreground">ContextDS</span>
              <span className="hidden xs:inline text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                Beta
              </span>
            </Link>

            {/* Live Stats - Desktop Only */}
            <div className="hidden lg:flex items-center space-x-6 text-sm text-muted-foreground font-mono border-l border-border pl-6">
              <div className="flex items-center space-x-1">
                <AnimatedCounter
                  value={(metrics?.totalTokens && metrics.totalTokens > 0) ? metrics.totalTokens : (stats?.tokens || 0)}
                  formatCompact={true}
                  className="text-foreground font-medium"
                />
                <span>tokens</span>
              </div>
              <div className="flex items-center space-x-1">
                <AnimatedCounter
                  value={(metrics?.totalSites && metrics.totalSites > 0) ? metrics.totalSites : (stats?.sites || 0)}
                  formatCompact={true}
                  className="text-foreground font-medium"
                />
                <span>sites</span>
              </div>
              {isConnected && (
                <div className="flex items-center space-x-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-emerald-500">Live</span>
                </div>
              )}
            </div>
          </div>

          {/* Center: Search Input (Desktop) - Centered, not full width */}
          {showSearch && (
            <div className="hidden md:flex absolute left-1/2 transform -translate-x-1/2">
              <div className="relative w-80">
                <label htmlFor="header-search" className="sr-only">
                  Search for website to scan for design tokens
                </label>
                <input
                  id="header-search"
                  type="search"
                  placeholder="Scan any website for design tokens..."
                  value={localSearchValue}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && localSearchValue.trim()) {
                      handleScan(localSearchValue.trim())
                    }
                  }}
                  className="w-full h-9 px-3 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                  aria-label="Enter website URL to scan for design tokens"
                  role="searchbox"
                />
                {isScanning && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2" aria-hidden="true">
                    <div className="w-4 h-4 border-2 border-border border-t-primary rounded-full animate-spin" />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Right: Navigation */}
          <div className="flex items-center gap-3">

            {/* Mobile Menu Button */}
            <Button
              variant="ghost"
              size="icon-sm"
              className="md:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle mobile menu"
            >
              {mobileMenuOpen ? (
                <X className="h-4 w-4" />
              ) : (
                <Menu className="h-4 w-4" />
              )}
            </Button>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-6" aria-label="Main navigation" role="navigation">
              <Link href="/features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Features
              </Link>
              <Link href="/community" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Community
              </Link>
              <Link href="/docs" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Docs
              </Link>
              <Link href="/pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Pricing
              </Link>
              <Link href="/about" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                About
              </Link>
            </nav>

            <div className="w-px h-4 bg-border" />
            <ThemeToggle />
          </div>
        </div>

        {/* Mobile Search */}
        {showSearch && (
          <div className="md:hidden border-t border-border px-4 py-3">
            <div className="relative w-full">
              <label htmlFor="mobile-search" className="sr-only">
                Search for website to scan for design tokens
              </label>
              <input
                id="mobile-search"
                type="search"
                placeholder="Scan any website..."
                value={localSearchValue}
                onChange={(e) => handleSearchChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && localSearchValue.trim()) {
                    handleScan(localSearchValue.trim())
                  }
                }}
                className="w-full h-9 px-3 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                aria-label="Enter website URL to scan for design tokens"
                role="searchbox"
              />
              {isScanning && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2" aria-hidden="true">
                  <div className="w-4 h-4 border-2 border-border border-t-primary rounded-full animate-spin" />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-border bg-background/95 backdrop-blur-md">
            <nav className="flex flex-col p-4 space-y-2" aria-label="Mobile navigation menu" role="navigation">

              {/* Mobile Stats */}
              <div className="flex items-center justify-between text-sm text-muted-foreground font-mono pb-4 border-b border-border">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-1">
                    <span className="text-foreground font-medium">{formatCompact((metrics?.totalTokens && metrics.totalTokens > 0) ? metrics.totalTokens : (stats?.tokens || 0))}</span>
                    <span>tokens</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <span className="text-foreground font-medium">{formatCompact((metrics?.totalSites && metrics.totalSites > 0) ? metrics.totalSites : (stats?.sites || 0))}</span>
                    <span>sites</span>
                  </div>
                </div>
                {isConnected && (
                  <div className="flex items-center space-x-1">
                    <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-emerald-500 text-xs">Live</span>
                  </div>
                )}
              </div>

              <Link
                href="/features"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors"
              >
                Features
              </Link>

              <Link
                href="/community"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors"
              >
                Community
              </Link>

              <Link
                href="/docs"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors"
              >
                Documentation
              </Link>

              <Link
                href="/pricing"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors"
              >
                Pricing
              </Link>

              <Link
                href="/about"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors"
              >
                About
              </Link>
            </nav>
          </div>
        )}
      </div>
    </header>
  )
}