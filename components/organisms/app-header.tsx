"use client"

import Link from "next/link"
import { ThemeToggle } from "@/components/atoms/theme-toggle"
import { useRealtimeStore } from "@/stores/realtime-store"
import { cn } from "@/lib/utils"

interface AppHeaderProps {
  className?: string
}

export function AppHeader({ className }: AppHeaderProps) {
  const { metrics, isConnected } = useRealtimeStore()

  const formatCompact = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
    return num.toString()
  }

  return (
    <header className={cn(
      "sticky top-0 z-50 w-full border-b border-grep-2 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60",
      className
    )}>
      <div className="flex h-14 items-center px-4">
        {/* Logo */}
        <div className="mr-6">
          <Link href="/" className="flex items-center space-x-2">
            <span className="text-base font-semibold text-foreground">ContextDS</span>
            <span className="hidden xs:inline text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-900">
              Beta
            </span>
          </Link>
        </div>

        {/* Live Stats - grep.app style */}
        <div className="hidden lg:flex items-center space-x-6 text-sm text-grep-9 font-mono">
          <div className="flex items-center space-x-1">
            <span className="text-foreground font-medium">{formatCompact(metrics?.totalScans || 0)}</span>
            <span>total</span>
          </div>
          <div className="flex items-center space-x-1">
            <span className="text-foreground font-medium">{formatCompact(metrics?.totalTokens || 0)}</span>
            <span>design</span>
          </div>
          <div className="flex items-center space-x-1">
            <span className="text-foreground font-medium">{formatCompact(metrics?.totalSites || 0)}</span>
            <span>sites</span>
          </div>
          <div className="flex items-center space-x-1">
            <span className="text-foreground font-medium">{metrics?.activeScans || 0}</span>
            <span>active</span>
          </div>
          {isConnected && (
            <div className="flex items-center space-x-1">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-emerald-600 dark:text-emerald-400">Live</span>
            </div>
          )}
        </div>

        {/* Mobile stats */}
        <div className="flex lg:hidden items-center space-x-3 text-xs text-grep-9 font-mono ml-auto mr-4">
          <div className="flex items-center space-x-1">
            <span className="text-foreground font-medium">{formatCompact(metrics?.totalTokens || 0)}</span>
            <span>tokens</span>
          </div>
          {isConnected && (
            <div className="flex items-center space-x-1">
              <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-emerald-600 dark:text-emerald-400">Live</span>
            </div>
          )}
        </div>

        {/* Theme Toggle */}
        <div className="ml-auto lg:ml-6">
          <ThemeToggle />
        </div>
      </div>
    </header>
  )
}