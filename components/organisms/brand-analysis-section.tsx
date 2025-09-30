"use client"

import { Box, Palette, TrendingUp } from "lucide-react"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"

interface BrandAnalysis {
  primaryColor?: string
  secondaryColors?: string[]
  colorScheme?: string
  mood?: string
  industry?: string
  confidence?: number
}

interface BrandAnalysisSectionProps {
  brandAnalysis?: BrandAnalysis
}

export function BrandAnalysisSection({ brandAnalysis }: BrandAnalysisSectionProps) {
  if (!brandAnalysis || Object.keys(brandAnalysis).length === 0) {
    return (
      <div className="rounded-lg border border-grep-2 bg-grep-0 p-8 text-center">
        <Box className="h-12 w-12 text-grep-7 mx-auto mb-3" />
        <p className="text-sm font-mono text-grep-9">No brand analysis available</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Primary Color */}
      {brandAnalysis.primaryColor && (
        <div className="rounded-md border border-grep-2 bg-grep-0 overflow-hidden">
          <div className="px-4 py-3 border-b border-grep-2 bg-background">
            <h3 className="text-xs font-mono font-semibold uppercase tracking-wide text-foreground flex items-center gap-2">
              <Palette className="h-4 w-4" />
              Primary Brand Color
            </h3>
          </div>
          <div className="p-4">
            <div className="flex items-center gap-4">
              <div
                className="w-24 h-24 rounded-lg border-2 border-grep-3 shadow-sm"
                style={{ backgroundColor: brandAnalysis.primaryColor }}
              />
              <div className="flex-1">
                <code className="text-xl font-bold text-foreground font-mono">{brandAnalysis.primaryColor}</code>
                <p className="text-xs text-grep-9 mt-2">Most prominent color in the design system</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Secondary Colors */}
      {brandAnalysis.secondaryColors && brandAnalysis.secondaryColors.length > 0 && (
        <div className="rounded-md border border-grep-2 bg-grep-0 overflow-hidden">
          <div className="px-4 py-3 border-b border-grep-2 bg-background">
            <h3 className="text-xs font-mono font-semibold uppercase tracking-wide text-foreground flex items-center gap-2">
              Secondary Colors
              <span className="text-grep-7 font-normal">·</span>
              <span className="text-grep-9 font-normal">{brandAnalysis.secondaryColors.length} colors</span>
            </h3>
          </div>
          <div className="p-4">
            <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
              {brandAnalysis.secondaryColors.map((color, index) => (
                <div key={`secondary-${index}`} className="flex flex-col gap-2">
                  <div
                    className="w-full aspect-square rounded border border-grep-3"
                    style={{ backgroundColor: color }}
                  />
                  <code className="text-[10px] font-mono text-grep-9 truncate">{color}</code>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Brand Attributes */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {brandAnalysis.colorScheme && (
          <div className="rounded-md border border-grep-2 bg-grep-0 overflow-hidden">
            <div className="px-4 py-3 border-b border-grep-2 bg-background">
              <h3 className="text-xs font-mono font-semibold uppercase tracking-wide text-grep-9">Color Scheme</h3>
            </div>
            <div className="p-4">
              <Badge variant="secondary" className="font-mono text-sm px-3 py-1">
                {brandAnalysis.colorScheme}
              </Badge>
            </div>
          </div>
        )}

        {brandAnalysis.mood && (
          <div className="rounded-md border border-grep-2 bg-grep-0 overflow-hidden">
            <div className="px-4 py-3 border-b border-grep-2 bg-background">
              <h3 className="text-xs font-mono font-semibold uppercase tracking-wide text-grep-9">Brand Mood</h3>
            </div>
            <div className="p-4">
              <Badge variant="secondary" className="font-mono text-sm px-3 py-1">
                {brandAnalysis.mood}
              </Badge>
            </div>
          </div>
        )}

        {brandAnalysis.industry && (
          <div className="rounded-md border border-grep-2 bg-grep-0 overflow-hidden">
            <div className="px-4 py-3 border-b border-grep-2 bg-background">
              <h3 className="text-xs font-mono font-semibold uppercase tracking-wide text-grep-9">Industry</h3>
            </div>
            <div className="p-4">
              <Badge variant="secondary" className="font-mono text-sm px-3 py-1">
                {brandAnalysis.industry}
              </Badge>
            </div>
          </div>
        )}

        {brandAnalysis.confidence !== undefined && (
          <div className="rounded-md border border-grep-2 bg-grep-0 overflow-hidden">
            <div className="px-4 py-3 border-b border-grep-2 bg-background">
              <h3 className="text-xs font-mono font-semibold uppercase tracking-wide text-grep-9 flex items-center gap-2">
                <TrendingUp className="h-3.5 w-3.5" />
                Confidence
              </h3>
            </div>
            <div className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex-1 h-2 bg-grep-2 rounded-full overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all",
                      brandAnalysis.confidence >= 80 ? "bg-green-500" :
                      brandAnalysis.confidence >= 60 ? "bg-blue-500" :
                      "bg-orange-500"
                    )}
                    style={{ width: `${brandAnalysis.confidence}%` }}
                  />
                </div>
                <span className="text-lg font-bold text-foreground font-mono tabular-nums">
                  {brandAnalysis.confidence}%
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}