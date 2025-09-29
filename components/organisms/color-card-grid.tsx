"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Heart, MoreHorizontal, Copy, Download, Share } from "lucide-react"
import { cn } from "@/lib/utils"

interface ColorToken {
  name: string
  value: string
  confidence: number
  usage?: number
  semantic?: string
}

interface ColorCardGridProps {
  colors: ColorToken[]
  onColorSave?: (color: ColorToken) => void
  onColorCopy?: (color: ColorToken) => void
  className?: string
}

export function ColorCardGrid({
  colors,
  onColorSave,
  onColorCopy,
  className
}: ColorCardGridProps) {
  const [savedColors, setSavedColors] = useState<Set<string>>(new Set())

  const handleSaveColor = (color: ColorToken) => {
    const newSaved = new Set(savedColors)
    if (savedColors.has(color.value)) {
      newSaved.delete(color.value)
    } else {
      newSaved.add(color.value)
    }
    setSavedColors(newSaved)
    onColorSave?.(color)
  }

  const handleCopyColor = (color: ColorToken) => {
    navigator.clipboard.writeText(color.value)
    onColorCopy?.(color)
  }

  // Check if a color is light (for text contrast)
  const isLightColor = (hex: string): boolean => {
    if (!hex.startsWith('#')) return false

    const rgb = parseInt(hex.slice(1), 16)
    const r = (rgb >> 16) & 255
    const g = (rgb >> 8) & 255
    const b = rgb & 255

    // Calculate luminance
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
    return luminance > 0.5
  }

  const getColorName = (color: ColorToken): string => {
    // Use the token name or generate a semantic name
    if (color.name && color.name !== 'auto-color') {
      return color.name.replace(/[_-]/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
    }

    // Generate name from hex value and semantic info
    const hex = color.value.toUpperCase()
    const semantic = color.semantic || ''

    if (semantic === 'primary') return `Primary (${hex})`
    if (semantic === 'secondary') return `Secondary (${hex})`
    if (semantic === 'accent') return `Accent (${hex})`
    if (semantic === 'success') return `Success (${hex})`
    if (semantic === 'warning') return `Warning (${hex})`
    if (semantic === 'error') return `Error (${hex})`

    return `Color ${hex}`
  }

  return (
    <div className={cn("space-context-lg", className)}>
      {/* Grid container with responsive columns */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
        {colors.map((color, index) => {
          const isLight = isLightColor(color.value)
          const isSaved = savedColors.has(color.value)
          const colorName = getColorName(color)

          return (
            <Card
              key={`${color.value}-${index}`}
              className="group relative overflow-hidden border-border/50 bg-card/80 backdrop-blur transition-all duration-300 hover:shadow-context-lg hover:scale-[1.02] will-change-transform"
            >
              {/* Color display area */}
              <div
                className={cn(
                  "relative h-32 w-full flex items-center justify-center transition-all duration-300",
                  isLight ? "text-black" : "text-white"
                )}
                style={{ backgroundColor: color.value }}
              >
                {/* Hex value overlay */}
                <span
                  className={cn(
                    "font-mono text-sm font-medium tracking-wider opacity-0 group-hover:opacity-100 transition-opacity duration-300",
                    isLight
                      ? "bg-black/20 text-black"
                      : "bg-white/20 text-white"
                  )}
                  style={{
                    padding: '4px 8px',
                    borderRadius: '4px',
                    backdropFilter: 'blur(8px)'
                  }}
                >
                  {color.value.toUpperCase().replace('#', '')}
                </span>

                {/* Confidence badge */}
                <Badge
                  variant="secondary"
                  className={cn(
                    "absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300",
                    isLight
                      ? "bg-black/20 text-black border-black/20"
                      : "bg-white/20 text-white border-white/20"
                  )}
                >
                  {color.confidence}%
                </Badge>

                {/* Selection overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </div>

              {/* Color info section */}
              <div className="p-4 space-context-sm">
                {/* Color name */}
                <div className="space-context-xs">
                  <h3 className="text-body font-medium text-foreground truncate">
                    {colorName}
                  </h3>
                  <div className="flex items-center gap-2">
                    <code className="text-caption font-mono text-muted-foreground">
                      {color.value}
                    </code>
                    {color.usage && (
                      <span className="text-caption text-muted-foreground">
                        • {color.usage} uses
                      </span>
                    )}
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSaveColor(color)}
                      className={cn(
                        "h-8 w-8 p-0 transition-all duration-200",
                        isSaved
                          ? "text-red-500 hover:text-red-600"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                      title={isSaved ? "Remove from saved" : "Save color"}
                    >
                      <Heart className={cn("h-4 w-4", isSaved && "fill-current")} />
                    </Button>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCopyColor(color)}
                      className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground transition-colors duration-200"
                      title="Copy color value"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>

                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground transition-colors duration-200"
                      title="More options"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Semantic indicator */}
                  {color.semantic && (
                    <Badge
                      variant="outline"
                      className="text-caption capitalize"
                    >
                      {color.semantic}
                    </Badge>
                  )}
                </div>
              </div>

              {/* Hover overlay for interaction feedback */}
              <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-transparent via-transparent to-background/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </Card>
          )
        })}
      </div>

      {/* Load more functionality */}
      {colors.length > 0 && (
        <div className="flex justify-center pt-8">
          <Button
            variant="outline"
            className="shadow-context-sm hover:shadow-context-md transition-all duration-200"
          >
            Load More Colors
          </Button>
        </div>
      )}

      {/* Grid actions */}
      {savedColors.size > 0 && (
        <div className="fixed bottom-6 right-6 flex items-center gap-2 p-3 bg-card/95 backdrop-blur border border-border rounded-lg shadow-context-lg">
          <span className="text-caption text-muted-foreground">
            {savedColors.size} saved
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const savedData = colors.filter(c => savedColors.has(c.value))
              const blob = new Blob([JSON.stringify(savedData, null, 2)], { type: 'application/json' })
              const url = URL.createObjectURL(blob)
              const a = document.createElement('a')
              a.href = url
              a.download = 'saved-colors.json'
              document.body.appendChild(a)
              a.click()
              document.body.removeChild(a)
              URL.revokeObjectURL(url)
            }}
            className="h-8"
          >
            <Download className="h-3 w-3 mr-1" />
            Export
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const colorValues = Array.from(savedColors).join(', ')
              navigator.clipboard.writeText(colorValues)
            }}
            className="h-8"
          >
            <Share className="h-3 w-3 mr-1" />
            Share
          </Button>
        </div>
      )}

      {/* Empty state */}
      {colors.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <div className="w-16 h-16 bg-muted/50 rounded-full flex items-center justify-center mx-auto mb-4">
            <div className="w-8 h-8 bg-gradient-to-br from-red-500 to-orange-500 rounded" />
          </div>
          <h3 className="text-title mb-2">No Colors Found</h3>
          <p className="text-caption">
            This website may not use many colors, or they may be defined in CSS-in-JS.
          </p>
        </div>
      )}
    </div>
  )
}