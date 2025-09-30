"use client"

import { Grid3x3, Container, Layers, Box } from "lucide-react"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"

interface LayoutDNA {
  containers?: Array<{ width: string; usage: number }>
  gridSystem?: { columns: number; gap: string }
  spacingBase?: number
  archetypes?: Array<{ type: string; confidence: number }> | string[]
  wireframe?: { sections: any[] }
  breakpoints?: Record<string, string>
}

interface LayoutPatternsSectionProps {
  layoutDNA?: LayoutDNA
}

export function LayoutPatternsSection({ layoutDNA }: LayoutPatternsSectionProps) {
  if (!layoutDNA || Object.keys(layoutDNA).length === 0) {
    return (
      <div className="rounded-lg border border-grep-2 bg-grep-0 p-8 text-center">
        <Grid3x3 className="h-12 w-12 text-grep-7 mx-auto mb-3" />
        <p className="text-sm font-mono text-grep-9">No layout analysis available</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Containers */}
      {layoutDNA.containers && layoutDNA.containers.length > 0 && (
        <div className="rounded-md border border-grep-2 bg-grep-0 overflow-hidden">
          <div className="px-4 py-3 border-b border-grep-2 bg-background">
            <h3 className="text-xs font-mono font-semibold uppercase tracking-wide text-foreground flex items-center gap-2">
              <Container className="h-4 w-4" />
              Container Widths
              <span className="text-grep-7 font-normal">·</span>
              <span className="text-grep-9 font-normal">{layoutDNA.containers.length} detected</span>
            </h3>
          </div>
          <div className="p-4">
            <div className="space-y-3">
              {layoutDNA.containers.map((container, index) => (
                <div
                  key={`container-${index}`}
                  className="flex items-center justify-between p-3 rounded border border-grep-2 bg-background"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-8 border-2 border-blue-500 rounded flex items-center justify-center">
                      <div className="w-8 h-4 bg-blue-500/20" />
                    </div>
                    <code className="text-sm font-mono text-foreground font-semibold">{container.width}</code>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-xs text-grep-9 font-mono">{container.usage} uses</div>
                    <div className="w-24 h-2 bg-grep-2 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 rounded-full transition-all"
                        style={{ width: `${Math.min(container.usage * 10, 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Grid System */}
      {layoutDNA.gridSystem && (
        <div className="rounded-md border border-grep-2 bg-grep-0 overflow-hidden">
          <div className="px-4 py-3 border-b border-grep-2 bg-background">
            <h3 className="text-xs font-mono font-semibold uppercase tracking-wide text-foreground flex items-center gap-2">
              <Grid3x3 className="h-4 w-4" />
              Grid System
            </h3>
          </div>
          <div className="p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div className="p-3 sm:p-4 rounded border border-grep-2 bg-background">
                <div className="text-xs text-grep-9 font-mono uppercase mb-2">Columns</div>
                <div className="text-2xl font-bold text-foreground font-mono tabular-nums">
                  {layoutDNA.gridSystem.columns}
                </div>
              </div>
              <div className="p-3 sm:p-4 rounded border border-grep-2 bg-background">
                <div className="text-xs text-grep-9 font-mono uppercase mb-2">Gap</div>
                <code className="text-lg font-bold text-foreground font-mono">
                  {layoutDNA.gridSystem.gap}
                </code>
              </div>
            </div>
            {/* Visual Grid Representation */}
            <div className="mt-4 p-4 rounded border border-grep-2 bg-background">
              <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${layoutDNA.gridSystem.columns}, 1fr)` }}>
                {Array.from({ length: layoutDNA.gridSystem.columns }).map((_, i) => (
                  <div key={i} className="h-16 bg-blue-500/20 border border-blue-500/40 rounded" />
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Spacing Scale */}
      {layoutDNA.spacingBase && (
        <div className="rounded-md border border-grep-2 bg-grep-0 overflow-hidden">
          <div className="px-4 py-3 border-b border-grep-2 bg-background">
            <h3 className="text-xs font-mono font-semibold uppercase tracking-wide text-foreground flex items-center gap-2">
              <Layers className="h-4 w-4" />
              Spacing Scale
            </h3>
          </div>
          <div className="p-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded border border-grep-2 bg-background">
                <span className="text-sm font-mono text-grep-9">Base Unit</span>
                <code className="text-lg font-bold text-foreground font-mono">{layoutDNA.spacingBase}px</code>
              </div>
              {/* Common multipliers */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                {[0.5, 1, 2, 4, 8].map((multiplier) => (
                  <div key={multiplier} className="p-2 rounded border border-grep-2 bg-background text-center">
                    <div className="text-xs text-grep-9 font-mono mb-1">{multiplier}x</div>
                    <div className="h-1 bg-blue-500 rounded mx-auto" style={{ width: `${Math.min(layoutDNA.spacingBase! * multiplier, 100)}%` }} />
                    <code className="text-[10px] text-foreground font-mono mt-1 block">{layoutDNA.spacingBase! * multiplier}px</code>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Archetypes */}
      {layoutDNA.archetypes && layoutDNA.archetypes.length > 0 && (
        <div className="rounded-md border border-grep-2 bg-grep-0 overflow-hidden">
          <div className="px-4 py-3 border-b border-grep-2 bg-background">
            <h3 className="text-xs font-mono font-semibold uppercase tracking-wide text-foreground flex items-center gap-2">
              <Box className="h-4 w-4" />
              Layout Archetypes
              <span className="text-grep-7 font-normal">·</span>
              <span className="text-grep-9 font-normal">{layoutDNA.archetypes.length} detected</span>
            </h3>
          </div>
          <div className="p-4">
            <div className="flex flex-wrap gap-2">
              {layoutDNA.archetypes.map((archetype, index) => {
                const archetypeType = typeof archetype === 'string' ? archetype : archetype.type
                const confidence = typeof archetype === 'object' ? archetype.confidence : null

                return (
                  <Badge
                    key={`archetype-${index}`}
                    variant="secondary"
                    className="font-mono text-xs px-3 py-1 flex items-center gap-2"
                  >
                    <span>{archetypeType}</span>
                    {confidence !== null && (
                      <span className="text-grep-7">·</span>
                    )}
                    {confidence !== null && (
                      <span className="text-grep-7 tabular-nums">{confidence}%</span>
                    )}
                  </Badge>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Breakpoints */}
      {layoutDNA.breakpoints && Object.keys(layoutDNA.breakpoints).length > 0 && (
        <div className="rounded-md border border-grep-2 bg-grep-0 overflow-hidden">
          <div className="px-4 py-3 border-b border-grep-2 bg-background">
            <h3 className="text-xs font-mono font-semibold uppercase tracking-wide text-foreground flex items-center gap-2">
              Responsive Breakpoints
              <span className="text-grep-7 font-normal">·</span>
              <span className="text-grep-9 font-normal">{Object.keys(layoutDNA.breakpoints).length} defined</span>
            </h3>
          </div>
          <div className="p-3 sm:p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 sm:gap-3">
              {Object.entries(layoutDNA.breakpoints).map(([name, value]) => (
                <div
                  key={name}
                  className="p-3 rounded border border-grep-2 bg-background"
                >
                  <div className="text-xs text-grep-9 font-mono uppercase mb-1">{name}</div>
                  <code className="text-sm font-bold text-foreground font-mono break-all">{value}</code>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}