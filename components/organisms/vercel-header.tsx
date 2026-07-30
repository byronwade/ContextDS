"use client"

import Link from "next/link"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Menu, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/atoms/theme-toggle"
import { useStatsStore } from "@/stores/stats-store"
import { cn } from "@/lib/utils"

interface VercelHeaderProps {
  currentPage?:
    | "home"
    | "features"
    | "pricing"
    | "docs"
    | "about"
    | "community"
    | "metrics"
    | "scan"
    | "site"
    | "contact"
    | "privacy"
    | "terms"
    | "agent"
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

const NAV = [
  { href: "/scan", label: "Scan" },
  { href: "/agent", label: "Agent" },
  { href: "/docs", label: "Docs" },
  { href: "/community", label: "Library" },
  { href: "/about", label: "About" },
]

export function VercelHeader({
  currentPage = "home",
  showSearch = false,
  searchValue = "",
  onSearchChange,
  onScan,
  isScanning = false,
  className,
}: VercelHeaderProps) {
  const router = useRouter()
  const { stats, loadStats } = useStatsStore()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [localSearchValue, setLocalSearchValue] = useState(searchValue)

  useEffect(() => {
    if (!stats) loadStats()
  }, [stats, loadStats])

  useEffect(() => {
    setLocalSearchValue(searchValue)
  }, [searchValue])

  const goScan = (url: string) => {
    const domain = url
      .trim()
      .replace(/^https?:\/\//, "")
      .replace(/^www\./, "")
      .split("/")[0]
    if (!domain) return
    if (onScan) onScan(domain)
    else router.push(`/scan?url=${encodeURIComponent(domain)}`)
    setMobileMenuOpen(false)
  }

  return (
    <header
      className={cn(
        "sticky top-0 z-50 w-full border-b border-[color:var(--soft-border)] bg-background/70 backdrop-blur-xl",
        className
      )}
      role="banner"
      aria-label="Site header"
    >
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link
          href="/"
          className="group flex items-baseline gap-1.5 outline-offset-4 transition-opacity hover:opacity-80"
        >
          <span className="font-serif text-xl tracking-tight text-foreground sm:text-2xl">
            designcontracts
          </span>
          <span className="font-mono text-xs text-teal-700/80 dark:text-teal-300/80">
            .sh
          </span>
        </Link>

        {showSearch && (
          <div className="absolute left-1/2 hidden w-full max-w-sm -translate-x-1/2 md:block">
            <label htmlFor="header-search" className="sr-only">
              Website URL to scan
            </label>
            <input
              id="header-search"
              type="search"
              placeholder="Scan a site…"
              value={localSearchValue}
              onChange={(e) => {
                setLocalSearchValue(e.target.value)
                onSearchChange?.(e.target.value)
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && localSearchValue.trim()) {
                  goScan(localSearchValue.trim())
                }
              }}
              className="h-10 w-full rounded-2xl border border-[color:var(--soft-border)] bg-card/80 px-4 text-sm shadow-[var(--soft-shadow)] outline-none transition focus:border-teal-700/30 focus:ring-2 focus:ring-teal-700/15"
              aria-label="Enter website URL to scan"
            />
            {isScanning && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2" aria-hidden>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-border border-t-teal-700" />
              </div>
            )}
          </div>
        )}

        <div className="flex items-center gap-2">
          <nav className="hidden items-center gap-1 md:flex" aria-label="Main navigation">
            {NAV.map((item) => {
              const active =
                currentPage === item.label.toLowerCase() ||
                (item.href === "/scan" && currentPage === "scan") ||
                (item.href === "/agent" && currentPage === "agent") ||
                (item.href === "/community" && currentPage === "community")
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "rounded-xl px-3 py-2 text-sm transition-colors",
                    active
                      ? "bg-secondary text-foreground"
                      : "text-muted-foreground hover:bg-secondary/70 hover:text-foreground"
                  )}
                >
                  {item.label}
                </Link>
              )
            })}
          </nav>

          <Link
            href="/scan"
            className="hidden rounded-2xl bg-primary px-3.5 py-2 text-sm font-medium text-primary-foreground shadow-[var(--soft-shadow)] transition hover:opacity-90 sm:inline-flex"
          >
            Start scan
          </Link>

          <ThemeToggle />

          <Button
            variant="ghost"
            size="icon-sm"
            className="md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="border-t border-[color:var(--soft-border)] bg-background/95 backdrop-blur-xl md:hidden">
          <nav className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-4" aria-label="Mobile navigation">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-xl px-3 py-2.5 text-sm text-muted-foreground transition hover:bg-secondary hover:text-foreground"
              >
                {item.label}
              </Link>
            ))}
            <Link
              href="/scan"
              onClick={() => setMobileMenuOpen(false)}
              className="mt-2 rounded-2xl bg-primary px-3 py-2.5 text-center text-sm font-medium text-primary-foreground"
            >
              Start scan
            </Link>
          </nav>
        </div>
      )}
    </header>
  )
}
