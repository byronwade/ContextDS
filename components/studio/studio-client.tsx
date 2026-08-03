'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  CheckIcon,
  CopyIcon,
  DownloadSimpleIcon,
  EyeIcon,
  FileTextIcon,
  LockIcon,
  PlusIcon,
  SparkleIcon,
  TrashIcon,
} from '@phosphor-icons/react'
import { AppShell } from '@/components/organisms/app-shell'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ensureGoogleFont, useCopy, downloadText, Overline } from '@/components/dossier/shared'
import {
  DEFAULT_STUDIO_SYSTEM,
  generateAuthoredDesignMd,
  slugify,
  studioPhilosophy,
  typeScale,
  type StudioSystem,
} from '@/lib/contracts/authored-contract'
import { parseColor, inkFor } from '@/lib/analyzers/design-philosophy'
import { useEntitlements } from '@/lib/premium'
import { cn } from '@/lib/utils'

const SCALES = [
  { ratio: 1.2, label: 'Minor third · 1.2' },
  { ratio: 1.25, label: 'Major third · 1.25' },
  { ratio: 1.333, label: 'Perfect fourth · 1.333' },
  { ratio: 1.414, label: 'Aug. fourth · 1.414' },
  { ratio: 1.618, label: 'Golden · 1.618' },
]

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
        {label}
      </span>
      {children}
    </label>
  )
}

function Segmented<T extends string | number>({
  value,
  options,
  onChange,
}: {
  value: T
  options: Array<{ value: T; label: string }>
  onChange: (value: T) => void
}) {
  return (
    <div className="flex gap-0.5 rounded-full border border-[color:var(--soft-border)] bg-secondary/40 p-0.5">
      {options.map((option) => (
        <button
          key={String(option.value)}
          type="button"
          onClick={() => onChange(option.value)}
          className={cn(
            'flex-1 rounded-full px-2.5 py-1.5 text-xs transition-colors',
            option.value === value
              ? 'border border-[var(--ui-border)] bg-[var(--ui-paper)] text-foreground'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}

function StudioPreview({ system }: { system: StudioSystem }) {
  const byRole = useMemo(() => {
    const map = new Map(system.colors.map((color) => [color.role, color.value]))
    return {
      background: map.get('background') ?? '#0e0f12',
      foreground: map.get('foreground') ?? '#f4f4f5',
      muted: map.get('muted') ?? '#8b8f98',
      primary: map.get('primary') ?? '#5eead4',
      border: map.get('border') ?? '#26282e',
    }
  }, [system.colors])

  useEffect(() => {
    ;[system.fontDisplay, system.fontBody, system.fontMono]
      .filter(Boolean)
      .forEach(ensureGoogleFont)
  }, [system.fontDisplay, system.fontBody, system.fontMono])

  const primaryInk = (() => {
    const parsed = parseColor(byRole.primary)
    return parsed ? inkFor(parsed) : '#0a0a0a'
  })()

  const sizes = typeScale(system)
  const shadow =
    system.depth === 'flat'
      ? 'none'
      : system.depth === 'soft'
        ? '0 1px 2px rgba(0,0,0,0.12)'
        : '0 1px 2px rgba(0,0,0,0.1), 0 16px 40px rgba(0,0,0,0.2)'

  return (
    <div
      className="not-mono overflow-hidden rounded-2xl border border-[color:var(--soft-border)]"
      style={{
        background: byRole.background,
        color: byRole.foreground,
        fontFamily: `'${system.fontBody}', sans-serif`,
      }}
    >
      <div className="space-y-5 p-6">
        <p
          style={{
            fontFamily: `'${system.fontDisplay}', serif`,
            fontSize: sizes[Math.min(3, sizes.length - 1)],
            lineHeight: 1.1,
          }}
        >
          {system.name}
        </p>
        <p style={{ color: byRole.muted, fontSize: system.baseSize * 0.875 }}>
          Live preview rendered entirely from your authored tokens — type scale,
          {` ${system.spacingBase}px grid, ${system.radius}px corners.`}
        </p>
        <div className="flex flex-wrap items-center" style={{ gap: system.spacingBase }}>
          <button
            type="button"
            style={{
              background: byRole.primary,
              color: primaryInk,
              borderRadius: system.radius,
              padding: `${system.spacingBase}px ${system.spacingBase * 2}px`,
              fontSize: system.baseSize * 0.875,
              fontWeight: 500,
              boxShadow: shadow,
            }}
          >
            Primary action
          </button>
          <button
            type="button"
            style={{
              border: `1px solid ${byRole.border}`,
              color: byRole.foreground,
              borderRadius: system.radius,
              padding: `${system.spacingBase}px ${system.spacingBase * 2}px`,
              fontSize: system.baseSize * 0.875,
              background: 'transparent',
            }}
          >
            Secondary
          </button>
          <span
            style={{
              border: `1px solid ${byRole.primary}66`,
              color: byRole.primary,
              borderRadius: 999,
              padding: `2px ${system.spacingBase * 1.25}px`,
              fontSize: system.baseSize * 0.75,
              fontFamily: `'${system.fontMono}', monospace`,
            }}
          >
            badge
          </span>
        </div>
        <div
          style={{
            background: `color-mix(in oklab, ${byRole.foreground} 4%, ${byRole.background})`,
            border: `1px solid ${byRole.border}`,
            borderRadius: system.radius * 1.25,
            padding: system.spacingBase * 2,
            boxShadow: shadow,
          }}
        >
          <p style={{ fontSize: system.baseSize * 0.9375, fontWeight: 600 }}>Card surface</p>
          <p style={{ color: byRole.muted, fontSize: system.baseSize * 0.8125, marginTop: system.spacingBase / 2 }}>
            Panels mix 4% foreground into the background — depth stays {system.depth}.
          </p>
          <div
            style={{
              marginTop: system.spacingBase * 1.5,
              display: 'flex',
              gap: system.spacingBase / 2,
              fontFamily: `'${system.fontMono}', monospace`,
              fontSize: system.baseSize * 0.6875,
              color: byRole.muted,
            }}
          >
            {typeScale(system)
              .slice(0, 5)
              .map((size) => (
                <span
                  key={size}
                  style={{
                    border: `1px solid ${byRole.border}`,
                    borderRadius: system.radius / 2,
                    padding: `2px ${system.spacingBase * 0.75}px`,
                  }}
                >
                  {size}px
                </span>
              ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function StudioClient() {
  const [system, setSystem] = useState<StudioSystem>(DEFAULT_STUDIO_SYSTEM)
  const [view, setView] = useState<'preview' | 'contract'>('preview')
  const { isPro, ready } = useEntitlements()
  const { copiedKey, copy } = useCopy()

  const update = <K extends keyof StudioSystem>(key: K, value: StudioSystem[K]) => {
    setSystem((current) => ({
      ...current,
      [key]: value,
      ...(key === 'name' ? { slug: slugify(String(value)) } : {}),
    }))
  }

  const markdown = useMemo(() => generateAuthoredDesignMd(system), [system])
  const philosophy = useMemo(() => studioPhilosophy(system), [system])

  return (
    <AppShell currentPage="studio">
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
          <header className="flex flex-col gap-4 border-b border-border/40 pb-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <Overline>Studio · author a Design Contract</Overline>
              <h1 className="mt-2 font-serif text-4xl tracking-tight text-foreground">
                {system.name}
              </h1>
              <p className="mt-2 max-w-xl text-sm text-muted-foreground">
                Define the system by hand — same grammar the scanner produces, installable
                with <span className="font-mono text-xs">npx github:byronwade/Design init</span>.
              </p>
            </div>
            <div className="flex items-center gap-2">
              {!isPro && ready ? (
                <Button asChild variant="outline" size="sm" className="gap-2">
                  <Link href="/pricing">
                    <SparkleIcon className="size-3.5 text-[var(--ui-accent)]" />
                    Unlock export with Pro
                  </Link>
                </Button>
              ) : null}
              <Button
                size="sm"
                className="gap-2"
                disabled={!isPro}
                title={isPro ? 'Download DESIGN.md' : 'Exporting authored contracts is a Pro feature'}
                onClick={() => downloadText(`${system.slug}-DESIGN.md`, markdown)}
              >
                {isPro ? <DownloadSimpleIcon className="size-3.5" /> : <LockIcon className="size-3.5" />}
                Export DESIGN.md
              </Button>
            </div>
          </header>

          <div className="mt-8 grid gap-10 lg:grid-cols-[380px_1fr]">
            {/* Authoring panel */}
            <div className="space-y-8">
              <Field label="System name">
                <Input
                  value={system.name}
                  onChange={(event) => update('name', event.target.value)}
                  className="rounded-xl border-[color:var(--soft-border)] bg-card/60"
                />
              </Field>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                    Color roles
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      update('colors', [
                        ...system.colors,
                        {
                          id: `custom-${Date.now()}`,
                          role: `accent-${system.colors.length}`,
                          value: '#888888',
                        },
                      ])
                    }
                    className="inline-flex items-center gap-1 font-mono text-[11px] text-muted-foreground transition-colors hover:text-foreground"
                  >
                    <PlusIcon className="size-3" /> add role
                  </button>
                </div>
                <div className="space-y-1.5">
                  {system.colors.map((color) => (
                    <div key={color.id} className="flex items-center gap-2">
                      <label className="relative size-8 shrink-0 cursor-pointer overflow-hidden rounded-lg border border-[color:var(--soft-border)]">
                        <input
                          type="color"
                          value={/^#[0-9a-fA-F]{6}$/.test(color.value) ? color.value : '#888888'}
                          onChange={(event) =>
                            update(
                              'colors',
                              system.colors.map((entry) =>
                                entry.id === color.id
                                  ? { ...entry, value: event.target.value }
                                  : entry
                              )
                            )
                          }
                          className="absolute -inset-2 size-12 cursor-pointer"
                          aria-label={`${color.role} color`}
                        />
                      </label>
                      <Input
                        value={color.role}
                        onChange={(event) =>
                          update(
                            'colors',
                            system.colors.map((entry) =>
                              entry.id === color.id
                                ? { ...entry, role: event.target.value }
                                : entry
                            )
                          )
                        }
                        className="h-8 flex-1 rounded-lg border-[color:var(--soft-border)] bg-card/60 font-mono text-xs"
                        aria-label="Role name"
                      />
                      <span className="w-[72px] shrink-0 font-mono text-[11px] text-muted-foreground">
                        {color.value}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          update(
                            'colors',
                            system.colors.filter((entry) => entry.id !== color.id)
                          )
                        }
                        disabled={system.colors.length <= 2}
                        className="text-muted-foreground/60 transition-colors hover:text-destructive disabled:opacity-30"
                        aria-label={`Remove ${color.role}`}
                      >
                        <TrashIcon className="size-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <Field label="Display font">
                  <Input
                    value={system.fontDisplay}
                    onChange={(event) => update('fontDisplay', event.target.value)}
                    className="rounded-xl border-[color:var(--soft-border)] bg-card/60"
                    placeholder="e.g. Geist"
                  />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Body font">
                    <Input
                      value={system.fontBody}
                      onChange={(event) => update('fontBody', event.target.value)}
                      className="rounded-xl border-[color:var(--soft-border)] bg-card/60"
                    />
                  </Field>
                  <Field label="Mono font">
                    <Input
                      value={system.fontMono}
                      onChange={(event) => update('fontMono', event.target.value)}
                      className="rounded-xl border-[color:var(--soft-border)] bg-card/60"
                    />
                  </Field>
                </div>
              </div>

              <Field label={`Type scale · base ${system.baseSize}px`}>
                <div className="space-y-2">
                  <Segmented
                    value={system.scaleRatio}
                    options={SCALES.map((scale) => ({
                      value: scale.ratio,
                      label: String(scale.ratio),
                    }))}
                    onChange={(ratio) => update('scaleRatio', ratio)}
                  />
                  <p className="font-mono text-[10px] text-muted-foreground">
                    {SCALES.find((scale) => scale.ratio === system.scaleRatio)?.label} →{' '}
                    {typeScale(system)
                      .map((size) => `${size}`)
                      .join(' · ')}
                    px
                  </p>
                </div>
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Spacing grid">
                  <Segmented
                    value={system.spacingBase}
                    options={[
                      { value: 4 as const, label: '4px' },
                      { value: 8 as const, label: '8px' },
                    ]}
                    onChange={(base) => update('spacingBase', base)}
                  />
                </Field>
                <Field label="Depth">
                  <Segmented
                    value={system.depth}
                    options={[
                      { value: 'flat' as const, label: 'Flat' },
                      { value: 'soft' as const, label: 'Soft' },
                      { value: 'layered' as const, label: 'Deep' },
                    ]}
                    onChange={(depth) => update('depth', depth)}
                  />
                </Field>
              </div>

              <Field label={`Corner radius · ${system.radius}px`}>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min={0}
                    max={28}
                    step={1}
                    value={system.radius}
                    onChange={(event) => update('radius', Number(event.target.value))}
                    className="flex-1 accent-[var(--ui-accent)]"
                    aria-label="Corner radius"
                  />
                  <span
                    className="block size-8 shrink-0 border border-border bg-secondary/50"
                    style={{ borderRadius: system.radius }}
                    aria-hidden
                  />
                </div>
              </Field>

              <Field label="Philosophy note (optional)">
                <textarea
                  value={system.philosophyNote}
                  onChange={(event) => update('philosophyNote', event.target.value)}
                  rows={3}
                  placeholder="What should agents feel when they build with this system?"
                  className="w-full rounded-xl border border-[color:var(--soft-border)] bg-card/60 px-3 py-2 text-sm text-foreground outline-none transition-shadow placeholder:text-muted-foreground/60 focus:ring-2 focus:ring-ring/40"
                />
              </Field>
            </div>

            {/* Preview / contract panel */}
            <div className="min-w-0">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div className="flex gap-0.5 rounded-full border border-[color:var(--soft-border)] bg-secondary/40 p-0.5">
                  {(
                    [
                      ['preview', 'Preview', EyeIcon],
                      ['contract', 'DESIGN.md', FileTextIcon],
                    ] as const
                  ).map(([value, label, Icon]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setView(value)}
                      className={cn(
                        'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs transition-colors',
                        view === value
                          ? 'border border-[var(--ui-border)] bg-[var(--ui-paper)] text-foreground'
                          : 'text-muted-foreground hover:text-foreground'
                      )}
                    >
                      <Icon className="size-3" />
                      {label}
                    </button>
                  ))}
                </div>
                {view === 'contract' ? (
                  <Button
                    size="xs"
                    variant="ghost"
                    className="gap-1 font-mono"
                    disabled={!isPro}
                    onClick={() => copy('studio-md', markdown)}
                    title={isPro ? 'Copy DESIGN.md' : 'Copying the contract is a Pro feature'}
                  >
                    {copiedKey === 'studio-md' ? (
                      <CheckIcon className="size-3" />
                    ) : isPro ? (
                      <CopyIcon className="size-3" />
                    ) : (
                      <LockIcon className="size-3" />
                    )}
                    copy
                  </Button>
                ) : null}
              </div>

              {view === 'preview' ? (
                <div className="space-y-6">
                  <StudioPreview system={system} />
                  <div className="rounded-2xl border border-[color:var(--soft-border)] bg-card/40 p-5">
                    <Overline>Generated philosophy</Overline>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                      {philosophy.statement}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {philosophy.traits.map((trait) => (
                        <span
                          key={trait}
                          className="rounded-full border border-[color:var(--soft-border)] px-2.5 py-0.5 font-mono text-[10px] text-muted-foreground"
                        >
                          {trait}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="relative overflow-hidden rounded-2xl border border-[color:var(--soft-border)] bg-card/40">
                  <pre
                    className={cn(
                      'max-h-[640px] overflow-auto p-5 font-mono text-[11.5px] leading-relaxed text-foreground/90',
                      !isPro && 'max-h-[420px] select-none overflow-hidden'
                    )}
                    aria-hidden={!isPro}
                  >
                    {isPro ? markdown : markdown.split('\n').slice(0, 32).join('\n')}
                  </pre>
                  {!isPro && (
                    <div className="absolute inset-x-0 bottom-0 flex flex-col items-center gap-3 bg-gradient-to-t from-background via-background/90 to-transparent px-6 pb-8 pt-20 text-center">
                      <LockIcon className="size-4 text-muted-foreground" />
                      <p className="max-w-sm text-sm text-muted-foreground">
                        The full contract — front-matter tokens, agent rules and export —
                        ships with Pro.
                      </p>
                      <Button asChild size="sm" className="gap-2">
                        <Link href="/pricing">
                          <SparkleIcon className="size-3.5" />
                          Upgrade to Pro
                        </Link>
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  )
}
