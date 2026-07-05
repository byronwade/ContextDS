"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { toast } from "sonner"
import { TokenAnalyzer } from "@/components/organisms/token-analyzer"
import { LayoutPatternsSection } from "@/components/organisms/layout-patterns-section"
import { MarketingHeader } from "@/components/organisms/marketing-header"
import { MarketingFooter } from "@/components/organisms/marketing-footer"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  ExternalLink,
  Download,
  Share,
  Code2,
  Clock,
  User,
  Scan,
  ArrowLeft,
  Zap,
} from "lucide-react"

interface SiteData {
  domain: string
  title: string | null
  description: string | null
  favicon: string | null
  popularity: number
  last_scanned: string | null
  status: "completed" | "scanning" | "failed" | "pending" | "queued"
  submitted_by: string | null
  tokenSet: Parameters<typeof TokenAnalyzer>[0]["tokenSet"] | null
  scanHistory: Array<{
    version: number
    changes: string
    date: string
    tokenSetId?: string
  }> | null
  layoutDNA: Parameters<typeof LayoutPatternsSection>[0]["layoutDNA"] | null
}

const EXPORT_FORMATS: Record<string, string> = {
  json: "json",
  css: "css",
  tailwind: "tailwind",
  figma: "figma",
}

export default function CommunityDetailPage() {
  const params = useParams()
  const domain = params.domain as string
  const [activeTab, setActiveTab] = useState("tokens")
  const [siteData, setSiteData] = useState<SiteData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchSite = async () => {
      if (!domain) return

      setLoading(true)
      try {
        const response = await fetch(
          `/api/community-detail/${encodeURIComponent(domain)}`
        )
        if (!response.ok) {
          setSiteData(null)
          return
        }
        const data = (await response.json()) as SiteData
        setSiteData(data)
      } catch (error) {
        console.error("Failed to fetch site:", error)
        setSiteData(null)
      } finally {
        setLoading(false)
      }
    }

    void fetchSite()
  }, [domain])

  const handleExport = async (format: string) => {
    const exportFormat = EXPORT_FORMATS[format] ?? "json"

    try {
      const response = await fetch("/api/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          domain,
          format: exportFormat,
          download: true,
        }),
      })

      if (!response.ok) {
        throw new Error("Export failed")
      }

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement("a")
      anchor.href = url
      anchor.download = `${domain}-tokens.${exportFormat === "tailwind" ? "js" : exportFormat}`
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      URL.revokeObjectURL(url)
      toast.success(`Exported tokens as ${format.toUpperCase()}`)
    } catch {
      toast.error("Export failed. Try scanning this site first.")
    }
  }

  const handleShare = async () => {
    const shareUrl = `${window.location.origin}/community/${encodeURIComponent(domain)}`

    if (navigator.share) {
      try {
        await navigator.share({
          title: `${domain} design tokens`,
          text: `Design tokens for ${domain} on ContextDS`,
          url: shareUrl,
        })
        return
      } catch {
        // Fall through to clipboard copy
      }
    }

    await navigator.clipboard.writeText(shareUrl)
    toast.success("Link copied to clipboard")
  }

  const handleCopyMCP = async () => {
    const mcpCode = `// Use in Claude Code
scan_tokens("https://${domain}")
get_tokens("https://${domain}")
layout_profile("https://${domain}")`

    await navigator.clipboard.writeText(mcpCode)
    toast.success("MCP commands copied to clipboard")
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-neutral-200 border-t-blue-500 dark:border-neutral-800" />
          <p className="text-sm text-muted-foreground">Loading design tokens...</p>
        </div>
      </div>
    )
  }

  if (!siteData) {
    return (
      <>
        <MarketingHeader currentPage="community" showSearch />
        <div className="flex min-h-[60vh] items-center justify-center bg-background px-4">
          <div className="max-w-md text-center">
            <h1 className="mb-2 text-2xl font-bold text-foreground">Site Not Found</h1>
            <p className="mb-6 text-muted-foreground">
              We couldn&apos;t find design tokens for {domain}. Try scanning it first.
            </p>
            <div className="flex flex-col justify-center gap-3 sm:flex-row">
              <Button asChild>
                <Link href={`/scan?url=${encodeURIComponent(domain)}`}>
                  <Zap className="mr-2 h-4 w-4" />
                  Scan {domain}
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/community">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Community
                </Link>
              </Button>
            </div>
          </div>
        </div>
        <MarketingFooter />
      </>
    )
  }

  return (
    <>
      <MarketingHeader currentPage="community" showSearch />

      <div className="min-h-screen bg-background">
        <header className="border-b border-border">
          <div className="container mx-auto px-4 py-6">
            <nav className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
              <Link href="/" className="hover:text-foreground">
                Home
              </Link>
              <span>/</span>
              <Link href="/community" className="hover:text-foreground">
                Community
              </Link>
              <span>/</span>
              <span className="text-foreground">{siteData.domain}</span>
            </nav>

            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-4">
                {siteData.favicon && (
                  <img
                    src={siteData.favicon}
                    alt={`${siteData.domain} favicon`}
                    className="h-12 w-12 rounded border border-border"
                  />
                )}
                <div>
                  <h1 className="text-3xl font-bold text-foreground">{siteData.domain}</h1>
                  <p className="mt-1 text-muted-foreground">
                    {siteData.title || siteData.description}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-4">
                    <Badge variant="secondary">
                      <Scan className="mr-1 h-3 w-3" />
                      {siteData.status}
                    </Badge>
                    {siteData.last_scanned && (
                      <span className="text-sm text-muted-foreground">
                        <Clock className="mr-1 inline h-3 w-3" />
                        Updated {new Date(siteData.last_scanned).toLocaleDateString()}
                      </span>
                    )}
                    {siteData.submitted_by && (
                      <span className="text-sm text-muted-foreground">
                        <User className="mr-1 inline h-3 w-3" />
                        Submitted by {siteData.submitted_by}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex shrink-0 gap-2">
                <Button variant="outline" size="sm" asChild>
                  <a href={`https://${domain}`} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="mr-1 h-4 w-4" />
                    Visit Site
                  </a>
                </Button>
                <Button variant="outline" size="sm" onClick={() => void handleShare()}>
                  <Share className="mr-1 h-4 w-4" />
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
                  onCopyMCP={() => void handleCopyMCP()}
                />
              ) : (
                <Card>
                  <CardContent className="space-y-4 pt-6 text-center">
                    <p className="text-muted-foreground">No tokens available yet</p>
                    <Button asChild>
                      <Link href={`/scan?url=${encodeURIComponent(domain)}`}>
                        <Zap className="mr-2 h-4 w-4" />
                        Scan this site
                      </Link>
                    </Button>
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
                  <LayoutPatternsSection layoutDNA={siteData.layoutDNA ?? undefined} />
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
                      {siteData.scanHistory.map((scan) => (
                        <div
                          key={`${scan.version}-${scan.date}`}
                          className="flex items-center justify-between rounded-lg border border-border p-4"
                        >
                          <div>
                            <div className="font-medium">Version {scan.version}</div>
                            <div className="text-sm text-muted-foreground">{scan.changes}</div>
                            <div className="mt-1 text-xs text-muted-foreground">
                              {new Date(scan.date).toLocaleString()}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => void handleExport("json")}
                            >
                              <Download className="mr-1 h-4 w-4" />
                              Export
                            </Button>
                            <Button variant="outline" size="sm" asChild>
                              <Link href={`/site/${encodeURIComponent(domain)}`}>
                                <Code2 className="mr-1 h-4 w-4" />
                                View
                              </Link>
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="py-8 text-center text-muted-foreground">
                      No scan history available
                    </p>
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
                      Use these MCP tools in Claude Code to work with this site&apos;s design
                      tokens
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <h4 className="mb-2 font-medium">Extract Tokens</h4>
                        <div className="rounded-lg bg-muted p-3 font-mono text-sm">
                          scan_tokens(&quot;https://{domain}&quot;)
                        </div>
                      </div>
                      <div>
                        <h4 className="mb-2 font-medium">Get Cached Tokens</h4>
                        <div className="rounded-lg bg-muted p-3 font-mono text-sm">
                          get_tokens(&quot;https://{domain}&quot;)
                        </div>
                      </div>
                      <div>
                        <h4 className="mb-2 font-medium">Layout Analysis</h4>
                        <div className="rounded-lg bg-muted p-3 font-mono text-sm">
                          layout_profile(&quot;https://{domain}&quot;)
                        </div>
                      </div>
                    </div>
                    <Button onClick={() => void handleCopyMCP()} className="mt-4">
                      <Code2 className="mr-2 h-4 w-4" />
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
                    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                      <Button variant="outline" onClick={() => void handleExport("json")}>
                        JSON
                      </Button>
                      <Button variant="outline" onClick={() => void handleExport("css")}>
                        CSS Variables
                      </Button>
                      <Button variant="outline" onClick={() => void handleExport("tailwind")}>
                        Tailwind Config
                      </Button>
                      <Button variant="outline" onClick={() => void handleExport("figma")}>
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

      <MarketingFooter />
    </>
  )
}
