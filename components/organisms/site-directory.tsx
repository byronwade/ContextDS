"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { SearchForm } from "@/components/molecules/search-form"
import { StatusBadge } from "@/components/atoms/status-badge"
import { ExternalLink, Eye, Download, Code, GitCompare, X } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { Checkbox } from "@/components/ui/checkbox"

interface Site {
  id: string
  domain: string
  title?: string
  favicon?: string
  popularity: number
  lastScanned?: string
  tokenCounts: {
    colors: number
    typography: number
    spacing: number
    radius: number
    shadows: number
    motion: number
  }
  layoutDNA: {
    hasLayoutDNA: boolean
    archetypes: string[]
  }
  status: "completed" | "scanning" | "failed" | "pending"
}

interface SiteDirectoryProps {
  sites: Site[]
  loading?: boolean
  onSearch: (query: string) => void
  onFilter: (filters: any) => void
  onCompare?: (siteA: Site, siteB: Site) => void
  className?: string
}

export function SiteDirectory({
  sites,
  loading = false,
  onSearch,
  onFilter,
  onCompare,
  className
}: SiteDirectoryProps) {
  const [selectedFilters, setSelectedFilters] = useState<string[]>([])
  const [comparisonMode, setComparisonMode] = useState(false)
  const [selectedSites, setSelectedSites] = useState<Site[]>([])

  const handleFilterToggle = (filter: string) => {
    const newFilters = selectedFilters.includes(filter)
      ? selectedFilters.filter(f => f !== filter)
      : [...selectedFilters, filter]

    setSelectedFilters(newFilters)
    onFilter(newFilters)
  }

  const handleComparisonToggle = () => {
    setComparisonMode(!comparisonMode)
    setSelectedSites([])
  }

  const handleSiteSelection = (site: Site, checked: boolean) => {
    if (checked) {
      if (selectedSites.length < 2) {
        setSelectedSites([...selectedSites, site])
      }
    } else {
      setSelectedSites(selectedSites.filter(s => s.id !== site.id))
    }
  }

  const handleCompare = () => {
    if (selectedSites.length === 2 && onCompare) {
      onCompare(selectedSites[0], selectedSites[1])
    }
  }

  const filterOptions = [
    "Has Colors",
    "Has Typography",
    "Has Layout DNA",
    "Has Motion",
    "High Confidence"
  ]

  return (
    <div className={cn("space-y-6", className)}>
      {/* Search and Filters */}
      <div className="space-y-4">
        <div className="flex gap-3 items-center">
          <div className="flex-1">
            <SearchForm onSearch={onSearch} />
          </div>
          <Button
            variant={comparisonMode ? "default" : "outline"}
            onClick={handleComparisonToggle}
            className="shrink-0"
          >
            <GitCompare className="w-4 h-4 mr-2" />
            {comparisonMode ? "Exit Compare" : "Compare Sites"}
          </Button>
        </div>

        <div className="flex flex-wrap gap-2">
          {filterOptions.map((filter) => (
            <Button
              key={filter}
              variant={selectedFilters.includes(filter) ? "default" : "outline"}
              size="sm"
              onClick={() => handleFilterToggle(filter)}
            >
              {filter}
            </Button>
          ))}
        </div>
      </div>

      {/* Comparison Toolbar */}
      {comparisonMode && selectedSites.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-background border rounded-lg shadow-lg p-4 min-w-[500px]">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 flex-1">
              {selectedSites.map((site, index) => (
                <div key={site.id} className="flex items-center gap-2 px-3 py-2 bg-muted rounded-md">
                  {site.favicon && (
                    <Image src={site.favicon} alt="" width={16} height={16} className="rounded" />
                  )}
                  <span className="font-medium text-sm">{site.domain}</span>
                  <button
                    onClick={() => handleSiteSelection(site, false)}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
              {selectedSites.length < 2 && (
                <div className="text-sm text-muted-foreground">
                  Select {2 - selectedSites.length} more site{selectedSites.length === 1 ? '' : 's'}
                </div>
              )}
            </div>
            <Button
              onClick={handleCompare}
              disabled={selectedSites.length !== 2}
              size="sm"
            >
              <GitCompare className="w-4 h-4 mr-2" />
              Compare
            </Button>
          </div>
        </div>
      )}

      {/* Sites Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sites.map((site) => {
          const isSelected = selectedSites.some(s => s.id === site.id)
          const isDisabled = comparisonMode && selectedSites.length >= 2 && !isSelected

          return (
            <Card
              key={site.id}
              className={cn(
                "group hover:shadow-lg transition-all",
                comparisonMode && "cursor-pointer",
                isSelected && "ring-2 ring-primary",
                isDisabled && "opacity-50"
              )}
              onClick={() => {
                if (comparisonMode && !isDisabled) {
                  handleSiteSelection(site, !isSelected)
                }
              }}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    {comparisonMode && (
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={(checked) => handleSiteSelection(site, checked as boolean)}
                        disabled={isDisabled}
                        onClick={(e) => e.stopPropagation()}
                      />
                    )}
                    {site.favicon && (
                      <Image
                        src={site.favicon}
                        alt={`${site.domain} favicon`}
                        width={24}
                        height={24}
                        className="rounded"
                      />
                    )}
                    <div>
                      <CardTitle className="text-lg">{site.domain}</CardTitle>
                      {site.title && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {site.title}
                        </p>
                      )}
                    </div>
                  </div>
                  <StatusBadge status={site.status} />
                </div>
              </CardHeader>

            <CardContent className="space-y-4">
              {/* Token Counts */}
              <div className="grid grid-cols-3 gap-2 text-sm">
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-red-500 rounded-full" />
                  <span>{site.tokenCounts.colors} colors</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-blue-500 rounded-full" />
                  <span>{site.tokenCounts.typography} fonts</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-green-500 rounded-full" />
                  <span>{site.tokenCounts.spacing} spacing</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-purple-500 rounded-full" />
                  <span>{site.tokenCounts.radius} radius</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-gray-500 rounded-full" />
                  <span>{site.tokenCounts.shadows} shadows</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-orange-500 rounded-full" />
                  <span>{site.tokenCounts.motion} motion</span>
                </div>
              </div>

              {/* Layout DNA Badge */}
              {site.layoutDNA.hasLayoutDNA && (
                <div className="flex flex-wrap gap-1">
                  <Badge variant="outline" className="text-xs">
                    Layout DNA
                  </Badge>
                  {site.layoutDNA.archetypes.slice(0, 2).map((archetype) => (
                    <Badge key={archetype} variant="secondary" className="text-xs">
                      {archetype}
                    </Badge>
                  ))}
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                <Button variant="outline" size="sm" asChild className="flex-1">
                  <Link href={`/directory/${site.domain}`}>
                    <Eye className="w-4 h-4 mr-1" />
                    View
                  </Link>
                </Button>
                <Button variant="outline" size="sm">
                  <Download className="w-4 h-4" />
                </Button>
                <Button variant="outline" size="sm">
                  <Code className="w-4 h-4" />
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <a href={`https://${site.domain}`} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </Button>
              </div>

              {/* Popularity and Last Scan */}
              <div className="flex justify-between text-xs text-muted-foreground pt-2 border-t">
                <span>Popularity: {site.popularity}</span>
                {site.lastScanned && (
                  <span>Scanned: {new Date(site.lastScanned).toLocaleDateString()}</span>
                )}
              </div>
            </CardContent>
          </Card>
          )
        })}
      </div>

      {loading && (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      )}

      {!loading && sites.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          No sites found. Try adjusting your search or filters.
        </div>
      )}
    </div>
  )
}