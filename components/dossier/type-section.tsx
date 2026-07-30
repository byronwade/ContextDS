'use client'

import { useEffect } from 'react'
import { cn } from '@/lib/utils'
import type { TypeSystem } from '@/lib/analyzers/design-philosophy'
import { CopyChip, SectionShell, ensureGoogleFont, useCopy } from './shared'

const PANGRAM = 'Grumpy wizards make toxic brew for the evil queen and jack.'

const CLASS_LABEL: Record<string, string> = {
  serif: 'Serif',
  sans: 'Sans-serif',
  mono: 'Monospace',
  display: 'Display',
  handwritten: 'Script',
}

function FamilySpecimen({
  font,
  rank,
  copiedKey,
  copy,
}: {
  font: TypeSystem['families'][number]
  rank: number
  copiedKey: string | null
  copy: (key: string, value: string) => void
}) {
  const stack = `${font.stack}, ${font.class === 'mono' ? 'monospace' : font.class === 'serif' ? 'serif' : 'sans-serif'}`
  return (
    <div className="group rounded-2xl border border-[color:var(--soft-border)] bg-card/50 p-6 transition-colors hover:bg-card/80">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <span className="font-mono text-[10px] text-muted-foreground">
            {String(rank + 1).padStart(2, '0')}
          </span>
          <p className="text-sm font-medium text-foreground">{font.primary}</p>
          <span className="rounded-full border border-[color:var(--soft-border)] px-2 py-px font-mono text-[10px] text-muted-foreground">
            {CLASS_LABEL[font.class] ?? font.class}
          </span>
          {rank === 0 && (
            <span className="rounded-full border border-[oklch(0.78_0.08_185/0.4)] px-2 py-px font-mono text-[10px] text-[oklch(0.78_0.08_185)]">
              primary
            </span>
          )}
        </div>
        <CopyChip
          value={font.stack}
          copyKey={`font-${font.primary}`}
          copiedKey={copiedKey}
          onCopy={copy}
          label="copy stack"
        />
      </div>
      <p
        className="not-mono mt-5 select-text text-6xl leading-none tracking-tight text-foreground sm:text-7xl"
        style={{ fontFamily: stack }}
      >
        Aa
      </p>
      <p
        className="not-mono mt-4 truncate text-lg text-muted-foreground"
        style={{ fontFamily: stack }}
      >
        ABCDEFGHIJKLMNOPQRSTUVWXYZ abcdefghijklmnopqrstuvwxyz 0123456789
      </p>
      <p
        className="not-mono mt-2 text-sm leading-relaxed text-muted-foreground/80"
        style={{ fontFamily: stack }}
      >
        {PANGRAM}
      </p>
    </div>
  )
}

export function TypeSection({
  system,
  primaryStack,
}: {
  system: TypeSystem
  primaryStack: string | null
}) {
  const { copiedKey, copy } = useCopy()

  useEffect(() => {
    system.families.slice(0, 6).forEach((font) => ensureGoogleFont(font.primary))
  }, [system.families])

  if (system.families.length === 0 && system.sizesPx.length === 0) return null

  const scaleStack = primaryStack ?? system.families[0]?.stack ?? 'inherit'
  const ladder = system.sizesPx.filter((n) => n >= 10 && n <= 72)

  return (
    <SectionShell
      id="type"
      overline={`Typography · ${system.families.length} families · ${system.sizesPx.length} sizes`}
      title="Typographic voice"
      lede={`This system speaks with ${system.voice}${
        system.scaleLabel
          ? `, stepped on a ${system.scaleLabel} scale (~${system.scaleRatio?.toFixed(2)}×)`
          : ''
      }. Specimens render in the live webfont when it can be resolved.`}
    >
      <div className="grid gap-4 lg:grid-cols-2">
        {system.families.slice(0, 6).map((font, index) => (
          <FamilySpecimen
            key={font.primary}
            font={font}
            rank={index}
            copiedKey={copiedKey}
            copy={copy}
          />
        ))}
      </div>

      {ladder.length > 0 && (
        <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_260px]">
          <div>
            <p className="mb-4 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              Size ladder
            </p>
            <div className="space-y-1">
              {[...ladder].reverse().map((size) => (
                <button
                  key={size}
                  type="button"
                  onClick={() => copy(`size-${size}`, `${size}px`)}
                  className="group flex w-full items-baseline gap-4 rounded-lg px-2 py-1 text-left transition-colors hover:bg-secondary/40"
                  title={`Copy ${size}px`}
                >
                  <span className="w-14 shrink-0 font-mono text-[11px] tabular-nums text-muted-foreground group-hover:text-foreground">
                    {copiedKey === `size-${size}` ? 'copied' : `${size}px`}
                  </span>
                  <span
                    className="not-mono truncate leading-tight text-foreground"
                    style={{ fontFamily: scaleStack, fontSize: `${size}px` }}
                  >
                    Design is a contract
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-6 lg:border-l lg:border-border/40 lg:pl-8">
            {system.scaleRatio && (
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                  Modular scale
                </p>
                <p className="mt-1 font-mono text-3xl text-foreground">
                  {system.scaleRatio.toFixed(3)}×
                </p>
                {system.scaleLabel && (
                  <p className="mt-1 text-xs text-muted-foreground">{system.scaleLabel}</p>
                )}
              </div>
            )}
            {system.weights.length > 0 && (
              <div>
                <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                  Weights
                </p>
                <div className="space-y-1">
                  {system.weights.map((weight) => (
                    <p
                      key={weight}
                      className={cn('not-mono flex items-baseline gap-3 text-lg text-foreground')}
                      style={{ fontFamily: scaleStack, fontWeight: weight }}
                    >
                      <span className="font-mono text-[10px] font-normal tabular-nums text-muted-foreground">
                        {weight}
                      </span>
                      The quick brown fox
                    </p>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </SectionShell>
  )
}
