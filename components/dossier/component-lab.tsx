'use client'

import { useMemo, useState } from 'react'
import { cn } from '@/lib/utils'
import {
  BLACK,
  WHITE,
  contrastRatio,
  inkFor,
  parseColor,
  type ColorSystem,
  type ParsedColor,
  type ShapeSystem,
  type TypeSystem,
} from '@/lib/analyzers/design-philosophy'
import { SectionShell } from './shared'

type LabTheme = {
  name: 'light' | 'dark'
  surface: string
  panel: string
  text: string
  mutedText: string
  border: string
  accent: string
  accentInk: string
  radius: number
  controlRadius: number
  font: string
}

function pick<T>(list: T[], predicate: (item: T) => boolean): T | undefined {
  return list.find(predicate)
}

/**
 * Derive light + dark preview themes from the scanned system so components
 * are rebuilt from real tokens — never invented colors.
 */
function deriveThemes(
  color: ColorSystem,
  shape: ShapeSystem,
  type: TypeSystem
): LabTheme[] {
  const accent = color.accent ?? parseColor('#3b82f6')!
  const neutrals = color.neutrals
  const light = neutrals.filter((c) => c.luminance > 0.6)
  const dark = neutrals.filter((c) => c.luminance < 0.18)

  const radii = shape.radiiPx.filter((r) => r > 0 && r <= 40)
  const surfaceRadius = radii.length
    ? radii[Math.min(radii.length - 1, Math.floor(radii.length * 0.7))]
    : 12
  const controlRadius = radii.length ? radii[Math.floor(radii.length / 2)] : 8

  const font = type.families[0]
    ? `${type.families[0].stack}, ${type.families[0].class === 'serif' ? 'serif' : 'sans-serif'}`
    : 'inherit'

  const themes: LabTheme[] = []

  const buildTheme = (name: 'light' | 'dark', pool: ParsedColor[]): LabTheme | null => {
    if (pool.length === 0) return null
    const surface = name === 'light' ? pool[0] : pool[pool.length - 1]
    const panel =
      name === 'light'
        ? (pool[1] ?? surface)
        : (pool[pool.length - 2] ?? surface)
    const inkPool = name === 'light' ? [...dark, BLACK] : [...light, WHITE]
    const text =
      pick(inkPool, (c) => contrastRatio(c, surface) >= 7) ??
      (name === 'light' ? BLACK : WHITE)
    const mid = neutrals.filter((c) => c.luminance >= 0.18 && c.luminance <= 0.6)
    const border =
      mid.length > 0 ? mid[Math.floor(mid.length / 2)] : name === 'light' ? BLACK : WHITE
    return {
      name,
      surface: surface.hex,
      panel: panel.hex,
      text: text.hex,
      mutedText: text.hex + 'b3',
      border: border.hex + (mid.length > 0 ? '' : '33'),
      accent: accent.hex,
      accentInk: inkFor(accent),
      radius: surfaceRadius,
      controlRadius,
      font,
    }
  }

  const lightTheme = buildTheme('light', light)
  const darkTheme = buildTheme('dark', dark)
  if (lightTheme) themes.push(lightTheme)
  if (darkTheme) themes.push(darkTheme)

  if (themes.length === 0) {
    themes.push({
      name: 'light',
      surface: '#ffffff',
      panel: '#f6f6f6',
      text: '#111111',
      mutedText: '#111111b3',
      border: '#11111122',
      accent: accent.hex,
      accentInk: inkFor(accent),
      radius: surfaceRadius,
      controlRadius,
      font,
    })
  }
  return themes
}

function LabPreview({ theme }: { theme: LabTheme }) {
  const [toggled, setToggled] = useState(true)
  return (
    <div
      className="not-mono overflow-hidden rounded-2xl border border-[color:var(--soft-border)]"
      style={{ background: theme.surface, color: theme.text, fontFamily: theme.font }}
    >
      <div
        className="flex items-center justify-between border-b px-5 py-3"
        style={{ borderColor: theme.border }}
      >
        <span className="font-mono text-[10px] uppercase tracking-[0.18em]" style={{ color: theme.mutedText }}>
          {theme.name} surface
        </span>
        <span className="font-mono text-[10px]" style={{ color: theme.mutedText }}>
          {theme.surface} · r{theme.controlRadius}px
        </span>
      </div>

      <div className="space-y-6 p-6">
        {/* Buttons */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            className="px-4 py-2 text-sm font-medium transition-transform active:scale-[0.98]"
            style={{
              background: theme.accent,
              color: theme.accentInk,
              borderRadius: theme.controlRadius,
            }}
          >
            Primary action
          </button>
          <button
            type="button"
            className="border px-4 py-2 text-sm font-medium"
            style={{
              borderColor: theme.border,
              color: theme.text,
              borderRadius: theme.controlRadius,
              background: 'transparent',
            }}
          >
            Secondary
          </button>
          <button
            type="button"
            className="px-3 py-2 text-sm"
            style={{ color: theme.mutedText, borderRadius: theme.controlRadius }}
          >
            Ghost
          </button>
          <span
            className="inline-flex items-center gap-1 border px-2.5 py-0.5 text-xs font-medium"
            style={{
              borderColor: theme.accent + '66',
              color: theme.accent,
              borderRadius: 999,
            }}
          >
            Badge
          </span>
        </div>

        {/* Card + form */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div
            className="border p-4"
            style={{
              background: theme.panel,
              borderColor: theme.border,
              borderRadius: theme.radius,
            }}
          >
            <p className="text-sm font-semibold">Card component</p>
            <p className="mt-1 text-xs leading-relaxed" style={{ color: theme.mutedText }}>
              Surface, border, radius and type are all pulled straight from the
              scanned tokens.
            </p>
            <div className="mt-3 flex items-center justify-between">
              <span className="text-xs" style={{ color: theme.mutedText }}>
                Enable syncing
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={toggled}
                onClick={() => setToggled((value) => !value)}
                className="relative h-5 w-9 rounded-full transition-colors"
                style={{ background: toggled ? theme.accent : theme.border }}
              >
                <span
                  className="absolute top-0.5 size-4 rounded-full bg-white shadow transition-all"
                  style={{ left: toggled ? 18 : 2 }}
                />
              </button>
            </div>
          </div>

          <div
            className="border p-4"
            style={{
              background: theme.panel,
              borderColor: theme.border,
              borderRadius: theme.radius,
            }}
          >
            <label
              className="text-xs font-medium"
              style={{ color: theme.mutedText }}
              htmlFor={`lab-input-${theme.name}`}
            >
              Email address
            </label>
            <input
              id={`lab-input-${theme.name}`}
              placeholder="you@company.com"
              className="mt-1.5 w-full border px-3 py-2 text-sm outline-none transition-shadow focus:ring-2"
              style={
                {
                  background: theme.surface,
                  borderColor: theme.border,
                  color: theme.text,
                  borderRadius: theme.controlRadius,
                  '--tw-ring-color': theme.accent + '66',
                } as React.CSSProperties
              }
            />
            <div
              className="mt-3 border-l-2 px-3 py-2 text-xs"
              style={{
                borderColor: theme.accent,
                background: theme.accent + '14',
                color: theme.text,
                borderTopRightRadius: theme.controlRadius,
                borderBottomRightRadius: theme.controlRadius,
              }}
            >
              Inline notice rebuilt with the accent at 8% opacity.
            </div>
          </div>
        </div>

        {/* Nav strip */}
        <div
          className="flex items-center gap-1 border p-1"
          style={{ borderColor: theme.border, borderRadius: theme.controlRadius + 4 }}
        >
          {['Overview', 'Tokens', 'Usage'].map((label, index) => (
            <span
              key={label}
              className="px-3 py-1.5 text-xs font-medium"
              style={{
                background: index === 0 ? theme.accent : 'transparent',
                color: index === 0 ? theme.accentInk : theme.mutedText,
                borderRadius: theme.controlRadius,
              }}
            >
              {label}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

export function ComponentLab({
  color,
  shape,
  type,
  detectedComponents,
}: {
  color: ColorSystem
  shape: ShapeSystem
  type: TypeSystem
  detectedComponents: Array<{ type: string; variant?: string; confidence: number; states?: string[] }>
}) {
  const themes = useMemo(() => deriveThemes(color, shape, type), [color, shape, type])

  return (
    <SectionShell
      id="components"
      overline={`Components · rebuilt from tokens${detectedComponents.length ? ` · ${detectedComponents.length} detected` : ''}`}
      title="Component lab"
      lede="Every primitive below is reconstructed from the extracted system — surfaces, ink, accent, radii and type ride the scanned tokens, not screenshots. This is what new UI inherits when an agent installs this contract."
    >
      <div className={cn('grid gap-4', themes.length > 1 && 'lg:grid-cols-2')}>
        {themes.map((theme) => (
          <LabPreview key={theme.name} theme={theme} />
        ))}
      </div>

      {detectedComponents.length > 0 && (
        <div className="mt-8">
          <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            Detected on the live site
          </p>
          <div className="flex flex-wrap gap-2">
            {detectedComponents.slice(0, 24).map((component, index) => (
              <span
                key={`${component.type}-${component.variant ?? index}`}
                className="inline-flex items-center gap-2 rounded-lg border border-[color:var(--soft-border)] bg-card/40 px-2.5 py-1.5 font-mono text-[11px] text-muted-foreground"
                title={component.states?.length ? `states: ${component.states.join(', ')}` : undefined}
              >
                <span className="text-foreground">{component.type}</span>
                {component.variant ? <span className="opacity-70">{component.variant}</span> : null}
                <span
                  className={cn(
                    'size-1.5 rounded-full',
                    component.confidence >= 0.8
                      ? 'bg-[oklch(0.72_0.12_165)]'
                      : component.confidence >= 0.5
                        ? 'bg-[oklch(0.8_0.12_85)]'
                        : 'bg-border'
                  )}
                />
              </span>
            ))}
          </div>
        </div>
      )}
    </SectionShell>
  )
}
