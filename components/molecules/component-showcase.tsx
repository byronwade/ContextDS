"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Copy, ChevronDown, ChevronUp, Code2 } from "lucide-react"

interface ComponentShowcaseProps {
  type: string
  variant?: string
  confidence: number
  usage: number
  tokens: any
  examples?: {
    html?: string
    css?: string
    usage?: string
  }
  onCopy?: (value: string) => void
}

export function ComponentShowcase({
  type,
  variant,
  confidence,
  usage,
  tokens,
  examples,
  onCopy
}: ComponentShowcaseProps) {
  const [expanded, setExpanded] = useState(false)

  const getConfidenceColor = (conf: number) => {
    if (conf >= 90) return "text-green-600 dark:text-green-500 bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800"
    if (conf >= 75) return "text-blue-600 dark:text-blue-500 bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800"
    if (conf >= 60) return "text-orange-600 dark:text-orange-500 bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-800"
    return "text-grep-7 bg-grep-0 border-grep-2"
  }

  const getConfidenceLabel = (conf: number) => {
    if (conf >= 90) return "very-high"
    if (conf >= 75) return "high"
    if (conf >= 60) return "medium"
    return "low"
  }

  return (
    <div className="rounded-lg border border-grep-2 bg-grep-0 overflow-hidden hover:border-grep-4 transition-colors">
      {/* Header */}
      <div
        className="p-3 bg-background cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <Code2 className="h-4 w-4 text-blue-600 shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="text-sm font-semibold text-foreground capitalize">
                  {type.replace(/-/g, " ")}
                </h4>
                {variant && (
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0.5">
                    {variant}
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-grep-7">
                  {usage} {usage === 1 ? "use" : "uses"}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className={cn(
              "px-2 py-1 rounded border text-xs font-mono font-semibold",
              getConfidenceColor(confidence)
            )}>
              {Math.min(100, Math.round(confidence))}% {getConfidenceLabel(confidence)}
            </div>
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
              {expanded ? (
                <ChevronUp className="h-3.5 w-3.5" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5" />
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div className="border-t border-grep-2 p-4 space-y-4 bg-grep-0">
          {/* Key tokens */}
          {tokens && Object.keys(tokens).filter(k => tokens[k] !== undefined && tokens[k] !== null).length > 0 ? (
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-grep-9 mb-2">
                Design Tokens
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {tokens.padding && (
                  <div>
                    <div className="text-grep-7">Padding</div>
                    <div className="font-mono text-foreground">{tokens.padding}</div>
                  </div>
                )}
                {tokens.borderRadius && (
                  <div>
                    <div className="text-grep-7">Radius</div>
                    <div className="font-mono text-foreground">{tokens.borderRadius}</div>
                  </div>
                )}
                {tokens.fontSize && (
                  <div>
                    <div className="text-grep-7">Font Size</div>
                    <div className="font-mono text-foreground">{tokens.fontSize}</div>
                  </div>
                )}
                {tokens.backgroundColor && (
                  <div>
                    <div className="text-grep-7">Background</div>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-4 h-4 rounded border border-grep-3"
                        style={{ backgroundColor: tokens.backgroundColor }}
                      />
                      <div className="font-mono text-foreground text-[10px]">
                        {tokens.backgroundColor}
                      </div>
                    </div>
                  </div>
                )}
                {tokens.color && (
                  <div>
                    <div className="text-grep-7">Text Color</div>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-4 h-4 rounded border border-grep-3"
                        style={{ backgroundColor: tokens.color }}
                      />
                      <div className="font-mono text-foreground text-[10px]">
                        {tokens.color}
                      </div>
                    </div>
                  </div>
                )}
                {tokens.fontFamily && (
                  <div>
                    <div className="text-grep-7">Font Family</div>
                    <div className="font-mono text-foreground text-[10px]">{tokens.fontFamily}</div>
                  </div>
                )}
                {tokens.fontWeight && (
                  <div>
                    <div className="text-grep-7">Font Weight</div>
                    <div className="font-mono text-foreground">{tokens.fontWeight}</div>
                  </div>
                )}
                {tokens.boxShadow && (
                  <div className="col-span-2">
                    <div className="text-grep-7">Shadow</div>
                    <div className="font-mono text-foreground text-[10px] truncate">{tokens.boxShadow}</div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="text-xs text-grep-7 italic">
              No design tokens extracted for this component
            </div>
          )}

          {/* Usage example */}
          {examples?.usage && (
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-grep-9 mb-2">
                Usage
              </div>
              <p className="text-xs text-grep-8 leading-relaxed">
                {examples.usage}
              </p>
            </div>
          )}

          {/* Copy button */}
          <div className="flex justify-end">
            <Button
              variant="outline"
              size="sm"
              className="text-xs"
              onClick={() => {
                // Filter out undefined/null tokens for cleaner output
                const cleanTokens = tokens ? Object.fromEntries(
                  Object.entries(tokens).filter(([_, v]) => v !== undefined && v !== null)
                ) : {}
                onCopy?.(JSON.stringify({
                  type,
                  variant,
                  confidence,
                  usage,
                  tokens: cleanTokens
                }, null, 2))
              }}
            >
              <Copy className="h-3 w-3 mr-1.5" />
              Copy Component Data
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
