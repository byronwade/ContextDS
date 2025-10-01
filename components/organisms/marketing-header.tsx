"use client"

import Link from "next/link"
import { Palette } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/atoms/theme-toggle"
import { RecentScansDropdown } from "@/components/molecules/recent-scans-dropdown"
import { RealtimeStat } from "@/components/atoms/realtime-stat"
import { useRealtimeStats } from "@/hooks/use-realtime-stats"

interface MarketingHeaderProps {
  currentPage?: "home" | "community" | "metrics" | "scan" | "site"
}

export function MarketingHeader({ currentPage = "home" }: MarketingHeaderProps) {
  const { tokens, sites, loading } = useRealtimeStats()

  return (
    <header className="flex min-h-[56px] sm:min-h-[64px] w-full shrink-0 flex-wrap items-center justify-between border-b border-grep-2 md:flex-nowrap bg-background">
      {/* Left: Brand + Live Stats */}
      <div className="flex items-center pl-3 sm:pl-4 md:pl-6 gap-2 sm:gap-4">
        <div className="flex items-center gap-2 pr-2 sm:pr-3">
          <Link className="outline-offset-4 flex items-center gap-1.5 sm:gap-2" href="/">
            <Palette className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 dark:text-blue-400" />
            <span className="text-base sm:text-lg font-semibold text-black dark:text-white">ContextDS</span>
            <span className="hidden xs:inline text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-900">
              Beta
            </span>
          </Link>
        </div>

        {/* Real-time Stats - Minimal Display */}
        <div className="hidden lg:flex items-center gap-3 border-l border-grep-2 pl-4">
          <RealtimeStat value={tokens} label="tokens" loading={loading} />
          <div className="w-px h-3 bg-grep-3" />
          <RealtimeStat value={sites} label="sites" loading={loading} />
        </div>
      </div>

      {/* Right: Navigation + Actions */}
      <div className="flex min-h-[56px] sm:min-h-[64px] select-none items-center justify-end gap-1.5 sm:gap-2 pr-2 sm:pr-4 md:pr-6">
        <Link href="/" className="hidden sm:inline-flex">
          <Button
            variant="ghost"
            size="sm"
            className={`h-7 sm:h-8 px-2 sm:px-3 text-xs font-medium ${
              currentPage === "home" ? "text-foreground" : "text-grep-9 hover:text-foreground"
            }`}
          >
            Search
          </Button>
        </Link>
        <Link href="/community" className="hidden sm:inline-flex">
          <Button
            variant="ghost"
            size="sm"
            className={`h-7 sm:h-8 px-2 sm:px-3 text-xs font-medium ${
              currentPage === "community" ? "text-foreground" : "text-grep-9 hover:text-foreground"
            }`}
          >
            Community
          </Button>
        </Link>
        <Link href="/metrics" className="hidden sm:inline-flex">
          <Button
            variant="ghost"
            size="sm"
            className={`h-7 sm:h-8 px-2 sm:px-3 text-xs font-medium ${
              currentPage === "metrics" ? "text-foreground" : "text-grep-9 hover:text-foreground"
            }`}
          >
            Metrics
          </Button>
        </Link>
        <Button variant="ghost" size="sm" className="hidden lg:inline-flex h-7 sm:h-8 px-2 sm:px-3 text-xs font-medium text-grep-9 hover:text-foreground">
          Docs
        </Button>
        <Button variant="ghost" size="sm" className="hidden lg:inline-flex h-7 sm:h-8 px-2 sm:px-3 text-xs font-medium text-grep-9 hover:text-foreground">
          API
        </Button>
        <RecentScansDropdown />
        <ThemeToggle />
      </div>
    </header>
  )
}
