"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ColorCardGrid } from "./color-card-grid"
import { Copy, Download, Share, Palette, Type, Ruler, Shadow, RotateCcw, Zap } from "lucide-react"
import { cn } from "@/lib/utils"

interface TokenData {
  colors?: Array<{
    name: string
    value: string
    confidence: number
    usage?: number
    semantic?: string
  }>
  typography?: Array<{
    name: string
    value: string
    property: string
    confidence: number
    usage?: number
  }>
  spacing?: Array<{
    name: string
    value: string
    confidence: number
    usage?: number
  }>
  radius?: Array<{
    name: string
    value: string
    confidence: number
    usage?: number
  }>
  shadows?: Array<{
    name: string
    value: string
    confidence: number
    usage?: number
  }>
  motion?: Array<{
    name: string
    value: string
    property: string
    confidence: number
    usage?: number
  }>
}

interface TokenCategoryGridProps {
  tokens: TokenData
  onTokenCopy?: (token: any) => void
  onCategoryExport?: (category: string, tokens: any[]) => void
  className?: string
}

const categoryConfig = {
  colors: {
    icon: Palette,
    label: 'Colors',
    description: 'Color palette and brand colors',
    color: 'from-red-500 to-pink-500'
  },
  typography: {
    icon: Type,
    label: 'Typography',
    description: 'Font families, sizes, and weights',
    color: 'from-blue-500 to-indigo-500'
  },
  spacing: {
    icon: Ruler,
    label: 'Spacing',
    description: 'Margins, padding, and layout spacing',
    color: 'from-green-500 to-emerald-500'
  },
  radius: {
    icon: RotateCcw,
    label: 'Border Radius',
    description: 'Corner rounding and border radius',
    color: 'from-purple-500 to-violet-500'
  },
  shadows: {
    icon: Shadow,
    label: 'Shadows',
    description: 'Drop shadows and elevation',
    color: 'from-gray-500 to-slate-500'
  },
  motion: {
    icon: Zap,
    label: 'Motion',
    description: 'Animations and transitions',
    color: 'from-orange-500 to-yellow-500'
  }
}

export function TokenCategoryGrid({
  tokens,
  onTokenCopy,
  onCategoryExport,
  className
}: TokenCategoryGridProps) {
  const [activeCategory, setActiveCategory] = useState<string>('colors')

  // Get available categories with token counts
  const availableCategories = Object.entries(categoryConfig).filter(([key]) => {
    const categoryTokens = tokens[key as keyof TokenData] || []
    return Array.isArray(categoryTokens) && categoryTokens.length > 0
  })

  const handleCopyCategory = (category: string) => {
    const categoryTokens = tokens[category as keyof TokenData] || []
    const formatted = JSON.stringify(categoryTokens, null, 2)
    navigator.clipboard.writeText(formatted)
  }

  const handleExportCategory = (category: string) => {
    const categoryTokens = tokens[category as keyof TokenData] || []
    onCategoryExport?.(category, categoryTokens)
  }

  return (
    <div className={cn("space-context-xl", className)}>
      {/* Category tabs */}
      <Tabs value={activeCategory} onValueChange={setActiveCategory}>
        <div className="flex items-center justify-between mb-6">
          <TabsList className="grid w-full max-w-2xl grid-cols-3 lg:grid-cols-6 gap-1 bg-muted/50 p-1">
            {availableCategories.map(([key, config]) => {
              const IconComponent = config.icon
              const categoryTokens = tokens[key as keyof TokenData] || []

              return (
                <TabsTrigger
                  key={key}
                  value={key}
                  className="relative flex items-center gap-2 data-[state=active]:bg-background data-[state=active]:shadow-context-sm"
                >
                  <div className={cn(
                    "w-3 h-3 rounded-full bg-gradient-to-r",
                    config.color
                  )} />
                  <span className="hidden sm:inline">{config.label}</span>
                  <Badge variant="secondary" className="text-caption ml-1">
                    {categoryTokens.length}
                  </Badge>
                </TabsTrigger>
              )
            })}
          </TabsList>

          {/* Category actions */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleCopyCategory(activeCategory)}
              className="shadow-context-sm hover:shadow-context-md"
            >
              <Copy className="h-4 w-4 mr-1" />
              Copy
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleExportCategory(activeCategory)}
              className="shadow-context-sm hover:shadow-context-md"
            >
              <Download className="h-4 w-4 mr-1" />
              Export
            </Button>
          </div>
        </div>

        {/* Category content */}
        {availableCategories.map(([key, config]) => {
          const categoryTokens = tokens[key as keyof TokenData] || []
          const IconComponent = config.icon

          return (
            <TabsContent key={key} value={key} className="space-context-lg">
              {/* Category header */}
              <div className="flex items-center gap-4 mb-6">
                <div className={cn(
                  "w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br shadow-context-md",
                  config.color
                )}>
                  <IconComponent className="h-6 w-6 text-white" />
                </div>
                <div className="flex-1">
                  <h2 className="text-headline">{config.label}</h2>
                  <p className="text-caption text-muted-foreground">{config.description}</p>
                </div>
                <div className="text-right">
                  <div className="text-title font-bold">{categoryTokens.length}</div>
                  <div className="text-caption text-muted-foreground">tokens</div>
                </div>
              </div>

              {/* Render category-specific content */}
              {key === 'colors' && (
                <ColorCardGrid
                  colors={categoryTokens}
                  onColorCopy={onTokenCopy}
                />
              )}

              {/* Typography grid */}
              {key === 'typography' && (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {categoryTokens.map((token, index) => (
                    <Card
                      key={`${token.name}-${index}`}
                      className="group p-6 card-interactive shadow-context-sm hover:shadow-context-md bg-card/80 backdrop-blur"
                    >
                      <div className="space-context-md">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="text-body font-medium">{token.name}</h3>
                            <Badge variant="outline" className="text-caption mt-1">
                              {token.property}
                            </Badge>
                          </div>
                          <Badge variant="secondary" className="text-caption">
                            {token.confidence}%
                          </Badge>
                        </div>

                        <div className="bg-muted/50 p-4 rounded-lg">
                          <div
                            className="text-body"
                            style={{
                              fontFamily: token.property === 'font-family' ? token.value : 'inherit',
                              fontSize: token.property === 'font-size' ? token.value : 'inherit',
                              fontWeight: token.property === 'font-weight' ? token.value : 'inherit'
                            }}
                          >
                            The quick brown fox jumps over the lazy dog
                          </div>
                        </div>

                        <div className="flex items-center justify-between">
                          <code className="text-caption font-mono bg-muted px-2 py-1 rounded">
                            {token.value}
                          </code>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onTokenCopy?.(token)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 p-0"
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}

              {/* Spacing grid */}
              {key === 'spacing' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {categoryTokens.map((token, index) => (
                    <Card
                      key={`${token.name}-${index}`}
                      className="group p-6 card-interactive shadow-context-sm hover:shadow-context-md bg-card/80 backdrop-blur"
                    >
                      <div className="space-context-md">
                        <div className="flex items-start justify-between">
                          <h3 className="text-body font-medium">{token.name}</h3>
                          <Badge variant="secondary" className="text-caption">
                            {token.confidence}%
                          </Badge>
                        </div>

                        {/* Visual spacing representation */}
                        <div className="bg-muted/50 p-4 rounded-lg flex items-center justify-center">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-primary rounded-full" />
                            <div
                              className="bg-border h-0.5"
                              style={{ width: token.value }}
                            />
                            <div className="w-3 h-3 bg-primary rounded-full" />
                          </div>
                        </div>

                        <div className="flex items-center justify-between">
                          <code className="text-caption font-mono bg-muted px-2 py-1 rounded">
                            {token.value}
                          </code>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onTokenCopy?.(token)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 p-0"
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}

              {/* Other token categories (radius, shadows, motion) */}
              {(key === 'radius' || key === 'shadows' || key === 'motion') && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {categoryTokens.map((token, index) => (
                    <Card
                      key={`${token.name}-${index}`}
                      className="group p-6 card-interactive shadow-context-sm hover:shadow-context-md bg-card/80 backdrop-blur"
                    >
                      <div className="space-context-md">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="text-body font-medium">{token.name}</h3>
                            {token.property && (
                              <Badge variant="outline" className="text-caption mt-1">
                                {token.property}
                              </Badge>
                            )}
                          </div>
                          <Badge variant="secondary" className="text-caption">
                            {token.confidence}%
                          </Badge>
                        </div>

                        {/* Visual preview */}
                        <div className="bg-muted/50 p-4 rounded-lg flex items-center justify-center">
                          {key === 'radius' && (
                            <div
                              className="w-16 h-16 bg-primary"
                              style={{ borderRadius: token.value }}
                            />
                          )}
                          {key === 'shadows' && (
                            <div
                              className="w-16 h-16 bg-background border border-border"
                              style={{ boxShadow: token.value }}
                            />
                          )}
                          {key === 'motion' && (
                            <div className="w-16 h-16 bg-primary rounded-lg animate-pulse" />
                          )}
                        </div>

                        <div className="flex items-center justify-between">
                          <code className="text-caption font-mono bg-muted px-2 py-1 rounded text-ellipsis overflow-hidden">
                            {token.value.length > 20 ? `${token.value.substring(0, 20)}...` : token.value}
                          </code>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onTokenCopy?.(token)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 p-0"
                            title="Copy token value"
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          )
        })}
      </Tabs>
    </div>
  )
}