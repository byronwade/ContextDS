"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { SearchForm } from "@/components/molecules/search-form"
import { StatusBadge } from "@/components/atoms/status-badge"
import { ExternalLink, Eye, Download, Code } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { cn } from "@/lib/utils"

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
  className?: string
}

export function SiteDirectory({
  sites,
  loading = false,
  onSearch,
  onFilter,
  className
}: SiteDirectoryProps) {
  const [selectedFilters, setSelectedFilters] = useState<string[]>([])

  const handleFilterToggle = (filter: string) => {
    const newFilters = selectedFilters.includes(filter)
      ? selectedFilters.filter(f => f !== filter)
      : [...selectedFilters, filter]

    setSelectedFilters(newFilters)
    onFilter(newFilters)
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
        <SearchForm onSearch={onSearch} />

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

      {/* Sites Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sites.map((site) => (
          <Card key={site.id} className="group hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
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
        ))}
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