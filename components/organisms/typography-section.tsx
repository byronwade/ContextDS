"use client"

import { Type, Copy, Check } from "lucide-react"
import { cn } from "@/lib/utils"
import { useState } from "react"
import { FontPreview } from "@/components/molecules/font-preview"

interface TypographyToken {
  value: string
  usage?: number
  percentage?: number
  source?: string
  lineNumber?: number
}

interface TypographySectionProps {
  typography?: {
    families?: TypographyToken[]
    sizes?: TypographyToken[]
    weights?: TypographyToken[]
    lineHeights?: TypographyToken[]
  }
  onCopy?: (text: string) => void
}

export function TypographySection({ typography, onCopy }: TypographySectionProps) {
  const [copiedToken, setCopiedToken] = useState<string | null>(null)

  if (!typography || (!typography.families?.length && !typography.sizes?.length && !typography.weights?.length && !typography.lineHeights?.length)) {
    return (
      <div className="rounded-lg border border-grep-2 bg-grep-0 p-8 text-center">
        <Type className="h-12 w-12 text-grep-7 mx-auto mb-3" />
        <p className="text-sm font-mono text-grep-9">No typography data available</p>
      </div>
    )
  }

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopiedToken(text)
    onCopy?.(text)
    setTimeout(() => setCopiedToken(null), 2000)
  }

  return (
    <div className="space-y-6">
      {/* Font Families */}
      {typography.families && typography.families.length > 0 && (
        <div className="rounded-md border border-grep-2 bg-grep-0 overflow-hidden">
          <div className="px-4 py-3 border-b border-grep-2 bg-background">
            <h3 className="text-xs font-mono font-semibold uppercase tracking-wide text-foreground flex items-center gap-2">
              <Type className="h-4 w-4" />
              Font Families
              <span className="text-grep-7 font-normal">·</span>
              <span className="text-grep-9 font-normal">{typography.families.length} found</span>
            </h3>
          </div>
          <div className="divide-y divide-grep-2">
            {typography.families.map((font, index) => (
              <button
                key={`font-${index}`}
                onClick={() => handleCopy(String(font.value))}
                className="w-full px-4 py-4 text-left hover:bg-background transition-colors group relative"
              >
                {copiedToken === String(font.value) && (
                  <div className="absolute top-4 right-4 bg-green-500 text-white rounded-full p-1">
                    <Check className="h-3 w-3" />
                  </div>
                )}
                <div className="flex items-center justify-between gap-4 mb-3">
                  <code className="text-sm text-foreground truncate flex-1 font-mono">{font.value}</code>
                  <div className="flex items-center gap-3 shrink-0">
                    {font.percentage !== undefined && (
                      <span className="text-xs text-grep-9 font-mono tabular-nums">{font.percentage}%</span>
                    )}
                    <Copy className="h-3.5 w-3.5 text-grep-7 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>
                <FontPreview fontFamily={String(font.value)} className="relative">
                  <div className="flex items-baseline gap-6 not-mono">
                    <span className="text-3xl text-foreground">Aa</span>
                    <span className="text-2xl text-grep-9">Bb Cc</span>
                    <span className="text-xl text-grep-9">123</span>
                    <span className="text-base text-grep-9">The quick brown fox jumps over the lazy dog</span>
                  </div>
                </FontPreview>
                {font.source && (
                  <div className="text-[9px] text-grep-7 mt-2 truncate font-mono">
                    {font.source}:{font.lineNumber || 0}
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Font Sizes */}
      {typography.sizes && typography.sizes.length > 0 && (
        <div className="rounded-md border border-grep-2 bg-grep-0 overflow-hidden">
          <div className="px-4 py-3 border-b border-grep-2 bg-background">
            <h3 className="text-xs font-mono font-semibold uppercase tracking-wide text-foreground flex items-center gap-2">
              Font Sizes
              <span className="text-grep-7 font-normal">·</span>
              <span className="text-grep-9 font-normal">{typography.sizes.length} found</span>
            </h3>
          </div>
          <div className="p-4">
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {typography.sizes.map((size, index) => (
                <button
                  key={`size-${index}`}
                  onClick={() => handleCopy(String(size.value))}
                  className="flex flex-col items-center gap-2 p-3 rounded border border-grep-2 bg-background hover:border-foreground transition-all relative group"
                  title={`${size.percentage}% usage`}
                >
                  {copiedToken === String(size.value) && (
                    <div className="absolute -top-1 -right-1 bg-green-500 text-white rounded-full p-1">
                      <Check className="h-3 w-3" />
                    </div>
                  )}
                  <div className="text-foreground font-semibold" style={{ fontSize: `${Math.min(parseFloat(String(size.value)), 32)}px` }}>
                    Aa
                  </div>
                  <code className="text-xs text-grep-9 font-mono">{size.value}</code>
                  {size.percentage !== undefined && (
                    <div className="text-[10px] text-grep-7 font-mono tabular-nums">{size.percentage}%</div>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Font Weights */}
      {typography.weights && typography.weights.length > 0 && (
        <div className="rounded-md border border-grep-2 bg-grep-0 overflow-hidden">
          <div className="px-4 py-3 border-b border-grep-2 bg-background">
            <h3 className="text-xs font-mono font-semibold uppercase tracking-wide text-foreground flex items-center gap-2">
              Font Weights
              <span className="text-grep-7 font-normal">·</span>
              <span className="text-grep-9 font-normal">{typography.weights.length} found</span>
            </h3>
          </div>
          <div className="p-4">
            <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
              {typography.weights.map((weight, index) => (
                <button
                  key={`weight-${index}`}
                  onClick={() => handleCopy(String(weight.value))}
                  className="flex flex-col items-center gap-2 p-3 rounded border border-grep-2 bg-background hover:border-foreground transition-all relative group"
                >
                  {copiedToken === String(weight.value) && (
                    <div className="absolute -top-1 -right-1 bg-green-500 text-white rounded-full p-1">
                      <Check className="h-3 w-3" />
                    </div>
                  )}
                  <div className="text-2xl text-foreground" style={{ fontWeight: String(weight.value) }}>
                    Aa
                  </div>
                  <code className="text-xs text-grep-9 font-mono">{weight.value}</code>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Line Heights */}
      {typography.lineHeights && typography.lineHeights.length > 0 && (
        <div className="rounded-md border border-grep-2 bg-grep-0 overflow-hidden">
          <div className="px-4 py-3 border-b border-grep-2 bg-background">
            <h3 className="text-xs font-mono font-semibold uppercase tracking-wide text-foreground flex items-center gap-2">
              Line Heights
              <span className="text-grep-7 font-normal">·</span>
              <span className="text-grep-9 font-normal">{typography.lineHeights.length} found</span>
            </h3>
          </div>
          <div className="p-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {typography.lineHeights.map((lineHeight, index) => (
                <button
                  key={`lineHeight-${index}`}
                  onClick={() => handleCopy(String(lineHeight.value))}
                  className="flex flex-col items-start gap-1 p-3 rounded border border-grep-2 bg-background hover:border-foreground transition-all relative group"
                >
                  {copiedToken === String(lineHeight.value) && (
                    <div className="absolute -top-1 -right-1 bg-green-500 text-white rounded-full p-1">
                      <Check className="h-3 w-3" />
                    </div>
                  )}
                  <code className="text-xs text-foreground font-mono font-semibold">{lineHeight.value}</code>
                  <div className="text-[10px] text-grep-9 leading-tight" style={{ lineHeight: String(lineHeight.value) }}>
                    Lorem ipsum dolor sit amet consectetur
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}