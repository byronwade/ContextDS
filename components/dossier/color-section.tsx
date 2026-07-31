'use client'

import { useMemo, useState } from 'react'
import { cn } from '@/lib/utils'
import {
  BLACK,
  WHITE,
  contrastRatio,
  inkFor,
  wcagGrade,
  type ColorSystem,
  type ParsedColor,
} from '@/lib/analyzers/design-philosophy'
import { SectionShell, useCopy } from './shared'

const FAMILY_TITLES: Record<string, string> = {
  red: 'Reds',
  orange: 'Oranges',
  yellow: 'Ambers',
  green: 'Greens',
  teal: 'Teals',
  cyan: 'Cyans',
  blue: 'Blues',
  indigo: 'Indigos',
  violet: 'Violets',
  pink: 'Pinks',
}

function GradeBadge({ ratio }: { ratio: number }) {
  const grade = wcagGrade(ratio)
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-1.5 py-px font-mono text-[10px]',
        grade === 'AAA' && 'border-[color-mix(in_oklab,var(--ui-success)_40%,transparent)] text-[var(--ui-success)]',
        grade === 'AA' && 'border-[color-mix(in_oklab,var(--ui-success)_30%,transparent)] text-[color-mix(in_oklab,var(--ui-success)_85%,transparent)]',
        grade === 'AA18' && 'border-[color-mix(in_oklab,var(--ui-warning)_40%,transparent)] text-[var(--ui-warning)]',
        grade === 'fail' && 'border-border/60 text-muted-foreground'
      )}
    >
      {ratio.toFixed(1)}
      <span className="opacity-70">{grade === 'AA18' ? 'AA·lg' : grade}</span>
    </span>
  )
}

function Swatch({
  color,
  selected,
  onSelect,
}: {
  color: ParsedColor
  selected: boolean
  onSelect: (color: ParsedColor) => void
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(color)}
      title={color.hex}
      aria-pressed={selected}
      className={cn(
        'group relative h-14 min-w-0 flex-1 basis-10 overflow-hidden transition-all duration-150 first:rounded-l-lg last:rounded-r-lg',
        selected
          ? 'z-10 -my-1 rounded-lg ring-2 ring-[var(--ui-accent)] ring-offset-2 ring-offset-background'
          : 'hover:z-10 hover:-my-0.5 hover:rounded-md'
      )}
      style={{ background: color.hex }}
    >
      <span
        className="pointer-events-none absolute inset-x-0 bottom-0 truncate px-1 pb-0.5 text-center font-mono text-[9px] opacity-0 transition-opacity group-hover:opacity-90"
        style={{ color: inkFor(color) }}
      >
        {color.hex}
      </span>
    </button>
  )
}

function SelectedColorPanel({
  color,
  system,
  copiedKey,
  copy,
}: {
  color: ParsedColor
  system: ColorSystem
  copiedKey: string | null
  copy: (key: string, value: string) => void
}) {
  const vsWhite = contrastRatio(color, WHITE)
  const vsBlack = contrastRatio(color, BLACK)
  const vsLightest = system.lightest ? contrastRatio(color, system.lightest) : null
  const vsDarkest = system.darkest ? contrastRatio(color, system.darkest) : null

  const formats: Array<[string, string]> = [
    ['HEX', color.hex],
    [
      'RGB',
      `rgb(${Math.round(color.rgb.r)} ${Math.round(color.rgb.g)} ${Math.round(color.rgb.b)})`,
    ],
    [
      'HSL',
      `hsl(${Math.round(color.hsl.h)} ${Math.round(color.hsl.s * 100)}% ${Math.round(color.hsl.l * 100)}%)`,
    ],
  ]

  return (
    <div className="overflow-hidden rounded-2xl border border-[color:var(--soft-border)] bg-card/60">
      <div
        className="flex h-28 items-end justify-between px-5 pb-4"
        style={{ background: color.hex }}
      >
        <div style={{ color: inkFor(color) }}>
          <p className="font-mono text-sm font-medium">{color.name || color.hex}</p>
          <p className="font-mono text-[11px] opacity-80">
            {color.family} · L {Math.round(color.luminance * 100)}%
          </p>
        </div>
        {typeof color.usage === 'number' && color.usage > 0 ? (
          <p
            className="font-mono text-[11px] opacity-80"
            style={{ color: inkFor(color) }}
          >
            ×{color.usage} uses
          </p>
        ) : null}
      </div>
      <div className="grid gap-4 p-5 sm:grid-cols-2">
        <div className="space-y-2">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            Formats
          </p>
          {formats.map(([label, value]) => (
            <button
              key={label}
              type="button"
              onClick={() => copy(`fmt-${label}`, value)}
              className="flex w-full items-baseline justify-between gap-3 rounded-md px-2 py-1 text-left transition-colors hover:bg-secondary/50"
            >
              <span className="font-mono text-[10px] text-muted-foreground">{label}</span>
              <span className="truncate font-mono text-xs text-foreground">
                {copiedKey === `fmt-${label}` ? 'copied' : value}
              </span>
            </button>
          ))}
        </div>
        <div className="space-y-2">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            Contrast
          </p>
          <div className="flex items-center justify-between gap-3 px-2 py-1">
            <span className="text-xs text-muted-foreground">on white</span>
            <GradeBadge ratio={vsWhite} />
          </div>
          <div className="flex items-center justify-between gap-3 px-2 py-1">
            <span className="text-xs text-muted-foreground">on black</span>
            <GradeBadge ratio={vsBlack} />
          </div>
          {vsLightest !== null && system.lightest && (
            <div className="flex items-center justify-between gap-3 px-2 py-1">
              <span className="text-xs text-muted-foreground">
                on lightest ({system.lightest.hex})
              </span>
              <GradeBadge ratio={vsLightest} />
            </div>
          )}
          {vsDarkest !== null && system.darkest && (
            <div className="flex items-center justify-between gap-3 px-2 py-1">
              <span className="text-xs text-muted-foreground">
                on darkest ({system.darkest.hex})
              </span>
              <GradeBadge ratio={vsDarkest} />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export function ColorSection({ system }: { system: ColorSystem }) {
  const { copiedKey, copy } = useCopy()
  const [selected, setSelected] = useState<ParsedColor | null>(null)

  const active = selected ?? system.accent ?? system.all[0] ?? null

  const usageMax = useMemo(
    () => Math.max(1, ...system.all.map((color) => color.usage ?? 0)),
    [system.all]
  )

  if (system.all.length === 0) return null

  return (
    <SectionShell
      id="color"
      overline={`Color · ${system.all.length} tokens`}
      title="The color system"
      lede={`${system.neutrals.length} neutrals and ${system.chromatic.length} chromatic tokens, ${system.temperature} in temperature and ${system.polarity.replace('-', ' ')}. Click any swatch for formats and WCAG contrast.`}
    >
      <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-8">
          {system.neutrals.length > 0 && (
            <div>
              <div className="mb-2 flex items-baseline justify-between">
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                  Neutral ramp · light → dark
                </p>
                <p className="font-mono text-[10px] text-muted-foreground">
                  {system.neutrals.length} steps
                </p>
              </div>
              <div className="flex rounded-lg border border-[color:var(--soft-border)] p-0.5">
                {system.neutrals.map((color) => (
                  <Swatch
                    key={color.hex}
                    color={color}
                    selected={active?.hex === color.hex}
                    onSelect={setSelected}
                  />
                ))}
              </div>
            </div>
          )}

          {system.families.map((group) => (
            <div key={group.family}>
              <div className="mb-2 flex items-baseline justify-between">
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                  {FAMILY_TITLES[group.family] ?? group.family}
                </p>
                <p className="font-mono text-[10px] text-muted-foreground">
                  {group.colors.length} {group.colors.length === 1 ? 'token' : 'tokens'}
                </p>
              </div>
              <div className="flex rounded-lg border border-[color:var(--soft-border)] p-0.5">
                {group.colors.map((color) => (
                  <Swatch
                    key={color.hex}
                    color={color}
                    selected={active?.hex === color.hex}
                    onSelect={setSelected}
                  />
                ))}
              </div>
            </div>
          ))}

          <div>
            <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              Usage weight
            </p>
            <div className="space-y-1.5">
              {[...system.all]
                .sort((a, b) => (b.usage ?? 0) - (a.usage ?? 0))
                .slice(0, 8)
                .map((color) => (
                  <button
                    key={`usage-${color.hex}`}
                    type="button"
                    onClick={() => setSelected(color)}
                    className="group flex w-full items-center gap-3 rounded-md px-1 py-0.5 text-left hover:bg-secondary/40"
                  >
                    <span
                      className="size-3.5 shrink-0 rounded-[4px] border border-[color:var(--soft-border)]"
                      style={{ background: color.hex }}
                    />
                    <span className="w-20 shrink-0 truncate font-mono text-[11px] text-muted-foreground group-hover:text-foreground">
                      {color.hex}
                    </span>
                    <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-secondary/60">
                      <span
                        className="block h-full rounded-full bg-foreground/50 transition-all"
                        style={{
                          width: `${Math.max(3, Math.round(((color.usage ?? 0) / usageMax) * 100))}%`,
                        }}
                      />
                    </span>
                    <span className="w-10 shrink-0 text-right font-mono text-[10px] text-muted-foreground">
                      {color.usage ?? 0}
                    </span>
                  </button>
                ))}
            </div>
          </div>
        </div>

        <div className="lg:sticky lg:top-28 lg:self-start">
          {active ? (
            <SelectedColorPanel
              color={active}
              system={system}
              copiedKey={copiedKey}
              copy={copy}
            />
          ) : null}
        </div>
      </div>
    </SectionShell>
  )
}
