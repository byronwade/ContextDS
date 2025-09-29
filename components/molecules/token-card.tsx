"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { TokenColorSwatch } from "@/components/atoms/token-color-swatch"
import { ConfidenceMeter } from "@/components/atoms/confidence-meter"
import { Copy, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface TokenCardProps {
  token: {
    name: string
    value: string
    type: "color" | "typography" | "spacing" | "radius" | "shadow" | "motion"
    confidence: number
    usage: number
  }
  showConfidence?: boolean
  onCopy?: (value: string) => void
  className?: string
}

const typeColors = {
  color: "bg-chart-1/10 text-chart-1 border-chart-1/20",
  typography: "bg-chart-2/10 text-chart-2 border-chart-2/20",
  spacing: "bg-chart-3/10 text-chart-3 border-chart-3/20",
  radius: "bg-chart-4/10 text-chart-4 border-chart-4/20",
  shadow: "bg-chart-5/10 text-chart-5 border-chart-5/20",
  motion: "bg-primary/10 text-primary border-primary/20"
}

export function TokenCard({
  token,
  showConfidence = true,
  onCopy,
  className
}: TokenCardProps) {
  const isColor = token.type === "color"

  const handleCopy = () => {
    if (onCopy) {
      onCopy(token.value)
    } else {
      navigator.clipboard.writeText(token.value)
    }
  }

  return (
    <Card className={cn("group card-interactive shadow-sm hover:shadow-md bg-card/80 backdrop-blur border-border/50", className)}>
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            {isColor && (
              <TokenColorSwatch color={token.value} size="md" className="ring-2 ring-border/20" />
            )}
            <div className="space-y-1">
              <CardTitle className="text-title">{token.name}</CardTitle>
              <Badge className={typeColors[token.type]} variant="outline">
                {token.type}
              </Badge>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopy}
            className="opacity-0 group-hover:opacity-100 transition-opacity shadow-interactive"
          >
            <Copy className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-0 space-context-md">
        <div className="space-context-sm">
          <code className="text-code bg-muted/50 px-3 py-2 rounded-lg border border-border/50 block">
            {token.value}
          </code>

          {showConfidence && (
            <div className="space-context-xs">
              <div className="flex justify-between text-caption text-muted-foreground">
                <span>Confidence</span>
                <span>{token.usage} uses</span>
              </div>
              <ConfidenceMeter value={token.confidence} size="sm" showLabel />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}