'use client'

/**
 * Design canvas — the live artboard for the working system.
 *
 * Everything inside the artboard is painted from `--dc-*` custom properties, so
 * the preview is a pure function of the WorkingSystem and never inherits the
 * app's own `--ui-*` theme. The rail edits the same system through
 * `patchSystem`, which is the only way tokens change.
 */

import type { CSSProperties, ReactNode } from 'react'
import { useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import { ensureGoogleFont } from '@/components/dossier/shared'
import { Button } from '@/components/ui/button'
import { contrastRatio, inkFor, parseColor, wcagGrade } from '@/lib/analyzers/design-philosophy'
import { spacingScale, typeScale } from '@/lib/contracts/authored-contract'
import {
  colorRole,
  createWorkingSystem,
  originLabel,
  type SystemPatch,
  systemToCssVars,
  toStudioSystem,
  type WorkingSystem,
} from '@/lib/design-system/working-system'
import {
  CheckCircleIcon,
  CircleNotchIcon,
  DownloadSimpleIcon,
  FloppyDiskIcon,
  PaletteIcon,
  SlidersHorizontalIcon,
  SparkleIcon,
  WarningCircleIcon,
} from '@/lib/phosphor'
import { cn } from '@/lib/utils'
import {
  getCanvasDraftServerSnapshot,
  getCanvasDraftSnapshot,
  subscribeCanvasDraft,
  useCanvasStore,
} from '@/stores/canvas-store'

const ROLES = ['background', 'foreground', 'muted', 'primary', 'border'] as const
const FONTS = [
  { key: 'fontDisplay', label: 'Display' },
  { key: 'fontBody', label: 'Body' },
  { key: 'fontMono', label: 'Mono' },
] as const
const SPACING_OPTIONS = [
  { value: 4 as const, label: '4px' },
  { value: 8 as const, label: '8px' },
]
const DEPTH_OPTIONS = [
  { value: 'flat' as const, label: 'Flat' },
  { value: 'soft' as const, label: 'Soft' },
  { value: 'layered' as const, label: 'Layered' },
]

const OVERLINE = 'font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground'
const HAIRLINE = 'border-[color:var(--soft-border)]'
/** Animates token changes instead of snapping them; keyed off system.revision. */
const EASE =
  'background-color 260ms ease, color 260ms ease, border-color 260ms ease, border-radius 260ms ease, box-shadow 260ms ease'

/** n × the system's spacing base / base font size. */
const sp = (n: number) => `calc(var(--dc-space) * ${n})`
const fs = (n: number) => `calc(var(--dc-base-size) * ${n})`
const RULE = '1px solid var(--dc-border)'
const MONO: CSSProperties = { fontFamily: 'var(--dc-font-mono), monospace' }
const DISPLAY: CSSProperties = { fontFamily: 'var(--dc-font-display), serif' }
const SURFACE: CSSProperties = {
  border: RULE,
  borderRadius: 'var(--dc-radius)',
  boxShadow: 'var(--dc-shadow)',
  transition: EASE,
}

function hexFor(value: string): string {
  const parsed = parseColor(value)
  return parsed ? parsed.hex.slice(0, 7) : '#000000'
}

// --- rail primitives ---------------------------------------------------------

function RailGroup({ label, children }: { label: string; children: ReactNode }) {
  return (
    <section className={cn('border-b px-4 py-4 last:border-b-0', HAIRLINE)}>
      <p className={cn(OVERLINE, 'mb-3')}>{label}</p>
      <div className="space-y-3">{children}</div>
    </section>
  )
}

function ColorField({
  role,
  value,
  onChange,
}: {
  role: string
  value: string
  onChange: (next: string) => void
}) {
  const hex = hexFor(value)
  return (
    <label className="flex items-center gap-2.5">
      <span
        aria-hidden
        className={cn('size-6 shrink-0 rounded-md border', HAIRLINE)}
        style={{ background: value, transition: EASE }}
      />
      <span className="min-w-0 flex-1">
        <span className="block text-xs text-foreground">{role}</span>
        <span className="block truncate font-mono text-[11px] text-muted-foreground">{hex}</span>
      </span>
      <input
        type="color"
        aria-label={`${role} color`}
        value={hex}
        onChange={(event) => onChange(event.target.value)}
        className={cn(
          'size-7 shrink-0 cursor-pointer rounded-md border bg-transparent p-0.5',
          HAIRLINE
        )}
      />
    </label>
  )
}

type SliderSpec = {
  label: string
  value: number
  display: string
  min: number
  max: number
  step?: number
  onChange: (next: number) => void
}

function SliderField({ label, value, display, min, max, step = 1, onChange }: SliderSpec) {
  return (
    <label className="block">
      <span className="mb-1 flex items-baseline justify-between gap-2">
        <span className="text-xs text-foreground">{label}</span>
        <span className="font-mono text-[11px] tabular-nums text-muted-foreground">{display}</span>
      </span>
      <input
        type="range"
        aria-label={label}
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="h-1.5 w-full cursor-pointer accent-[var(--ui-accent)]"
      />
    </label>
  )
}

function Segmented<T extends string | number>({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: T
  options: Array<{ value: T; label: string }>
  onChange: (next: T) => void
}) {
  return (
    <fieldset className="min-w-0 border-0 p-0">
      <legend className="mb-1 px-0 text-xs text-foreground">{label}</legend>
      <div className={cn('flex gap-0.5 rounded-full border bg-secondary/40 p-0.5', HAIRLINE)}>
        {options.map((option) => (
          <button
            key={String(option.value)}
            type="button"
            aria-pressed={option.value === value}
            onClick={() => onChange(option.value)}
            className={cn(
              'flex-1 rounded-full px-2 py-1 text-[11px] transition-colors',
              option.value === value
                ? 'bg-background text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {option.label}
          </button>
        ))}
      </div>
    </fieldset>
  )
}

function TextField({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (next: string) => void
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs text-foreground">{label}</span>
      <input
        type="text"
        aria-label={label}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={cn(
          'h-7 w-full rounded-md border bg-background/60 px-2 font-mono text-[11px] text-foreground outline-none focus-visible:border-border',
          HAIRLINE
        )}
      />
    </label>
  )
}

/** WCAG safety rail — makes a tweak that breaks legibility immediately visible. */
function ContrastChip({ label, fg, bg }: { label: string; fg: string; bg: string }) {
  const a = parseColor(fg)
  const b = parseColor(bg)
  const ratio = a && b ? contrastRatio(a, b) : 1
  const grade = wcagGrade(ratio)
  const failing = grade === 'fail'
  return (
    <span
      title={`${label} — ${ratio.toFixed(2)}:1 (${grade})`}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 font-mono text-[10px]',
        HAIRLINE,
        failing ? 'text-[var(--ui-danger)]' : 'text-muted-foreground'
      )}
    >
      {failing ? <WarningCircleIcon className="size-3" /> : <CheckCircleIcon className="size-3" />}
      {label} {ratio.toFixed(1)}:1 · {grade}
    </span>
  )
}

// --- artboard specimens ------------------------------------------------------

function Panel({ label, children }: { label: string; children: ReactNode }) {
  return (
    <section>
      <p
        style={{
          ...MONO,
          margin: `0 0 ${sp(1.25)}`,
          color: 'var(--dc-muted)',
          fontSize: 10,
          textTransform: 'uppercase',
          letterSpacing: '0.18em',
        }}
      >
        {label}
      </p>
      {children}
    </section>
  )
}

function AppShellMini() {
  const bar: CSSProperties = { height: 8, borderRadius: 999, background: 'var(--dc-muted)' }
  const navItem: CSSProperties = { color: 'var(--dc-muted)' }
  return (
    <div style={{ ...SURFACE, overflow: 'hidden' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: sp(1),
          padding: sp(1),
          borderBottom: RULE,
          fontSize: fs(0.75),
        }}
      >
        <span
          style={{ width: 10, height: 10, borderRadius: 999, background: 'var(--dc-primary)' }}
        />
        <span style={DISPLAY}>Product</span>
        <span style={{ ...navItem, marginLeft: 'auto' }}>Account</span>
      </div>
      <div style={{ display: 'flex', minHeight: 96 }}>
        <div
          style={{
            ...navItem,
            width: 96,
            display: 'flex',
            flexDirection: 'column',
            gap: sp(0.75),
            padding: sp(1),
            borderRight: RULE,
            fontSize: fs(0.7),
          }}
        >
          <span style={{ color: 'var(--dc-foreground)' }}>Overview</span>
          <span>Systems</span>
          <span>Scans</span>
        </div>
        <div style={{ flex: 1, padding: sp(1) }}>
          <div style={{ ...bar, width: '60%', opacity: 0.5 }} />
          <div style={{ ...bar, width: '40%', marginTop: sp(1), opacity: 0.3 }} />
        </div>
      </div>
    </div>
  )
}

function ControlSpecimens({ ink }: { ink: string }) {
  const base: CSSProperties = {
    borderRadius: 'var(--dc-radius)',
    padding: `${sp(0.85)} ${sp(1.75)}`,
    fontSize: fs(0.875),
    fontFamily: 'var(--dc-font-body), sans-serif',
    background: 'transparent',
    border: '1px solid transparent',
    transition: EASE,
  }
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: sp(1) }}>
      <button
        type="button"
        style={{
          ...base,
          background: 'var(--dc-primary)',
          color: ink,
          boxShadow: 'var(--dc-shadow)',
        }}
      >
        Primary
      </button>
      <button type="button" style={{ ...base, color: 'var(--dc-foreground)', border: RULE }}>
        Secondary
      </button>
      <button type="button" style={{ ...base, color: 'var(--dc-muted)' }}>
        Ghost
      </button>
      <input
        readOnly
        aria-label="Preview input"
        value="hello@studio.com"
        style={{ ...base, color: 'var(--dc-foreground)', border: RULE, minWidth: 180 }}
      />
    </div>
  )
}

function CardSpecimen({ name, sizes, ink }: { name: string; sizes: number[]; ink: string }) {
  const chip: CSSProperties = {
    ...MONO,
    borderRadius: 999,
    padding: `${sp(0.35)} ${sp(1.1)}`,
    fontSize: fs(0.7),
    transition: EASE,
  }
  return (
    <div style={{ ...SURFACE, padding: sp(2) }}>
      <p
        style={{
          ...DISPLAY,
          margin: 0,
          fontSize: sizes[Math.min(3, sizes.length - 1)],
          lineHeight: 1.15,
        }}
      >
        {name}
      </p>
      <p style={{ margin: `${sp(1)} 0 0`, fontSize: fs(1), lineHeight: 1.6 }}>
        Body copy rendered from the same tokens an agent will be held to — type scale, grid and
        corner language all come from this system.
      </p>
      <p
        style={{ ...MONO, margin: `${sp(0.75)} 0 0`, color: 'var(--dc-muted)', fontSize: fs(0.75) }}
      >
        Caption · muted role
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: sp(0.75), marginTop: sp(1.5) }}>
        <span style={{ ...chip, background: 'var(--dc-primary)', color: ink }}>active</span>
        <span style={{ ...chip, border: RULE, color: 'var(--dc-foreground)' }}>draft</span>
        <span style={{ ...chip, border: RULE, color: 'var(--dc-muted)' }}>archived</span>
      </div>
    </div>
  )
}

function TableSpecimen() {
  const cell: CSSProperties = {
    padding: `${sp(0.75)} ${sp(1)}`,
    fontSize: fs(0.8),
    textAlign: 'left',
  }
  return (
    <table style={{ ...SURFACE, width: '100%', borderCollapse: 'collapse', boxShadow: 'none' }}>
      <tbody>
        <tr style={{ borderBottom: RULE, color: 'var(--dc-muted)' }}>
          <th style={cell}>System</th>
          <th style={cell}>Origin</th>
          <th style={cell}>Status</th>
        </tr>
        <tr>
          <td style={cell}>Warm paper</td>
          <td style={{ ...cell, color: 'var(--dc-muted)' }}>scan</td>
          <td style={{ ...cell, color: 'var(--dc-primary)' }}>passing</td>
        </tr>
      </tbody>
    </table>
  )
}

function TypeSpecimen({ sizes }: { sizes: number[] }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: sp(0.75) }}>
      {[...sizes].reverse().map((size) => (
        <div key={size} style={{ display: 'flex', alignItems: 'baseline', gap: sp(1) }}>
          <span
            style={{ ...MONO, width: 56, flexShrink: 0, fontSize: 11, color: 'var(--dc-muted)' }}
          >
            {size}px
          </span>
          <span
            style={{
              ...DISPLAY,
              fontSize: size,
              lineHeight: 1.15,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            Design is a contract
          </span>
        </div>
      ))}
    </div>
  )
}

function SpacingRuler({ steps }: { steps: number[] }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: sp(0.5) }}>
      {steps.map((step) => (
        <div key={step} style={{ textAlign: 'center' }}>
          <div
            style={{
              width: step,
              height: 24,
              borderRadius: 2,
              background: 'var(--dc-primary)',
              opacity: 0.35,
            }}
          />
          <span
            style={{
              ...MONO,
              display: 'block',
              marginTop: 4,
              fontSize: 10,
              color: 'var(--dc-muted)',
            }}
          >
            {step}
          </span>
        </div>
      ))}
    </div>
  )
}

function EmptyState({ onStart }: { onStart: () => void }) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed px-6 py-12 text-center',
        HAIRLINE
      )}
    >
      <PaletteIcon className="size-6 text-muted-foreground" />
      <p className={OVERLINE}>No system on the canvas</p>
      <p className="max-w-sm text-sm text-muted-foreground">
        Scan a site to seed a system from real tokens, or start from a blank canvas and author one
        by hand.
      </p>
      <Button size="sm" variant="outline" onClick={onStart}>
        <SparkleIcon /> Start from scratch
      </Button>
    </div>
  )
}

// --- canvas ------------------------------------------------------------------

export function DesignCanvas({
  className,
  onSave,
  saving = false,
}: {
  className?: string
  onSave?: (system: WorkingSystem) => void
  saving?: boolean
}) {
  const storeSystem = useCanvasStore((state) => state.system)
  const dirty = useCanvasStore((state) => state.dirty)
  const lastPatchSummary = useCanvasStore((state) => state.lastPatchSummary)
  const patchSystem = useCanvasStore((state) => state.patchSystem)
  const openCanvas = useCanvasStore((state) => state.openCanvas)
  const [exporting, setExporting] = useState(false)
  const [exportError, setExportError] = useState<string | null>(null)

  // Effect-free hydration: the persisted draft comes from a cached external
  // store snapshot, never from setState inside an effect. Edits run through
  // patchSystem, which pulls the draft into the store on first use.
  const draft = useSyncExternalStore(
    subscribeCanvasDraft,
    getCanvasDraftSnapshot,
    getCanvasDraftServerSnapshot
  )
  const system = storeSystem ?? draft

  useEffect(() => {
    if (!system) return
    ;[system.fontDisplay, system.fontBody, system.fontMono]
      .filter(Boolean)
      .forEach(ensureGoogleFont)
  }, [system])

  const vars = useMemo(() => (system ? systemToCssVars(system) : {}), [system])
  const sizes = useMemo(() => (system ? typeScale(toStudioSystem(system)) : []), [system])
  const spaces = useMemo(() => (system ? spacingScale(toStudioSystem(system)) : []), [system])

  if (!system) {
    return (
      <div className={className}>
        <EmptyState onStart={() => openCanvas(createWorkingSystem())} />
      </div>
    )
  }

  const patch = (next: SystemPatch, summary: string) => patchSystem(next, summary)
  const background = colorRole(system, 'background') ?? '#0e0f12'
  const foreground = colorRole(system, 'foreground') ?? '#f4f4f5'
  const primary = colorRole(system, 'primary') ?? '#5eead4'
  const parsedPrimary = parseColor(primary)
  const ink = parsedPrimary ? inkFor(parsedPrimary) : '#0a0a0a'

  // Ranges mirror the clamps in applyPatch, so the rail can never author a
  // value the system would silently reject.
  const sliders: SliderSpec[] = [
    {
      label: 'Radius',
      value: system.radius,
      display: `${system.radius}px`,
      min: 0,
      max: 48,
      onChange: (next) => patch({ radius: next }, `radius → ${next}px`),
    },
    {
      label: 'Base size',
      value: system.baseSize,
      display: `${system.baseSize}px`,
      min: 10,
      max: 24,
      onChange: (next) => patch({ baseSize: next }, `base size → ${next}px`),
    },
    {
      label: 'Scale ratio',
      value: system.scaleRatio,
      display: system.scaleRatio.toFixed(3),
      min: 1.05,
      max: 1.8,
      step: 0.005,
      onChange: (next) => patch({ scaleRatio: next }, `scale → ${next.toFixed(3)}`),
    },
  ]

  const specimens: Array<[string, ReactNode]> = [
    ['App shell', <AppShellMini key="shell" />],
    ['Controls', <ControlSpecimens key="controls" ink={ink} />],
    ['Surface', <CardSpecimen key="card" name={system.name} sizes={sizes} ink={ink} />],
    ['Data', <TableSpecimen key="table" />],
    [
      `Type scale · ${system.baseSize}px × ${system.scaleRatio}`,
      <TypeSpecimen key="type" sizes={sizes} />,
    ],
    [`Spacing · ${system.spacingBase}px grid`, <SpacingRuler key="space" steps={spaces} />],
  ]

  return (
    <div className={cn('flex min-w-0 flex-col', className)}>
      <header className={cn('flex flex-wrap items-center gap-3 border-b pb-3', HAIRLINE)}>
        <input
          type="text"
          aria-label="System name"
          value={system.name}
          onChange={(event) => patch({ name: event.target.value }, `name → ${event.target.value}`)}
          className="min-w-0 flex-1 bg-transparent font-serif text-xl tracking-tight text-foreground outline-none"
        />
        <span className={OVERLINE}>{originLabel(system.origin)}</span>
        <Button
          size="sm"
          variant="outline"
          disabled={exporting}
          data-testid="canvas-export-pack"
          onClick={() => {
            void (async () => {
              setExporting(true)
              setExportError(null)
              try {
                const response = await fetch('/api/contracts/authored', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ system: toStudioSystem(system) }),
                })
                if (!response.ok) {
                  const data = (await response.json().catch(() => null)) as {
                    error?: string
                  } | null
                  throw new Error(data?.error || `Export failed (${response.status})`)
                }
                const blob = await response.blob()
                const disposition = response.headers.get('Content-Disposition') || ''
                const match = disposition.match(/filename="([^"]+)"/)
                const href = URL.createObjectURL(blob)
                const anchor = document.createElement('a')
                anchor.href = href
                anchor.download = match?.[1] || `${system.slug}-design-contract.zip`
                document.body.appendChild(anchor)
                anchor.click()
                anchor.remove()
                URL.revokeObjectURL(href)
              } catch (error) {
                setExportError(error instanceof Error ? error.message : 'Export failed')
              } finally {
                setExporting(false)
              }
            })()
          }}
        >
          {exporting ? <CircleNotchIcon className="animate-spin" /> : <DownloadSimpleIcon />}
          {exporting ? 'Pack…' : 'Export pack'}
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={!dirty || saving}
          onClick={() => onSave?.(system)}
        >
          {saving ? <CircleNotchIcon className="animate-spin" /> : <FloppyDiskIcon />}
          {saving ? 'Saving' : 'Save'}
        </Button>
      </header>

      <div className="flex flex-wrap items-center gap-2 py-2">
        <ContrastChip label="text/bg" fg={foreground} bg={background} />
        <ContrastChip label="primary/bg" fg={primary} bg={background} />
        {lastPatchSummary ? (
          <span className={cn(OVERLINE, 'truncate')}>{lastPatchSummary}</span>
        ) : null}
        {exportError ? (
          <span className="text-xs text-[var(--ui-danger)]" role="alert">
            {exportError}
          </span>
        ) : null}
      </div>

      <div className="grid min-w-0 gap-4 lg:grid-cols-[1fr_260px]">
        <div
          data-revision={system.revision}
          className={cn('not-mono min-w-0 overflow-hidden rounded-2xl border', HAIRLINE)}
          style={
            {
              ...vars,
              background: 'var(--dc-background)',
              color: 'var(--dc-foreground)',
              fontFamily: 'var(--dc-font-body), sans-serif',
              fontSize: 'var(--dc-base-size)',
              transition: EASE,
            } as CSSProperties
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: sp(3), padding: sp(3) }}>
            {specimens.map(([label, node]) => (
              <Panel key={label} label={label}>
                {node}
              </Panel>
            ))}
          </div>
        </div>

        <aside className={cn('h-fit min-w-0 rounded-2xl border', HAIRLINE)}>
          <div className={cn('flex items-center gap-2 border-b px-4 py-3', HAIRLINE)}>
            <SlidersHorizontalIcon className="size-3.5 text-muted-foreground" />
            <p className={OVERLINE}>Tokens</p>
          </div>

          <RailGroup label="Color">
            {ROLES.map((role) => (
              <ColorField
                key={role}
                role={role}
                value={colorRole(system, role) ?? '#000000'}
                onChange={(next) => patch({ colors: { [role]: next } }, `${role} → ${next}`)}
              />
            ))}
          </RailGroup>

          <RailGroup label="Shape & rhythm">
            {sliders.map((slider) => (
              <SliderField key={slider.label} {...slider} />
            ))}
            <Segmented
              label="Spacing grid"
              value={system.spacingBase}
              options={SPACING_OPTIONS}
              onChange={(next) => patch({ spacingBase: next }, `grid → ${next}px`)}
            />
            <Segmented
              label="Depth"
              value={system.depth}
              options={DEPTH_OPTIONS}
              onChange={(next) => patch({ depth: next }, `depth → ${next}`)}
            />
          </RailGroup>

          <RailGroup label="Type">
            {FONTS.map((font) => (
              <TextField
                key={font.key}
                label={font.label}
                value={system[font.key]}
                onChange={(next) =>
                  patch({ [font.key]: next }, `${font.label.toLowerCase()} → ${next}`)
                }
              />
            ))}
          </RailGroup>
        </aside>
      </div>
    </div>
  )
}
