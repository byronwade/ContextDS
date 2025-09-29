"use client"

import { useState, useEffect } from "react"
import { SiteDirectory } from "@/components/organisms/site-directory"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Plus, TrendingUp, Clock, Star } from "lucide-react"
import Link from "next/link"

// Mock data for demonstration
const mockSites = [
  {
    id: "1",
    domain: "stripe.com",
    title: "Stripe - Online Payment Processing",
    favicon: "https://stripe.com/favicon.ico",
    popularity: 95,
    lastScanned: "2024-01-15T10:30:00Z",
    tokenCounts: {
      colors: 24,
      typography: 12,
      spacing: 18,
      radius: 6,
      shadows: 8,
      motion: 5
    },
    layoutDNA: {
      hasLayoutDNA: true,
      archetypes: ["marketing-hero", "feature-grid", "pricing-table"]
    },
    status: "completed" as const
  },
  {
    id: "2",
    domain: "github.com",
    title: "GitHub - Where the world builds software",
    favicon: "https://github.com/favicon.ico",
    popularity: 92,
    lastScanned: "2024-01-14T15:45:00Z",
    tokenCounts: {
      colors: 18,
      typography: 14,
      spacing: 22,
      radius: 4,
      shadows: 6,
      motion: 3
    },
    layoutDNA: {
      hasLayoutDNA: true,
      archetypes: ["navigation", "doc-page"]
    },
    status: "completed" as const
  },
  {
    id: "3",
    domain: "figma.com",
    title: "Figma - The collaborative interface design tool",
    favicon: "https://figma.com/favicon.ico",
    popularity: 88,
    lastScanned: "2024-01-13T09:20:00Z",
    tokenCounts: {
      colors: 32,
      typography: 16,
      spacing: 20,
      radius: 8,
      shadows: 12,
      motion: 8
    },
    layoutDNA: {
      hasLayoutDNA: true,
      archetypes: ["marketing-hero", "feature-grid"]
    },
    status: "completed" as const
  },
  {
    id: "4",
    domain: "vercel.com",
    title: "Vercel - Develop. Preview. Ship.",
    favicon: "https://vercel.com/favicon.ico",
    popularity: 85,
    lastScanned: "2024-01-12T14:10:00Z",
    tokenCounts: {
      colors: 16,
      typography: 10,
      spacing: 14,
      radius: 5,
      shadows: 4,
      motion: 6
    },
    layoutDNA: {
      hasLayoutDNA: false,
      archetypes: []
    },
    status: "scanning" as const
  }
]

export default function DirectoryPage() {
  const [sites, setSites] = useState(mockSites)
  const [loading, setLoading] = useState(false)
  const [stats, setStats] = useState({
    totalSites: 1247,
    totalTokenSets: 3891,
    activeScans: 12
  })

  const handleSearch = (query: string) => {
    setLoading(true)
    // Simulate API call
    setTimeout(() => {
      if (query.trim()) {
        const filtered = mockSites.filter(site =>
          site.domain.toLowerCase().includes(query.toLowerCase()) ||
          site.title.toLowerCase().includes(query.toLowerCase())
        )
        setSites(filtered)
      } else {
        setSites(mockSites)
      }
      setLoading(false)
    }, 500)
  }

  const handleFilter = (filters: any) => {
    // Implement filtering logic
    console.log("Filters applied:", filters)
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Design Token Directory</h1>
              <p className="text-muted-foreground mt-2">
                Browse and explore design tokens from popular websites
              </p>
            </div>
            <Button asChild>
              <Link href="/submit">
                <Plus className="mr-2 h-4 w-4" />
                Submit Site
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Sites</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalSites.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">+12% from last month</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Token Sets</CardTitle>
              <Star className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalTokenSets.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">Across all sites</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Scans</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.activeScans}</div>
              <p className="text-xs text-muted-foreground">Currently processing</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Most Popular</CardTitle>
              <Badge variant="secondary">New</Badge>
            </CardHeader>
            <CardContent>
              <div className="text-lg font-bold">stripe.com</div>
              <p className="text-xs text-muted-foreground">24 color tokens</p>
            </CardContent>
          </Card>
        </div>

        {/* Featured Sites */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Featured This Week</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {mockSites.slice(0, 3).map((site) => (
              <Card key={site.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    {site.favicon && (
                      <img src={site.favicon} alt={`${site.domain} favicon`} className="w-6 h-6" />
                    )}
                    <div>
                      <CardTitle className="text-base">{site.domain}</CardTitle>
                      <CardDescription className="text-sm">{site.title}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between text-sm">
                    <span>{site.tokenCounts.colors} colors</span>
                    <span>{site.tokenCounts.typography} fonts</span>
                    <span>Pop: {site.popularity}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Directory */}
        <SiteDirectory
          sites={sites}
          loading={loading}
          onSearch={handleSearch}
          onFilter={handleFilter}
        />
      </main>
    </div>
  )
}