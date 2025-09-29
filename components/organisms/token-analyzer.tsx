"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { TokenCard } from "@/components/molecules/token-card"
import { ConfidenceMeter } from "@/components/atoms/confidence-meter"
import { Copy, Download, Share, Code2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface Token {
  name: string
  value: string
  type: "color" | "typography" | "spacing" | "radius" | "shadow" | "motion"
  confidence: number
  usage: number
  category?: string
}

interface TokenSet {
  id: string
  version: string
  consensusScore: number
  tokens: {
    colors: Token[]
    typography: Token[]
    spacing: Token[]
    radius: Token[]
    shadows: Token[]
    motion: Token[]
  }
  metadata: {
    extractedAt: string
    cssSourceCount: number
    totalAnalyzed: number
  }
}

interface TokenAnalyzerProps {
  tokenSet: TokenSet
  layoutDNA?: any
  onExport?: (format: string) => void
  onCopyMCP?: () => void
  className?: string
}

export function TokenAnalyzer({
  tokenSet,
  layoutDNA,
  onExport,
  onCopyMCP,
  className
}: TokenAnalyzerProps) {
  const [activeTab, setActiveTab] = useState("colors")

  const categories = [
    { key: "colors", label: "Colors", count: tokenSet.tokens.colors.length },
    { key: "typography", label: "Typography", count: tokenSet.tokens.typography.length },
    { key: "spacing", label: "Spacing", count: tokenSet.tokens.spacing.length },
    { key: "radius", label: "Radius", count: tokenSet.tokens.radius.length },
    { key: "shadows", label: "Shadows", count: tokenSet.tokens.shadows.length },
    { key: "motion", label: "Motion", count: tokenSet.tokens.motion.length }
  ]

  const handleExport = (format: string) => {
    onExport?.(format)
  }

  const handleCopyToken = (value: string) => {
    navigator.clipboard.writeText(value)
    // TODO: Show toast notification
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header with metadata and actions */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle>Design Tokens v{tokenSet.version}</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Extracted from {tokenSet.metadata.cssSourceCount} CSS sources • {" "}
                {tokenSet.metadata.totalAnalyzed} total properties analyzed
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={onCopyMCP}>
                <Code2 className="w-4 h-4 mr-1" />
                Use in Claude Code
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleExport("json")}>
                <Download className="w-4 h-4 mr-1" />
                Export
              </Button>
              <Button variant="outline" size="sm">
                <Share className="w-4 h-4 mr-1" />
                Share
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium">Consensus Score</p>
              <ConfidenceMeter
                value={tokenSet.consensusScore}
                size="md"
                showLabel
              />
            </div>
            <div className="flex gap-4 text-sm">
              <div className="text-center">
                <p className="font-medium">{categories.reduce((sum, cat) => sum + cat.count, 0)}</p>
                <p className="text-muted-foreground">Total Tokens</p>
              </div>
              <div className="text-center">
                <p className="font-medium">{Math.round(tokenSet.consensusScore)}%</p>
                <p className="text-muted-foreground">Confidence</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Token Categories */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex items-center justify-between">
          <TabsList className="grid w-full grid-cols-6">
            {categories.map((category) => (
              <TabsTrigger key={category.key} value={category.key} className="relative">
                {category.label}
                {category.count > 0 && (
                  <Badge variant="secondary" className="ml-1 text-xs">
                    {category.count}
                  </Badge>
                )}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        {categories.map((category) => (
          <TabsContent key={category.key} value={category.key} className="space-y-4">
            {tokenSet.tokens[category.key as keyof typeof tokenSet.tokens].length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {tokenSet.tokens[category.key as keyof typeof tokenSet.tokens].map((token, index) => (
                  <TokenCard
                    key={`${token.name}-${index}`}
                    token={token}
                    onCopy={handleCopyToken}
                  />
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="flex items-center justify-center py-12">
                  <div className="text-center text-muted-foreground">
                    <p>No {category.label.toLowerCase()} tokens found</p>
                    <p className="text-sm mt-1">
                      This site may not use {category.label.toLowerCase()} extensively, or they may be defined in CSS-in-JS.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        ))}
      </Tabs>

      {/* Layout DNA Preview */}
      {layoutDNA && (
        <Card>
          <CardHeader>
            <CardTitle>Layout DNA</CardTitle>
            <p className="text-sm text-muted-foreground">
              Multi-page layout analysis and component archetypes
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <h4 className="font-medium mb-2">Container Patterns</h4>
                <div className="space-y-1 text-sm text-muted-foreground">
                  <p>Max width: {layoutDNA.containers?.maxWidth || "Unknown"}</p>
                  <p>Grid/Flex ratio: {layoutDNA.gridFlex?.ratio || "Unknown"}</p>
                </div>
              </div>
              <div>
                <h4 className="font-medium mb-2">Spacing Scale</h4>
                <div className="space-y-1 text-sm text-muted-foreground">
                  <p>Base: {layoutDNA.spacingScale?.base || "Unknown"}</p>
                  <p>Scale: {layoutDNA.spacingScale?.scale || "Unknown"}</p>
                </div>
              </div>
              <div>
                <h4 className="font-medium mb-2">Archetypes</h4>
                <div className="flex flex-wrap gap-1">
                  {layoutDNA.archetypes?.slice(0, 3).map((archetype: string) => (
                    <Badge key={archetype} variant="outline" className="text-xs">
                      {archetype}
                    </Badge>
                  )) || <span className="text-sm text-muted-foreground">None detected</span>}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}