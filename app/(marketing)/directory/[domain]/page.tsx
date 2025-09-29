"use client"

import { useState } from "react"
import { useParams } from "next/navigation"
import { TokenAnalyzer } from "@/components/organisms/token-analyzer"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ExternalLink, Download, Share, Code2, Clock, User, Scan } from "lucide-react"
import Link from "next/link"

// Mock data for demonstration
const mockTokenSet = {
  id: "1",
  version: "1.0.0",
  consensusScore: 85.5,
  tokens: {
    colors: [
      { name: "primary", value: "#635bff", type: "color" as const, confidence: 95, usage: 142 },
      { name: "secondary", value: "#0a2540", type: "color" as const, confidence: 88, usage: 89 },
      { name: "accent", value: "#00d924", type: "color" as const, confidence: 76, usage: 34 }
    ],
    typography: [
      { name: "font-primary", value: "Inter, sans-serif", type: "typography" as const, property: "font-family" as const, confidence: 92, usage: 156 },
      { name: "text-lg", value: "18px", type: "typography" as const, property: "font-size" as const, confidence: 85, usage: 67 }
    ],
    spacing: [
      { name: "space-sm", value: "8px", type: "spacing" as const, property: "margin" as const, confidence: 89, usage: 234 },
      { name: "space-md", value: "16px", type: "spacing" as const, property: "padding" as const, confidence: 91, usage: 198 }
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
}

const mockLayoutDNA = {
  containers: { maxWidth: "1200px", responsiveStrategy: "breakpoint" as const },
  gridFlex: { gridUsage: 65, flexUsage: 35, ratio: "65/35" },
  spacingScale: { base: 8, scale: "8px system" },
  archetypes: ["marketing-hero", "feature-grid", "pricing-table"]
}

const mockSiteData = {
  domain: "stripe.com",
  title: "Stripe - Online Payment Processing",
  description: "Stripe is a financial infrastructure platform for businesses.",
  favicon: "https://stripe.com/favicon.ico",
  popularity: 95,
  lastScanned: "2024-01-15T10:30:00Z",
  status: "completed" as const,
  robotsStatus: "allowed" as const,
  submittedBy: "community",
  scanHistory: [
    { date: "2024-01-15T10:30:00Z", version: "1.0.0", changes: "Initial scan" },
    { date: "2024-01-10T14:20:00Z", version: "0.9.0", changes: "Updated color palette" }
  ]
}

export default function SiteDetailPage() {
  const params = useParams()
  const domain = params.domain as string
  const [activeTab, setActiveTab] = useState("tokens")

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

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              {mockSiteData.favicon && (
                <img
                  src={mockSiteData.favicon}
                  alt={`${mockSiteData.domain} favicon`}
                  className="w-8 h-8"
                />
              )}
              <div>
                <h1 className="text-3xl font-bold">{mockSiteData.domain}</h1>
                <p className="text-muted-foreground mt-1">{mockSiteData.title}</p>
                <div className="flex items-center gap-4 mt-2">
                  <Badge variant="secondary">
                    <Scan className="w-3 h-3 mr-1" />
                    {mockSiteData.status}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    <Clock className="w-3 h-3 inline mr-1" />
                    Updated {new Date(mockSiteData.lastScanned).toLocaleDateString()}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    <User className="w-3 h-3 inline mr-1" />
                    Submitted by {mockSiteData.submittedBy}
                  </span>
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
            <TokenAnalyzer
              tokenSet={mockTokenSet}
              layoutDNA={mockLayoutDNA}
              onExport={handleExport}
              onCopyMCP={handleCopyMCP}
            />
          </TabsContent>

          <TabsContent value="layout" className="mt-6">
            <div className="grid gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Layout DNA Analysis</CardTitle>
                  <CardDescription>
                    Multi-page layout patterns and component archetypes
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <h4 className="font-medium mb-3">Container Strategy</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>Max Width:</span>
                          <span className="font-mono">{mockLayoutDNA.containers.maxWidth}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Strategy:</span>
                          <span>{mockLayoutDNA.containers.responsiveStrategy}</span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-medium mb-3">Layout Composition</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>Grid Usage:</span>
                          <span>{mockLayoutDNA.gridFlex.gridUsage}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Flex Usage:</span>
                          <span>{mockLayoutDNA.gridFlex.flexUsage}%</span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-medium mb-3">Spacing System</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>Base Unit:</span>
                          <span className="font-mono">{mockLayoutDNA.spacingScale.base}px</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Scale:</span>
                          <span>{mockLayoutDNA.spacingScale.scale}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6">
                    <h4 className="font-medium mb-3">Detected Archetypes</h4>
                    <div className="flex flex-wrap gap-2">
                      {mockLayoutDNA.archetypes.map((archetype) => (
                        <Badge key={archetype} variant="outline">
                          {archetype}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
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
                <div className="space-y-4">
                  {mockSiteData.scanHistory.map((scan, index) => (
                    <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <div className="font-medium">Version {scan.version}</div>
                        <div className="text-sm text-muted-foreground">{scan.changes}</div>
                        <div className="text-xs text-muted-foreground mt-1">
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
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="usage" className="mt-6">
            <div className="grid gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Claude Code Integration</CardTitle>
                  <CardDescription>
                    Use these MCP tools in Claude Code to work with this site's design tokens
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium mb-2">Extract Tokens</h4>
                      <div className="bg-muted p-3 rounded-lg font-mono text-sm">
                        scan_tokens("https://{domain}")
                      </div>
                    </div>
                    <div>
                      <h4 className="font-medium mb-2">Get Cached Tokens</h4>
                      <div className="bg-muted p-3 rounded-lg font-mono text-sm">
                        get_tokens("https://{domain}")
                      </div>
                    </div>
                    <div>
                      <h4 className="font-medium mb-2">Layout Analysis</h4>
                      <div className="bg-muted p-3 rounded-lg font-mono text-sm">
                        layout_profile("https://{domain}")
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