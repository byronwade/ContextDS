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
  { href: "/", label: "Chat" },
  { href: "/community", label: "Library" },
  { href: "/docs", label: "Docs" },
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
  const [internalSearch, setInternalSearch] = useState("")
  const localSearchValue = onSearchChange ? searchValue : internalSearch

  useEffect(() => {
    if (!stats) loadStats()
  }, [stats, loadStats])

  const setLocalSearchValue = (value: string) => {
    if (onSearchChange) onSearchChange(value)
    else setInternalSearch(value)
  }

  const goScan = (url: string) => {
    const domain = url
      .trim()
      .replace(/^https?:\/\//, "")
      .replace(/^www\./, "")
      .split("/")[0]
    if (!domain) return
    if (onScan) onScan(domain)
    else router.push(`/?url=${encodeURIComponent(domain)}`)
    setMobileMenuOpen(false)
  }

  return (
    <header
      className={cn(
        "sticky top-0 z-50 w-full border-b border-[color:var(--soft-border)] bg-background/80 backdrop-blur-xl",
        className
      )}
      role="banner"
      aria-label="Site header"
    >
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link prefetch={false}
          href="/"
          className="group flex items-baseline gap-1 outline-offset-4 transition-opacity hover:opacity-80"
        >
          <span className="font-serif text-lg tracking-tight text-foreground sm:text-xl">
            designcontracts
          </span>
          <span className="font-mono text-[11px] text-[oklch(0.78_0.08_185)]">.sh</span>
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
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && localSearchValue.trim()) {
                  goScan(localSearchValue.trim())
                }
              }}
              className="h-9 w-full rounded-md border border-[color:var(--soft-border)] bg-card/70 px-3 text-sm outline-none transition focus:border-[oklch(0.78_0.08_185_/0.45)] focus:ring-2 focus:ring-[oklch(0.78_0.08_185_/0.2)]"
              aria-label="Enter website URL to scan"
            />
            {isScanning && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2" aria-hidden>
                <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-border border-t-[oklch(0.78_0.08_185)]" />
              </div>
            )}
          </div>
        )}

        <div className="flex items-center gap-1.5">
          <nav className="hidden items-center gap-0.5 md:flex" aria-label="Main navigation">
            {NAV.map((item) => {
              const active =
                (item.href === "/" &&
                  (currentPage === "home" ||
                    currentPage === "scan" ||
                    currentPage === "agent")) ||
                (item.href === "/community" && currentPage === "community") ||
                (item.href === "/docs" && currentPage === "docs") ||
                (item.href === "/about" && currentPage === "about")
              return (
                <Link prefetch={false}
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "rounded-md px-2.5 py-1.5 text-sm transition-colors",
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
          <nav
            className="mx-auto flex max-w-6xl flex-col gap-0.5 px-4 py-3"
            aria-label="Mobile navigation"
          >
            {NAV.map((item) => (
              <Link prefetch={false}
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-md px-3 py-2.5 text-sm text-muted-foreground transition hover:bg-secondary hover:text-foreground"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </header>
  )
}
