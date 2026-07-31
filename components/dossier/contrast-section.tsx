'use client'

import { useMemo } from 'react'
import { cn } from '@/lib/utils'
import {
  contrastRatio,
  wcagGrade,
  type ColorSystem,
  type ParsedColor,
} from '@/lib/analyzers/design-philosophy'
import { SectionShell } from './shared'

/**
 * Accessibility matrix: every plausible text ink against every plausible
 * surface in the scanned system, WCAG-graded — the fastest way to see which
 * pairings this design can legally use.
 */
export function ContrastSection({ system }: { system: ColorSystem }) {
  const model = useMemo(() => {
    const surfaces: ParsedColor[] = []
    const inks: ParsedColor[] = []

    // Surfaces: extreme neutrals + most-used chromatics
    const neutralSurfaces = [
      ...system.neutrals.slice(0, 2),
      ...system.neutrals.slice(-2),
    ]
    for (const color of neutralSurfaces) {
      if (!surfaces.some((entry) => entry.hex === color.hex)) surfaces.push(color)
    }
    for (const color of system.chromatic.slice(0, 3)) {
      if (!surfaces.some((entry) => entry.hex === color.hex)) surfaces.push(color)
    }

    // Inks: darkest + lightest neutrals, accent
    const inkCandidates = [
      ...system.neutrals.filter((color) => color.luminance < 0.25).slice(0, 2),
      ...system.neutrals.filter((color) => color.luminance > 0.7).slice(-2),
      ...(system.accent ? [system.accent] : []),
    ]
    for (const color of inkCandidates) {
      if (!inks.some((entry) => entry.hex === color.hex)) inks.push(color)
    }

    const passes = surfaces.reduce(
      (count, surface) =>
        count +
        inks.filter((ink) => contrastRatio(ink, surface) >= 4.5).length,
      0
    )

    return { surfaces: surfaces.slice(0, 6), inks: inks.slice(0, 5), passes }
  }, [system])

  if (model.surfaces.length < 2 || model.inks.length < 2) return null

  return (
    <SectionShell
      id="contrast"
      overline={`Accessibility · ${model.passes} AA pairings`}
      title="Contrast matrix"
      lede="Every plausible ink over every plausible surface, WCAG-graded. Green cells are safe for body text (AA ≥ 4.5), amber for large text only (≥ 3), muted cells fail."
    >
      <div className="overflow-x-auto">
        <table className="w-full min-w-[480px] border-separate border-spacing-1">
          <thead>
            <tr>
              <th className="w-28 pb-1 text-left font-mono text-[10px] font-normal uppercase tracking-[0.14em] text-muted-foreground">
                ink \ surface
              </th>
              {model.surfaces.map((surface) => (
                <th key={surface.hex} className="pb-1">
                  <span className="flex flex-col items-center gap-1">
                    <span
                      className="block h-4 w-full min-w-14 rounded-[5px] border border-[color:var(--soft-border)]"
                      style={{ background: surface.hex }}
                    />
                    <span className="font-mono text-[9px] font-normal text-muted-foreground">
                      {surface.hex}
                    </span>
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {model.inks.map((ink) => (
              <tr key={ink.hex}>
                <td className="pr-2">
                  <span className="flex items-center gap-2">
                    <span
                      className="size-3.5 shrink-0 rounded-[4px] border border-[color:var(--soft-border)]"
                      style={{ background: ink.hex }}
                    />
                    <span className="font-mono text-[10px] text-muted-foreground">
                      {ink.hex}
                    </span>
                  </span>
                </td>
                {model.surfaces.map((surface) => {
                  const ratio = contrastRatio(ink, surface)
                  const grade = wcagGrade(ratio)
                  return (
                    <td key={surface.hex}>
                      <span
                        className={cn(
                          'flex h-11 flex-col items-center justify-center rounded-lg border text-center',
                          grade === 'fail'
                            ? 'border-transparent bg-[var(--ui-paper-subtle)] opacity-45'
                            : grade === 'AA18'
                              ? 'border-[color-mix(in_oklab,var(--ui-warning)_35%,transparent)] bg-[var(--ui-warning-soft)]'
                              : 'border-[color-mix(in_oklab,var(--ui-success)_30%,transparent)] bg-[var(--ui-success-soft)]'
                        )}
                        style={{ background: grade === 'fail' ? undefined : surface.hex }}
                        title={`${ink.hex} on ${surface.hex} — ${ratio.toFixed(2)}:1`}
                      >
                        <span
                          className="text-[13px] font-semibold leading-none"
                          style={{ color: grade === 'fail' ? undefined : ink.hex }}
                        >
                          Ag
                        </span>
                        <span
                          className="mt-0.5 font-mono text-[9px] leading-none"
                          style={{ color: grade === 'fail' ? undefined : ink.hex }}
                        >
                          {ratio.toFixed(1)} {grade === 'AA18' ? 'AA·lg' : grade === 'fail' ? '✕' : grade}
                        </span>
                      </span>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </SectionShell>
  )
}
