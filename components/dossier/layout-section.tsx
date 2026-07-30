'use client'

import { cn } from '@/lib/utils'
import { FactRow, SectionShell } from './shared'

type LayoutDNALike = {
  containers?: {
    maxWidth?: string | null
    strategy?: string
    responsive?: boolean
    snapshots?: Array<Record<string, unknown>>
  }
  gridSystem?: string
  spacingBase?: number | null
  breakpoints?: number[]
  archetypes?: Array<{ type: string; confidence: number }>
} & Record<string, unknown>

export function LayoutSection({ layoutDNA }: { layoutDNA: LayoutDNALike | null }) {
  if (!layoutDNA || Object.keys(layoutDNA).length === 0) return null
  const breakpoints = (layoutDNA.breakpoints ?? []).filter(
    (bp) => typeof bp === 'number' && bp > 0 && bp <= 3000
  )
  const archetypes = layoutDNA.archetypes ?? []
  const maxBp = Math.max(1440, ...breakpoints)

  return (
    <SectionShell
      id="layout"
      overline="Layout DNA"
      title="How pages are built"
      lede="Containers, breakpoints and layout archetypes inferred from the site's CSS — the skeleton the components hang on."
    >
      <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr]">
        <div>
          <FactRow
            label="Container strategy"
            value={layoutDNA.containers?.strategy ?? '—'}
          />
          <FactRow
            label="Max width"
            value={layoutDNA.containers?.maxWidth ?? 'fluid'}
          />
          <FactRow
            label="Layout engine"
            value={layoutDNA.gridSystem ?? '—'}
          />
          <FactRow
            label="Spacing base"
            value={layoutDNA.spacingBase ? `${layoutDNA.spacingBase}px` : 'optical'}
          />
          <FactRow
            label="Responsive"
            value={layoutDNA.containers?.responsive ? 'yes' : 'no'}
          />

          {archetypes.length > 0 && (
            <div className="mt-6">
              <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                Page archetypes
              </p>
              <div className="flex flex-wrap gap-2">
                {archetypes.slice(0, 8).map((archetype) => (
                  <span
                    key={archetype.type}
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-lg border border-[color:var(--soft-border)] px-2.5 py-1 font-mono text-[11px]',
                      archetype.confidence >= 0.7
                        ? 'text-foreground'
                        : 'text-muted-foreground'
                    )}
                  >
                    {archetype.type}
                    <span className="text-[10px] opacity-60">
                      {Math.round(archetype.confidence * 100)}%
                    </span>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        <div>
          <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            Breakpoints
          </p>
          {breakpoints.length > 0 ? (
            <div className="space-y-2">
              {breakpoints.map((bp) => (
                <div key={bp} className="flex items-center gap-3">
                  <span className="w-16 shrink-0 text-right font-mono text-[11px] tabular-nums text-muted-foreground">
                    {bp}px
                  </span>
                  <div className="h-5 flex-1 rounded-r-md border-y border-r border-border/50 bg-secondary/30">
                    <div
                      className="h-full rounded-r-md bg-[oklch(0.78_0.08_185/0.25)]"
                      style={{ width: `${Math.min(100, (bp / maxBp) * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No media-query breakpoints detected.
            </p>
          )}

          <details className="group mt-8">
            <summary className="cursor-pointer select-none font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground transition-colors hover:text-foreground">
              Raw layout DNA
            </summary>
            <pre className="mt-3 max-h-80 overflow-auto rounded-xl border border-[color:var(--soft-border)] bg-background/60 p-4 font-mono text-[11px] leading-relaxed text-muted-foreground">
              {JSON.stringify(layoutDNA, null, 2)}
            </pre>
          </details>
        </div>
      </div>
    </SectionShell>
  )
}
