"use client"

import { Button } from "@/components/ui/button"
import { ChevronDown, Search, TrendingUp, Palette, Calendar, Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"
import { useState } from "react"

interface SearchSidebarProps {
  popularSites: Array<{ domain: string | null; tokens: number; lastScanned: string | null }>
  categoryFacets: Array<{ key: string; label: string; count: number }>
  onSiteClick: (site: string) => void
  onCategoryClick?: (category: string) => void
}

export function SearchSidebar({ popularSites, categoryFacets, onSiteClick, onCategoryClick }: SearchSidebarProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [sectionsExpanded, setSectionsExpanded] = useState({
    popular: true,
    categories: true,
    recent: false
  })

  const toggleSection = (section: keyof typeof sectionsExpanded) => {
    setSectionsExpanded(prev => ({ ...prev, [section]: !prev[section] }))
  }

  if (sidebarCollapsed) {
    return (
      <aside className="hidden lg:flex flex-col w-14 border-r border-grep-2 bg-grep-0 h-full">
        <div className="h-14 flex items-center justify-center border-b border-grep-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSidebarCollapsed(false)}
            className="h-7 w-7 p-0 hover:bg-grep-2"
          >
            <ChevronDown className="h-3.5 w-3.5 -rotate-90 text-grep-9" />
          </Button>
        </div>
      </aside>
    )
  }

  return (
    <aside className="hidden lg:flex flex-col w-56 border-r border-grep-2 bg-grep-0 h-full">
      {/* Header */}
      <div className="h-14 flex items-center justify-between px-4 border-b border-grep-3 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-2 h-2 rounded-full bg-blue-500" />
          <span className="text-[11px] font-mono font-bold text-foreground tracking-wide">SEARCH</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setSidebarCollapsed(true)}
          className="h-7 w-7 p-0 hover:bg-grep-2"
        >
          <ChevronDown className="h-3.5 w-3.5 rotate-90 text-grep-9" />
        </Button>
      </div>

      {/* Scrollable content */}
      <nav className="flex-1 overflow-y-auto py-1.5">
        {/* Popular Sites Section */}
        <div className="mb-1.5">
          <button
            onClick={() => toggleSection('popular')}
            className="w-full flex items-center justify-between px-4 py-2 text-xs font-semibold text-grep-9 hover:text-foreground uppercase tracking-wider"
          >
            <span>Popular Sites</span>
            <ChevronDown className={cn(
              "h-3 w-3 transition-transform",
              sectionsExpanded.popular ? "" : "-rotate-90"
            )} />
          </button>
          {sectionsExpanded.popular && (
            <div className="px-2 space-y-0.5">
              {popularSites.slice(0, 8).map((site) => (
                <button
                  key={site.domain}
                  onClick={() => site.domain && onSiteClick(site.domain)}
                  className="w-full flex items-center gap-3 px-3 py-2 text-[13px] font-medium transition-all rounded-md text-grep-9 hover:bg-grep-2 hover:text-foreground group"
                >
                  <div className="w-4 h-4 rounded-sm bg-gradient-to-br from-blue-500 to-purple-500 shrink-0" />
                  <span className="truncate flex-1 text-left">{site.domain}</span>
                  <span className="text-xs text-grep-7 group-hover:text-grep-9 font-mono">{site.tokens}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Categories Section */}
        <div className="mb-1.5">
          <button
            onClick={() => toggleSection('categories')}
            className="w-full flex items-center justify-between px-4 py-2 text-xs font-semibold text-grep-9 hover:text-foreground uppercase tracking-wider"
          >
            <span>Categories</span>
            <ChevronDown className={cn(
              "h-3 w-3 transition-transform",
              sectionsExpanded.categories ? "" : "-rotate-90"
            )} />
          </button>
          {sectionsExpanded.categories && (
            <div className="px-2 space-y-0.5">
              {categoryFacets.map((facet) => (
                <button
                  key={facet.key}
                  onClick={() => onCategoryClick?.(facet.key)}
                  className="w-full flex items-center gap-3 px-3 py-2 text-[13px] font-medium transition-all rounded-md text-grep-9 hover:bg-grep-2 hover:text-foreground group"
                >
                  <Palette className="h-4 w-4 shrink-0" />
                  <span className="truncate flex-1 text-left">{facet.label}</span>
                  <span className="text-xs text-grep-7 group-hover:text-grep-9 font-mono">{facet.count}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Recent Scans Section */}
        <div className="mb-1.5">
          <button
            onClick={() => toggleSection('recent')}
            className="w-full flex items-center justify-between px-4 py-2 text-xs font-semibold text-grep-9 hover:text-foreground uppercase tracking-wider"
          >
            <span>Recent Activity</span>
            <ChevronDown className={cn(
              "h-3 w-3 transition-transform",
              sectionsExpanded.recent ? "" : "-rotate-90"
            )} />
          </button>
          {sectionsExpanded.recent && (
            <div className="px-2 space-y-0.5">
              <div className="px-3 py-6 text-xs text-grep-8 text-center">
                No recent activity
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Footer Actions */}
      <div className="p-3 border-t border-grep-3 space-y-1.5 shrink-0">
        <Button
          variant="outline"
          size="sm"
          className="w-full justify-start gap-2 h-9 text-xs font-medium border-grep-3 hover:border-grep-4 hover:bg-grep-1"
        >
          <TrendingUp className="h-3.5 w-3.5" />
          View All Sites
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="w-full justify-start gap-2 h-9 text-xs font-medium border-grep-3 hover:border-grep-4 hover:bg-grep-1"
        >
          <Sparkles className="h-3.5 w-3.5" />
          Explore Tokens
        </Button>
      </div>
    </aside>
  )
}