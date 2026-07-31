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

type UxDnaLike = {
  shell?: {
    header?: { height: number; sticky: boolean; background: string } | null
    sidebar?: { width: number; fixed: boolean; background: string } | null
    footer?: { height: number; background: string } | null
  } | null
  density?: {
    elementsInViewport: number
    imageAreaRatio: number
    textChars: number
  } | null
  flow?: Array<{ from: string; to: string }>
  keyframes?: Array<{ name: string; css: string }>
  interaction?: {
    rules: number
    effects: Array<{ value: string; weight: number }>
    samples: Array<{ selector: string; state: string; changes: string[] }>
  } | null
} | null

function interactionFeel(effects: Array<{ value: string; weight: number }>): string {
  const props = new Set(effects.map((effect) => effect.value.split(' ').slice(1).join(' ')))
  const notes: string[] = []
  if (props.has('transform') || props.has('scale') || props.has('translate'))
    notes.push('moves and lifts')
  if (props.has('box-shadow')) notes.push('elevates')
  if (props.has('background-color') || props.has('background') || props.has('color'))
    notes.push('tints')
  if (props.has('opacity') || props.has('filter')) notes.push('fades')
  if (props.has('text-decoration')) notes.push('underlines')
  if (notes.length === 0) return 'subtle feedback'
  return notes.join(' · ')
}

export function LayoutSection({
  layoutDNA,
  uxDna = null,
}: {
  layoutDNA: LayoutDNALike | null
  uxDna?: UxDnaLike
}) {
  if (!layoutDNA || Object.keys(layoutDNA).length === 0) return null
  const shell = uxDna?.shell ?? null
  const density = uxDna?.density ?? null
  const flow = uxDna?.flow ?? []
  const keyframes = uxDna?.keyframes ?? []
  const interaction = uxDna?.interaction ?? null
  const flowTargets = new Map<string, number>()
  for (const edge of flow) {
    flowTargets.set(edge.to, (flowTargets.get(edge.to) ?? 0) + 1)
  }
  const hubPages = Array.from(flowTargets.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
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

          {shell && (shell.header || shell.sidebar || shell.footer) ? (
            <div className="mt-6">
              <p className="mb-1 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                App shell
              </p>
              {shell.header ? (
                <FactRow
                  label="Header"
                  value={`${shell.header.height}px${shell.header.sticky ? ' · sticky' : ''}`}
                />
              ) : null}
              {shell.sidebar ? (
                <FactRow
                  label="Sidebar"
                  value={`${shell.sidebar.width}px${shell.sidebar.fixed ? ' · fixed' : ''}`}
                />
              ) : null}
              {shell.footer ? (
                <FactRow label="Footer" value={`${shell.footer.height}px`} />
              ) : null}
            </div>
          ) : null}

          {density ? (
            <div className="mt-6">
              <p className="mb-1 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                First-viewport feel
              </p>
              <FactRow
                label="Density"
                value={`${density.elementsInViewport} elements — ${
                  density.elementsInViewport > 420
                    ? 'dense'
                    : density.elementsInViewport > 180
                      ? 'balanced'
                      : 'spacious'
                }`}
              />
              <FactRow
                label="Imagery"
                value={`${Math.round(density.imageAreaRatio * 100)}% of viewport`}
              />
              <FactRow label="Copy" value={`${density.textChars.toLocaleString()} chars`} />
            </div>
          ) : null}

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
                      className="h-full rounded-r-md bg-[color-mix(in_oklab,var(--ui-accent)_25%,transparent)]"
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

          {hubPages.length > 0 ? (
            <div className="mt-8">
              <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                Navigation flow · {flow.length} internal links between crawled pages
              </p>
              <div className="space-y-1">
                {hubPages.map(([path, count]) => (
                  <div key={path} className="flex items-center gap-3">
                    <span className="w-32 shrink-0 truncate font-mono text-[11px] text-foreground">
                      {path}
                    </span>
                    <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-secondary/50">
                      <span
                        className="block h-full rounded-full bg-[color-mix(in_oklab,var(--ui-accent)_45%,transparent)]"
                        style={{ width: `${(count / hubPages[0][1]) * 100}%` }}
                      />
                    </span>
                    <span className="w-16 shrink-0 text-right font-mono text-[10px] text-muted-foreground">
                      {count} inbound
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {interaction && interaction.rules > 0 ? (
            <div className="mt-8">
              <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                Interaction feedback · {interaction.rules} state rules —{' '}
                {interactionFeel(interaction.effects)}
              </p>
              <div className="space-y-1">
                {interaction.effects.slice(0, 6).map((effect) => {
                  const max = interaction.effects[0]?.weight || 1
                  return (
                    <div key={effect.value} className="flex items-center gap-3">
                      <span className="w-40 shrink-0 truncate font-mono text-[11px] text-foreground">
                        {effect.value}
                      </span>
                      <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-secondary/50">
                        <span
                          className="block h-full rounded-full bg-[color-mix(in_oklab,var(--ui-accent)_45%,transparent)]"
                          style={{ width: `${(effect.weight / max) * 100}%` }}
                        />
                      </span>
                      <span className="w-12 shrink-0 text-right font-mono text-[10px] text-muted-foreground">
                        {effect.weight}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          ) : null}

          {keyframes.length > 0 ? (
            <div className="mt-8">
              <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                Motion vocabulary · {keyframes.length} named animations
              </p>
              <div className="flex flex-wrap gap-1.5">
                {keyframes.slice(0, 12).map((frame) => (
                  <span
                    key={frame.name}
                    title={frame.css.slice(0, 400)}
                    className="rounded-full border border-[color:var(--soft-border)] px-2.5 py-0.5 font-mono text-[11px] text-muted-foreground"
                  >
                    @{frame.name}
                  </span>
                ))}
              </div>
            </div>
          ) : null}

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
