"use client"

import { useState } from "react"
import { Copy, Check } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

interface Token {
  value: string
  name?: string
  usage?: number
  percentage?: number
  confidence?: number
  semantic?: string
}

interface TokenGridProps {
  tokens: Token[]
  type: "color" | "spacing" | "radius" | "shadow" | "typography"
  columns?: number
  onCopy?: (value: string) => void
}

export function TokenGrid({ tokens, type, columns = 6, onCopy }: TokenGridProps) {
  const [copiedValue, setCopiedValue] = useState<string | null>(null)

  const handleCopy = (value: string) => {
    navigator.clipboard.writeText(value)
    setCopiedValue(value)
    onCopy?.(value)
    setTimeout(() => setCopiedValue(null), 2000)
  }

  if (!tokens || tokens.length === 0) {
    return (
      <div className="text-center py-8 text-sm text-grep-7">
        No {type} tokens found
      </div>
    )
  }

  return (
    <div className={cn(
      "grid gap-3",
      columns === 6 && "grid-cols-2 sm:grid-cols-3 md:grid-cols-6",
      columns === 4 && "grid-cols-2 sm:grid-cols-3 md:grid-cols-4",
      columns === 3 && "grid-cols-1 sm:grid-cols-2 md:grid-cols-3"
    )}>
      {tokens.map((token, index) => {
        const isCopied = copiedValue === token.value

        return (
          <div
            key={index}
            className="group relative rounded-lg border border-grep-2 bg-grep-0 p-3 hover:border-grep-4 hover:shadow-md transition-all duration-200"
          >
            {/* Token preview */}
            {type === "color" && (
              <div className="mb-2 relative">
                <div
                  className="w-full aspect-square rounded-md border border-grep-3 shadow-sm"
                  style={{ backgroundColor: token.value }}
                />
                {/* Checkered background for transparency */}
                <div
                  className="absolute inset-0 rounded-md"
                  style={{
                    backgroundImage: `
                      linear-gradient(45deg, #ccc 25%, transparent 25%),
                      linear-gradient(-45deg, #ccc 25%, transparent 25%),
                      linear-gradient(45deg, transparent 75%, #ccc 75%),
                      linear-gradient(-45deg, transparent 75%, #ccc 75%)
                    `,
                    backgroundSize: "10px 10px",
                    backgroundPosition: "0 0, 0 5px, 5px -5px, -5px 0px",
                    zIndex: -1
                  }}
                />
              </div>
            )}

            {type === "spacing" && (
              <div className="mb-2 flex items-center justify-center h-12 bg-blue-50 dark:bg-blue-950/20 rounded">
                <div
                  className="bg-blue-500 h-2 rounded"
                  style={{ width: token.value }}
                />
              </div>
            )}

            {type === "radius" && (
              <div className="mb-2 flex items-center justify-center h-12">
                <div
                  className="w-12 h-12 bg-grep-3"
                  style={{ borderRadius: token.value }}
                />
              </div>
            )}

            {type === "shadow" && (
              <div className="mb-2 flex items-center justify-center h-16 bg-gradient-to-b from-grep-0 to-grep-1">
                <div
                  className="w-12 h-12 bg-background rounded-lg"
                  style={{ boxShadow: token.value }}
                />
              </div>
            )}

            {/* Token info */}
            <div className="space-y-1">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-mono text-foreground truncate font-semibold">
                    {token.value}
                  </div>
                  {token.semantic && (
                    <div className="text-[10px] text-grep-7 truncate">
                      {token.semantic}
                    </div>
                  )}
                  {token.percentage !== undefined && (
                    <div className="text-[10px] text-grep-7">
                      {token.percentage}% usage
                    </div>
                  )}
                </div>

                {/* Copy button */}
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity",
                    isCopied && "opacity-100"
                  )}
                  onClick={() => handleCopy(token.value)}
                >
                  {isCopied ? (
                    <Check className="h-3 w-3 text-green-600" />
                  ) : (
                    <Copy className="h-3 w-3" />
                  )}
                </Button>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
