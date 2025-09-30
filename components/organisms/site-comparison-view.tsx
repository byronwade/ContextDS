"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Checkbox } from "@/components/ui/checkbox"
import {
  ArrowLeft,
  Download,
  Merge,
  GitCompare,
  CheckCircle2,
  Circle,
  Minus
} from "lucide-react"
import Image from "next/image"
import { cn } from "@/lib/utils"

interface Site {
  id: string
  domain: string
  title?: string
  favicon?: string
  tokenCounts: {
    colors: number
    typography: number
    spacing: number
    radius: number
    shadows: number
    motion: number
  }
}

interface Token {
  name: string
  value: string
  category: string
}

interface SiteComparisonViewProps {
  siteA: Site
  siteB: Site
  onBack: () => void
}

export function SiteComparisonView({ siteA, siteB, onBack }: SiteComparisonViewProps) {
  const [selectedCategory, setSelectedCategory] = useState("colors")
  const [selectedTokens, setSelectedTokens] = useState<Set<string>>(new Set())
  const [mergePreview, setMergePreview] = useState(false)

  // Mock token data - in real app, fetch from API
  const tokensA: Token[] = [
    { name: "primary", value: "#635BFF", category: "colors" },
    { name: "primary-hover", value: "#0A2540", category: "colors" },
    { name: "background", value: "#FFFFFF", category: "colors" },
    { name: "text", value: "#1A1A1A", category: "colors" },
    { name: "heading", value: "32px", category: "typography" },
    { name: "body", value: "16px", category: "typography" },
  ]

  const tokensB: Token[] = [
    { name: "primary", value: "#5E6AD2", category: "colors" },
    { name: "secondary", value: "#26B5CE", category: "colors" },
    { name: "background", value: "#FFFFFF", category: "colors" },
    { name: "text-dark", value: "#1A1A1A", category: "colors" },
    { name: "heading", value: "28px", category: "typography" },
    { name: "body-text", value: "14px", category: "typography" },
  ]

  const categories = [
    { id: "colors", label: "Colors", countA: 4, countB: 4 },
    { id: "typography", label: "Typography", countA: 2, countB: 2 },
    { id: "spacing", label: "Spacing", countA: 6, countB: 8 },
    { id: "radius", label: "Radius", countA: 3, countB: 2 },
    { id: "shadows", label: "Shadows", countA: 5, countB: 4 },
    { id: "motion", label: "Motion", countA: 2, countB: 3 },
  ]

  const tokenDiff = useMemo(() => {
    const filtered = {
      a: tokensA.filter(t => t.category === selectedCategory),
      b: tokensB.filter(t => t.category === selectedCategory),
    }

    const uniqueToA: Token[] = []
    const uniqueToB: Token[] = []
    const shared: Array<{ tokenA: Token; tokenB: Token; identical: boolean }> = []

    filtered.a.forEach(tokenA => {
      const matchB = filtered.b.find(tokenB =>
        tokenB.name.toLowerCase() === tokenA.name.toLowerCase() ||
        tokenB.value.toLowerCase() === tokenA.value.toLowerCase()
      )

      if (matchB) {
        shared.push({
          tokenA,
          tokenB: matchB,
          identical: tokenA.value === matchB.value
        })
      } else {
        uniqueToA.push(tokenA)
      }
    })

    filtered.b.forEach(tokenB => {
      const exists = shared.some(s => s.tokenB.name === tokenB.name)
      if (!exists) {
        uniqueToB.push(tokenB)
      }
    })

    return { uniqueToA, uniqueToB, shared }
  }, [selectedCategory, tokensA, tokensB])

  const handleTokenToggle = (tokenId: string) => {
    const newSelected = new Set(selectedTokens)
    if (newSelected.has(tokenId)) {
      newSelected.delete(tokenId)
    } else {
      newSelected.add(tokenId)
    }
    setSelectedTokens(newSelected)
  }

  const handleExport = () => {
    const merged = Array.from(selectedTokens).map(id => {
      // Implementation for export
      return id
    })

    const data = JSON.stringify(merged, null, 2)
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${siteA.domain}-vs-${siteB.domain}-tokens.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-background sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={onBack}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  {siteA.favicon && (
                    <Image src={siteA.favicon} alt="" width={20} height={20} className="rounded" />
                  )}
                  <span className="font-semibold">{siteA.domain}</span>
                </div>
                <GitCompare className="w-5 h-5 text-muted-foreground" />
                <div className="flex items-center gap-2">
                  {siteB.favicon && (
                    <Image src={siteB.favicon} alt="" width={20} height={20} className="rounded" />
                  )}
                  <span className="font-semibold">{siteB.domain}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setMergePreview(!mergePreview)}>
                <Merge className="w-4 h-4 mr-2" />
                {mergePreview ? "Hide" : "Show"} Merge Preview ({selectedTokens.size})
              </Button>
              <Button size="sm" onClick={handleExport} disabled={selectedTokens.size === 0}>
                <Download className="w-4 h-4 mr-2" />
                Export Selected
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto px-6 py-8 max-w-[1800px]">
        <div className="grid grid-cols-12 gap-6">
          {/* Category Sidebar */}
          <div className="col-span-2">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Categories</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                {categories.map(category => (
                  <button
                    key={category.id}
                    onClick={() => setSelectedCategory(category.id)}
                    className={cn(
                      "w-full text-left px-3 py-2 rounded-md text-sm transition-colors",
                      selectedCategory === category.id
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-muted"
                    )}
                  >
                    <div className="flex justify-between items-center">
                      <span className="capitalize">{category.label}</span>
                      <div className="flex gap-1 text-xs">
                        <Badge variant="secondary" className="px-1.5 py-0">
                          {category.countA}
                        </Badge>
                        <Badge variant="secondary" className="px-1.5 py-0">
                          {category.countB}
                        </Badge>
                      </div>
                    </div>
                  </button>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Comparison Grid */}
          <div className="col-span-10">
            <div className="grid grid-cols-2 gap-6">
              {/* Site A */}
              <Card>
                <CardHeader className="bg-blue-50 dark:bg-blue-950/20">
                  <div className="flex items-center gap-2">
                    {siteA.favicon && (
                      <Image src={siteA.favicon} alt="" width={20} height={20} className="rounded" />
                    )}
                    <CardTitle className="text-base">{siteA.domain}</CardTitle>
                    <Badge variant="secondary" className="ml-auto">
                      {tokenDiff.uniqueToA.length} unique
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-6 space-y-3">
                  {/* Unique to A */}
                  {tokenDiff.uniqueToA.map(token => (
                    <div
                      key={`a-${token.name}`}
                      className="flex items-start gap-3 p-3 rounded-md bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800"
                    >
                      <Checkbox
                        checked={selectedTokens.has(`a-${token.name}`)}
                        onCheckedChange={() => handleTokenToggle(`a-${token.name}`)}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm">{token.name}</div>
                        <div className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
                          <span className="font-mono">{token.value}</span>
                          {token.category === "colors" && (
                            <div
                              className="w-4 h-4 rounded border"
                              style={{ backgroundColor: token.value }}
                            />
                          )}
                        </div>
                      </div>
                      <Badge variant="outline" className="text-xs">Unique</Badge>
                    </div>
                  ))}

                  {/* Shared tokens */}
                  {tokenDiff.shared.map(({ tokenA, identical }) => (
                    <div
                      key={`shared-a-${tokenA.name}`}
                      className={cn(
                        "flex items-start gap-3 p-3 rounded-md border",
                        identical
                          ? "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800"
                          : "bg-purple-50 dark:bg-purple-950/20 border-purple-200 dark:border-purple-800"
                      )}
                    >
                      <Checkbox
                        checked={selectedTokens.has(`shared-a-${tokenA.name}`)}
                        onCheckedChange={() => handleTokenToggle(`shared-a-${tokenA.name}`)}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm">{tokenA.name}</div>
                        <div className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
                          <span className="font-mono">{tokenA.value}</span>
                          {tokenA.category === "colors" && (
                            <div
                              className="w-4 h-4 rounded border"
                              style={{ backgroundColor: tokenA.value }}
                            />
                          )}
                        </div>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {identical ? (
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                        ) : (
                          <Minus className="w-3 h-3 mr-1" />
                        )}
                        {identical ? "Match" : "Similar"}
                      </Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Site B */}
              <Card>
                <CardHeader className="bg-orange-50 dark:bg-orange-950/20">
                  <div className="flex items-center gap-2">
                    {siteB.favicon && (
                      <Image src={siteB.favicon} alt="" width={20} height={20} className="rounded" />
                    )}
                    <CardTitle className="text-base">{siteB.domain}</CardTitle>
                    <Badge variant="secondary" className="ml-auto">
                      {tokenDiff.uniqueToB.length} unique
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-6 space-y-3">
                  {/* Shared tokens */}
                  {tokenDiff.shared.map(({ tokenB, identical }) => (
                    <div
                      key={`shared-b-${tokenB.name}`}
                      className={cn(
                        "flex items-start gap-3 p-3 rounded-md border",
                        identical
                          ? "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800"
                          : "bg-purple-50 dark:bg-purple-950/20 border-purple-200 dark:border-purple-800"
                      )}
                    >
                      <Checkbox
                        checked={selectedTokens.has(`shared-b-${tokenB.name}`)}
                        onCheckedChange={() => handleTokenToggle(`shared-b-${tokenB.name}`)}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm">{tokenB.name}</div>
                        <div className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
                          <span className="font-mono">{tokenB.value}</span>
                          {tokenB.category === "colors" && (
                            <div
                              className="w-4 h-4 rounded border"
                              style={{ backgroundColor: tokenB.value }}
                            />
                          )}
                        </div>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {identical ? (
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                        ) : (
                          <Minus className="w-3 h-3 mr-1" />
                        )}
                        {identical ? "Match" : "Similar"}
                      </Badge>
                    </div>
                  ))}

                  {/* Unique to B */}
                  {tokenDiff.uniqueToB.map(token => (
                    <div
                      key={`b-${token.name}`}
                      className="flex items-start gap-3 p-3 rounded-md bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800"
                    >
                      <Checkbox
                        checked={selectedTokens.has(`b-${token.name}`)}
                        onCheckedChange={() => handleTokenToggle(`b-${token.name}`)}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm">{token.name}</div>
                        <div className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
                          <span className="font-mono">{token.value}</span>
                          {token.category === "colors" && (
                            <div
                              className="w-4 h-4 rounded border"
                              style={{ backgroundColor: token.value }}
                            />
                          )}
                        </div>
                      </div>
                      <Badge variant="outline" className="text-xs">Unique</Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>

            {/* Merge Preview */}
            {mergePreview && selectedTokens.size > 0 && (
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle className="text-base">Merge Preview</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="rounded-md bg-muted p-4 font-mono text-sm">
                    <pre>{JSON.stringify(Array.from(selectedTokens), null, 2)}</pre>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}