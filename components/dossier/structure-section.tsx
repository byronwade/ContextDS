'use client'

import { useState } from 'react'
import { PlayIcon } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'
import type {
  MotionSystem,
  ShapeSystem,
  SpaceSystem,
} from '@/lib/analyzers/design-philosophy'
import type { TokenLike } from '@/lib/analyzers/design-philosophy'
import { SectionShell, useCopy } from './shared'

function SpacingScale({
  system,
  copy,
  copiedKey,
}: {
  system: SpaceSystem
  copy: (key: string, value: string) => void
  copiedKey: string | null
}) {
  const max = system.valuesPx[system.valuesPx.length - 1] ?? 1
  return (
    <div>
      <div className="mb-3 flex items-baseline justify-between">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          Spacing scale
        </p>
        <p className="font-mono text-[10px] text-muted-foreground">
          {system.base
            ? `${system.base}px grid · ${system.gridFit}% conformance`
            : 'optical (no strict grid)'}
        </p>
      </div>
      <div className="space-y-1">
        {system.valuesPx.slice(0, 14).map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => copy(`space-${value}`, `${value}px`)}
            className="group flex w-full items-center gap-3 rounded-md px-1 py-0.5 text-left hover:bg-secondary/40"
            title={`Copy ${value}px`}
          >
            <span className="w-14 shrink-0 font-mono text-[11px] tabular-nums text-muted-foreground group-hover:text-foreground">
              {copiedKey === `space-${value}` ? 'copied' : `${value}px`}
            </span>
            <span className="h-4 flex-1">
              <span
                className={cn(
                  'block h-full rounded-r-sm bg-foreground/25 transition-colors group-hover:bg-[color-mix(in_oklab,var(--ui-accent)_50%,transparent)]',
                  system.base && value % system.base !== 0 && 'bg-[color-mix(in_oklab,var(--ui-warning)_35%,transparent)]'
                )}
                style={{ width: `${Math.max(2, (value / max) * 100)}%` }}
              />
            </span>
          </button>
        ))}
      </div>
      {system.base ? (
        <p className="mt-3 text-xs text-muted-foreground">
          Amber bars fall off the {system.base}px grid.
        </p>
      ) : null}
    </div>
  )
}

function RadiusTiles({
  system,
  copy,
  copiedKey,
}: {
  system: ShapeSystem
  copy: (key: string, value: string) => void
  copiedKey: string | null
}) {
  if (system.radiiPx.length === 0) return null
  return (
    <div>
      <div className="mb-3 flex items-baseline justify-between">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          Corner radii
        </p>
        <p className="font-mono text-[10px] text-muted-foreground">{system.character}</p>
      </div>
      <div className="flex flex-wrap gap-3">
        {system.radiiPx.slice(0, 8).map((radius) => (
          <button
            key={radius}
            type="button"
            onClick={() => copy(`radius-${radius}`, `${radius}px`)}
            className="group flex flex-col items-center gap-2"
            title={`Copy ${radius}px`}
          >
            <span
              className="block size-16 border border-border/80 bg-secondary/40 transition-colors group-hover:border-[color-mix(in_oklab,var(--ui-accent)_60%,transparent)] group-hover:bg-secondary/70"
              style={{ borderRadius: `${Math.min(radius, 32)}px` }}
            />
            <span className="font-mono text-[10px] tabular-nums text-muted-foreground group-hover:text-foreground">
              {copiedKey === `radius-${radius}` ? 'copied' : `${radius}px`}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}

function ShadowTiles({
  shadows,
  copy,
  copiedKey,
}: {
  shadows: TokenLike[]
  copy: (key: string, value: string) => void
  copiedKey: string | null
}) {
  if (shadows.length === 0) return null
  return (
    <div>
      <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
        Elevation
      </p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {shadows.slice(0, 6).map((token, index) => {
          const value = String(token.value)
          return (
            <button
              key={`${value}-${index}`}
              type="button"
              onClick={() => copy(`shadow-${index}`, value)}
              className="group rounded-xl border border-[color:var(--soft-border)] bg-card/40 p-4 text-left transition-colors hover:bg-card/70"
              title={`Copy ${value}`}
            >
              <span
                className="mx-auto block h-14 w-full max-w-[96px] rounded-lg bg-card"
                style={{ boxShadow: value }}
              />
              <span className="mt-3 block truncate font-mono text-[10px] text-muted-foreground group-hover:text-foreground">
                {copiedKey === `shadow-${index}` ? 'copied' : value}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function MotionRow({
  system,
  motionTokens,
}: {
  system: MotionSystem
  motionTokens: TokenLike[]
}) {
  const [runKey, setRunKey] = useState(0)
  if (system.durationsMs.length === 0 && system.easings.length === 0 && motionTokens.length === 0) {
    return null
  }
  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          Motion {system.tempo ? `· ${system.tempo}` : ''}
        </p>
        <button
          type="button"
          onClick={() => setRunKey((key) => key + 1)}
          className="inline-flex items-center gap-1.5 rounded-md border border-[color:var(--soft-border)] px-2 py-1 font-mono text-[10px] text-muted-foreground transition-colors hover:text-foreground"
        >
          <PlayIcon className="size-3" />
          replay
        </button>
      </div>
      <div className="space-y-2">
        {system.durationsMs.slice(0, 5).map((duration) => (
          <div key={duration} className="flex items-center gap-3">
            <span className="w-14 shrink-0 font-mono text-[11px] tabular-nums text-muted-foreground">
              {duration}ms
            </span>
            <span className="relative h-5 flex-1 overflow-hidden rounded-full bg-secondary/40">
              <span
                key={runKey}
                className="absolute left-0 top-1/2 size-3 -translate-y-1/2 rounded-full bg-[var(--ui-accent)]"
                style={{
                  animation: `dossier-slide ${duration}ms ${system.easings[0] ?? 'ease-out'} forwards`,
                }}
              />
            </span>
          </div>
        ))}
      </div>
      {system.easings.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {system.easings.slice(0, 4).map((easing) => (
            <span
              key={easing}
              className="rounded-md border border-[color:var(--soft-border)] px-2 py-1 font-mono text-[10px] text-muted-foreground"
            >
              {easing}
            </span>
          ))}
        </div>
      )}
      <style>{`@keyframes dossier-slide { from { left: 0% } to { left: calc(100% - 12px) } }`}</style>
    </div>
  )
}

export function StructureSection({
  space,
  shape,
  motion,
  shadows,
  motionTokens,
}: {
  space: SpaceSystem
  shape: ShapeSystem
  motion: MotionSystem
  shadows: TokenLike[]
  motionTokens: TokenLike[]
}) {
  const { copiedKey, copy } = useCopy()
  if (
    space.valuesPx.length === 0 &&
    shape.radiiPx.length === 0 &&
    shadows.length === 0
  ) {
    return null
  }
  return (
    <SectionShell
      id="space"
      overline="Space · Shape · Depth · Motion"
      title="Structure and rhythm"
      lede={`${
        space.base
          ? `Spacing moves on a ${space.base}px grid.`
          : 'Spacing is tuned optically.'
      } Corners are ${shape.character}; elevation is ${shape.depth}. Every value is a click away from your clipboard.`}
    >
      <div className="grid gap-10 lg:grid-cols-2">
        <SpacingScale system={space} copy={copy} copiedKey={copiedKey} />
        <div className="space-y-10">
          <RadiusTiles system={shape} copy={copy} copiedKey={copiedKey} />
          <ShadowTiles shadows={shadows} copy={copy} copiedKey={copiedKey} />
          <MotionRow system={motion} motionTokens={motionTokens} />
        </div>
      </div>
    </SectionShell>
  )
}
