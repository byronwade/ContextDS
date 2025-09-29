"use client"

import { useParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { TokenAnalyzer } from "@/components/organisms/token-analyzer"
import { ArrowLeft, ExternalLink, Download, Share, Code, Copy } from "lucide-react"
import { useState, useEffect } from "react"

export default function SiteDetailPage() {
  const params = useParams()
  const domain = params.domain as string
  const [siteData, setSiteData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Simulate loading site data
    setTimeout(() => {
      setSiteData({
        domain,
        title: `${domain.charAt(0).toUpperCase() + domain.slice(1)} - Design System`,
        description: "Extracted design tokens and layout DNA",
        favicon: `https://${domain}/favicon.ico`,
        popularity: 95,
        lastScanned: "2024-01-15T10:30:00Z",
        tokenSet: {
          id: "1",
          version: "1.0.0",
          consensusScore: 85.5,
          tokens: {
            colors: [
              { name: "primary", value: "#635bff", type: "color" as const, confidence: 95, usage: 142 },
              { name: "secondary", value: "#0a2540", type: "color" as const, confidence: 88, usage: 89 }
            ],
            typography: [
              { name: "font-primary", value: "Inter, sans-serif", type: "typography" as const, property: "font-family" as const, confidence: 92, usage: 156 }
            ],
            spacing: [
              { name: "space-sm", value: "8px", type: "spacing" as const, property: "margin" as const, confidence: 89, usage: 234 }
            ],
            radius: [
              { name: "rounded-md", value: "6px", type: "radius" as const, confidence: 87, usage: 123 }
            ],
            shadows: [
              { name: "shadow-card", value: "0 1px 3px rgba(0,0,0,0.1)", type: "shadow" as const, confidence: 82, usage: 45 }
            ],
            motion: [
              { name: "duration-fast", value: "150ms", type: "motion" as const, property: "transition-duration" as const, confidence: 78, usage: 28 }
            ]
          },
          metadata: {
            extractedAt: "2024-01-15T10:30:00Z",
            cssSourceCount: 12,
            totalAnalyzed: 1847
          }
        },
        layoutDNA: {
          containers: { maxWidth: "1200px", responsiveStrategy: "breakpoint" as const },
          gridFlex: { gridUsage: 65, flexUsage: 35, ratio: "65/35" },
          spacingScale: { base: 8, scale: "8px system" },
          archetypes: ["marketing-hero", "feature-grid", "pricing-table"]
        }
      })
      setLoading(false)
    }, 1000)
  }, [domain])

  const handleExport = (format: string) => {
    console.log(`Exporting ${domain} tokens in ${format} format`)
  }

  const handleCopyMCP = () => {
    const mcpCode = `// Use in Claude Code
scan_tokens("https://${domain}")
get_tokens("https://${domain}")
layout_profile("https://${domain}")`

    navigator.clipboard.writeText(mcpCode)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-muted-foreground">Loading {domain}...</p>
        </div>
      </div>
    )
  }

  if (!siteData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Site not found</p>
          <Button asChild>
            <Link href="/">Back to Search</Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/40 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Search
              </Link>
            </Button>
            <div className="flex items-center gap-3">
              <img src={siteData.favicon} alt={`${domain} favicon`} className="w-6 h-6" />
              <div>
                <h1 className="font-semibold text-lg">{domain}</h1>
                <p className="text-sm text-muted-foreground">{siteData.title}</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" asChild>
              <a href={`https://${domain}`} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4 mr-1" />
                Visit Site
              </a>
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleExport("json")}>
              <Download className="h-4 w-4 mr-1" />
              Export
            </Button>
            <Button variant="outline" size="sm">
              <Share className="h-4 w-4 mr-1" />
              Share
            </Button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-6xl mx-auto px-6 py-8">
        {/* MCP Integration Card */}
        <Card className="mb-8 border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
              <Code className="h-5 w-5" />
              Use in Claude Code
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-slate-900 text-slate-100 p-4 rounded-lg font-mono text-sm mb-4">
              {`// Extract tokens from ${domain}
scan_tokens("https://${domain}")

// Get cached tokens
get_tokens("https://${domain}")

// Analyze layout patterns
layout_profile("https://${domain}")`}
            </div>
            <Button onClick={handleCopyMCP} className="bg-blue-600 hover:bg-blue-700">
              <Copy className="h-4 w-4 mr-2" />
              Copy MCP Commands
            </Button>
          </CardContent>
        </Card>

        {/* Token Analysis */}
        <TokenAnalyzer
          tokenSet={siteData.tokenSet}
          layoutDNA={siteData.layoutDNA}
          onExport={handleExport}
          onCopyMCP={handleCopyMCP}
        />
      </main>
    </div>
  )
}