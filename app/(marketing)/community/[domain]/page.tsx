"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { TokenAnalyzer } from "@/components/organisms/token-analyzer"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ExternalLink, Download, Share, Code2, Clock, User, Scan, ArrowLeft } from "lucide-react"

interface SiteData {
  domain: string
  title: string | null
  description: string | null
  favicon: string | null
  popularity: number
  last_scanned: string | null
  status: "completed" | "scanning" | "failed" | "pending"
  submitted_by: string | null
  tokenSet: any | null
  scanHistory: any[] | null
  layoutDNA: any | null
}

export default function CommunityDetailPage() {
  const params = useParams()
  const domain = params.domain as string
  const [activeTab, setActiveTab] = useState("tokens")
  const [siteData, setSiteData] = useState<SiteData | null>(null)
  const [loading, setLoading] = useState(true)

  // Fetch site data from API
  useEffect(() => {
    const fetchSite = async () => {
      if (!domain) return

      setLoading(true)
      try {
        const response = await fetch(`/api/community-detail/${encodeURIComponent(domain)}`)
        if (!response.ok) {
          console.error('Site API error:', response.status)
          return
        }
        const data = await response.json()
        if (data.error) {
          console.error('Site error:', data.error)
          return
        }
        setSiteData(data)
      } catch (error) {
        console.error('Failed to fetch site:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchSite()
  }, [domain])

  const handleExport = (format: string) => {
    console.log(`Exporting in ${format} format`)
    // Implement export functionality
  }

  const handleCopyMCP = () => {
    const mcpCode = `// Use in Claude Code
scan_tokens("https://${domain}")
get_tokens("https://${domain}")
layout_profile("https://${domain}")`

    navigator.clipboard.writeText(mcpCode)
    // TODO: Show toast notification
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-neutral-200 dark:border-neutral-800 border-t-blue-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-grep-9">Loading design tokens...</p>
        </div>
      </div>
    )
  }

  if (!siteData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-bold text-foreground mb-2">Site Not Found</h1>
          <p className="text-grep-9 mb-4">
            We couldn't find design tokens for {domain}
          </p>
          <Link href="/community">
            <Button>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Community
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-grep-2">
        <div className="container mx-auto px-4 py-6">
          {/* Breadcrumb */}
          <div className="mb-4">
            <nav className="flex items-center gap-2 text-sm text-grep-9">
              <Link href="/" className="hover:text-foreground">Home</Link>
              <span>/</span>
              <Link href="/community" className="hover:text-foreground">Community</Link>
              <span>/</span>
              <span className="text-foreground">{siteData.domain}</span>
            </nav>
          </div>

          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              {siteData.favicon && (
                <img
                  src={siteData.favicon}
                  alt={`${siteData.domain} favicon`}
                  className="w-12 h-12 rounded border border-grep-2"
                />
              )}
              <div>
                <h1 className="text-3xl font-bold text-foreground">{siteData.domain}</h1>
                <p className="text-grep-9 mt-1">{siteData.title || siteData.description}</p>
                <div className="flex items-center gap-4 mt-2">
                  <Badge variant="secondary">
                    <Scan className="w-3 h-3 mr-1" />
                    {siteData.status}
                  </Badge>
                  {siteData.last_scanned && (
                    <span className="text-sm text-grep-9">
                      <Clock className="w-3 h-3 inline mr-1" />
                      Updated {new Date(siteData.last_scanned).toLocaleDateString()}
                    </span>
                  )}
                  {siteData.submitted_by && (
                    <span className="text-sm text-grep-9">
                      <User className="w-3 h-3 inline mr-1" />
                      Submitted by {siteData.submitted_by}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" asChild>
                <a href={`https://${domain}`} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="w-4 h-4 mr-1" />
                  Visit Site
                </a>
              </Button>
              <Button variant="outline" size="sm">
                <Share className="w-4 h-4 mr-1" />
                Share
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="tokens">Design Tokens</TabsTrigger>
            <TabsTrigger value="layout">Layout DNA</TabsTrigger>
            <TabsTrigger value="history">Scan History</TabsTrigger>
            <TabsTrigger value="usage">Usage</TabsTrigger>
          </TabsList>

          <TabsContent value="tokens" className="mt-6">
            {siteData.tokenSet ? (
              <TokenAnalyzer
                tokenSet={siteData.tokenSet}
                layoutDNA={siteData.layoutDNA}
                onExport={handleExport}
                onCopyMCP={handleCopyMCP}
              />
            ) : (
              <Card>
                <CardContent className="pt-6">
                  <p className="text-center text-grep-9">No tokens available yet</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="layout" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Layout DNA Analysis</CardTitle>
                <CardDescription>
                  Multi-page layout patterns and component archetypes
                </CardDescription>
              </CardHeader>
              <CardContent>
                {siteData.layoutDNA ? (
                  <pre className="text-xs bg-grep-0 p-4 rounded overflow-auto">
                    {JSON.stringify(siteData.layoutDNA, null, 2)}
                  </pre>
                ) : (
                  <p className="text-center text-grep-9 py-8">
                    Layout DNA analysis not available
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Scan History</CardTitle>
                <CardDescription>
                  Track changes and updates to design tokens over time
                </CardDescription>
              </CardHeader>
              <CardContent>
                {siteData.scanHistory && siteData.scanHistory.length > 0 ? (
                  <div className="space-y-4">
                    {siteData.scanHistory.map((scan: any, index: number) => (
                      <div key={index} className="flex items-center justify-between p-4 border border-grep-2 rounded-lg">
                        <div>
                          <div className="font-medium">Version {scan.version}</div>
                          <div className="text-sm text-grep-9">{scan.changes}</div>
                          <div className="text-xs text-grep-9 mt-1">
                            {new Date(scan.date).toLocaleDateString()} at {new Date(scan.date).toLocaleTimeString()}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm">
                            <Download className="w-4 h-4 mr-1" />
                            Export
                          </Button>
                          <Button variant="outline" size="sm">
                            <Code2 className="w-4 h-4 mr-1" />
                            Compare
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-grep-9 py-8">No scan history available</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="usage" className="mt-6">
            <div className="grid gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Claude Code Integration</CardTitle>
                  <CardDescription>
                    Use these MCP tools in Claude Code to work with this site&apos;s design tokens
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium mb-2">Extract Tokens</h4>
                      <div className="bg-grep-0 p-3 rounded-lg font-mono text-sm">
                        scan_tokens(&quot;https://{domain}&quot;)
                      </div>
                    </div>
                    <div>
                      <h4 className="font-medium mb-2">Get Cached Tokens</h4>
                      <div className="bg-grep-0 p-3 rounded-lg font-mono text-sm">
                        get_tokens(&quot;https://{domain}&quot;)
                      </div>
                    </div>
                    <div>
                      <h4 className="font-medium mb-2">Layout Analysis</h4>
                      <div className="bg-grep-0 p-3 rounded-lg font-mono text-sm">
                        layout_profile(&quot;https://{domain}&quot;)
                      </div>
                    </div>
                  </div>
                  <Button onClick={handleCopyMCP} className="mt-4">
                    <Code2 className="w-4 h-4 mr-2" />
                    Copy MCP Commands
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Export Options</CardTitle>
                  <CardDescription>
                    Download tokens in various formats for your design tools
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Button variant="outline" onClick={() => handleExport("json")}>
                      JSON
                    </Button>
                    <Button variant="outline" onClick={() => handleExport("css")}>
                      CSS Variables
                    </Button>
                    <Button variant="outline" onClick={() => handleExport("tailwind")}>
                      Tailwind Config
                    </Button>
                    <Button variant="outline" onClick={() => handleExport("figma")}>
                      Figma Tokens
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}