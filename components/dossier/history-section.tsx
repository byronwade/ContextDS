'use client'

import { useEffect, useMemo, useState } from 'react'
import { parseColor } from '@/lib/analyzers/design-philosophy'
import type { TokenDiff } from '@/lib/analyzers/version-diff'
import { cn } from '@/lib/utils'
import { SectionShell } from './shared'

type ScanVersion = {
  ts: string
  scanId: string
  tokensExtracted: number
  confidence: number
  colors: string[]
  fonts: string[]
  spacing: string[]
  radius: string[]
  screenshot: string | null
  personality: string | null
}

function normalizeHexes(values: string[]): string[] {
  const out: string[] = []
  for (const value of values) {
    const parsed = parseColor(value)
    if (parsed && !out.includes(parsed.hex)) out.push(parsed.hex)
  }
  return out
}

function formatDate(ts: string): string {
  const date = new Date(ts)
  if (Number.isNaN(date.getTime())) return ts
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

function DiffSwatches({ label, hexes, tone }: { label: string; hexes: string[]; tone: 'added' | 'removed' }) {
  if (hexes.length === 0) return null
  return (
    <div className="flex items-center gap-2">
      <span
        className={cn(
          'w-16 shrink-0 font-mono text-[10px] uppercase tracking-[0.14em]',
          tone === 'added' ? 'text-[var(--ui-success)]' : 'text-[var(--ui-danger)]'
        )}
      >
        {label}
      </span>
      <span className="flex flex-wrap gap-1">
        {hexes.slice(0, 12).map((hex) => (
          <span
            key={hex}
            title={hex}
            className={cn(
              'block size-5 rounded-[5px] border border-[color:var(--soft-border)]',
              tone === 'removed' && 'opacity-60 [background-image:linear-gradient(45deg,transparent_45%,var(--ui-danger)_45%,var(--ui-danger)_55%,transparent_55%)]'
            )}
            style={{ backgroundColor: hex }}
          />
        ))}
        {hexes.length > 12 ? (
          <span className="self-center font-mono text-[10px] text-muted-foreground">
            +{hexes.length - 12}
          </span>
        ) : null}
      </span>
    </div>
  )
}

export function HistorySection({
  domain,
  onAvailability,
}: {
  domain: string
  /** Reports whether the section will render, so the scrollspy rail can include it. */
  onAvailability?: (available: boolean) => void
}) {
  const [versions, setVersions] = useState<ScanVersion[] | null>(null)
  const [compareIndex, setCompareIndex] = useState(1)
  const [richDiff, setRichDiff] = useState<{
    key: string
    diff: TokenDiff
    changelog: string | null
  } | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch(`/api/sites/${encodeURIComponent(domain)}/versions`)
      .then((response) => (response.ok ? response.json() : null))
      .then((data: { versions?: ScanVersion[] } | null) => {
        if (cancelled) return
        const next = data?.versions ?? []
        setVersions(next)
        onAvailability?.(next.length >= 2)
      })
      .catch(() => {
        if (!cancelled) {
          setVersions([])
          onAvailability?.(false)
        }
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fetch once per domain
  }, [domain])

  const diff = useMemo(() => {
    if (!versions || versions.length < 2) return null
    const latest = versions[0]
    const previous = versions[Math.min(compareIndex, versions.length - 1)]
    const latestColors = normalizeHexes(latest.colors)
    const previousColors = normalizeHexes(previous.colors)
    return {
      latest,
      previous,
      addedColors: latestColors.filter((hex) => !previousColors.includes(hex)),
      removedColors: previousColors.filter((hex) => !latestColors.includes(hex)),
      addedFonts: latest.fonts.filter((font) => !previous.fonts.includes(font)),
      removedFonts: previous.fonts.filter((font) => !latest.fonts.includes(font)),
      tokenDelta: latest.tokensExtracted - previous.tokensExtracted,
      confidenceDelta: latest.confidence - previous.confidence,
    }
  }, [versions, compareIndex])

  const compareKey = diff
    ? `${diff.previous.scanId}->${diff.latest.scanId}`
    : null

  useEffect(() => {
    if (!compareKey || !diff) return
    let cancelled = false
    const oldScanId = diff.previous.scanId
    const newScanId = diff.latest.scanId
    const key = compareKey
    fetch(`/api/sites/${encodeURIComponent(domain)}/versions/compare`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ oldScanId, newScanId }),
    })
      .then((response) => (response.ok ? response.json() : null))
      .then((data: { diff?: TokenDiff; changelog?: string } | null) => {
        if (cancelled || !data?.diff) return
        setRichDiff({
          key,
          diff: data.diff,
          changelog: typeof data.changelog === 'string' ? data.changelog : null,
        })
      })
      .catch(() => {
        /* keep previous richDiff only if same key — otherwise hide */
      })
    return () => {
      cancelled = true
    }
    // compareKey encodes the scan pair; diff fields are read once per key
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [domain, compareKey])

  const activeTokenDiff =
    richDiff && compareKey && richDiff.key === compareKey ? richDiff.diff : null
  const activeChangelog =
    richDiff && compareKey && richDiff.key === compareKey ? richDiff.changelog : null

  // History becomes interesting from the second scan onward.
  if (!versions || versions.length < 2) return null

  return (
    <SectionShell
      id="history"
      overline={`History · ${versions.length} snapshots`}
      title="How this design has changed"
      lede="Every accurate scan leaves a snapshot. Pick an earlier one to diff palettes, faces and coverage against the latest — the answer to “what changed this month?”"
    >
      <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr]">
        {/* Timeline */}
        <div className="space-y-1">
          {versions.map((version, index) => {
            const isLatest = index === 0
            const isCompared = !isLatest && index === Math.min(compareIndex, versions.length - 1)
            return (
              <button
                key={`${version.scanId}-${version.ts}`}
                type="button"
                disabled={isLatest}
                onClick={() => setCompareIndex(index)}
                className={cn(
                  'flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition-colors',
                  isLatest
                    ? 'bg-[var(--ui-paper-subtle)]'
                    : isCompared
                      ? 'bg-[var(--ui-accent-soft)]'
                      : 'hover:bg-[var(--ui-paper-hover)]'
                )}
              >
                <span className="w-24 shrink-0">
                  <span className="block font-mono text-[11px] text-foreground">
                    {formatDate(version.ts)}
                  </span>
                  <span className="block font-mono text-[10px] text-muted-foreground">
                    {isLatest ? 'latest' : isCompared ? 'comparing' : `${version.confidence}%`}
                  </span>
                </span>
                <span className="flex h-5 min-w-0 flex-1 overflow-hidden rounded-[5px] border border-[color:var(--soft-border)]">
                  {normalizeHexes(version.colors)
                    .slice(0, 10)
                    .map((hex) => (
                      <span key={hex} className="h-full min-w-0 flex-1" style={{ background: hex }} />
                    ))}
                </span>
                <span className="w-14 shrink-0 text-right font-mono text-[10px] tabular-nums text-muted-foreground">
                  {version.tokensExtracted} tk
                </span>
              </button>
            )
          })}
        </div>

        {/* Diff panel */}
        {diff ? (
          <div className="rounded-2xl border border-[color:var(--soft-border)] bg-card/40 p-5">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              {formatDate(diff.previous.ts)} → {formatDate(diff.latest.ts)}
            </p>

            <div className="mt-4 space-y-3">
              <DiffSwatches label="added" hexes={diff.addedColors} tone="added" />
              <DiffSwatches label="removed" hexes={diff.removedColors} tone="removed" />
              {diff.addedColors.length === 0 && diff.removedColors.length === 0 ? (
                <p className="text-sm text-muted-foreground">Palette unchanged.</p>
              ) : null}

              {(diff.addedFonts.length > 0 || diff.removedFonts.length > 0) && (
                <div className="flex flex-wrap gap-2 border-t border-border/40 pt-3">
                  {diff.addedFonts.map((font) => (
                    <span key={font} className="rounded-full border border-[color-mix(in_oklab,var(--ui-success)_35%,transparent)] px-2 py-0.5 font-mono text-[11px] text-[var(--ui-success)]">
                      + {font}
                    </span>
                  ))}
                  {diff.removedFonts.map((font) => (
                    <span key={font} className="rounded-full border border-[color-mix(in_oklab,var(--ui-danger)_35%,transparent)] px-2 py-0.5 font-mono text-[11px] text-[var(--ui-danger)] line-through">
                      {font}
                    </span>
                  ))}
                </div>
              )}

              <div className="flex flex-wrap gap-x-6 gap-y-1 border-t border-border/40 pt-3 font-mono text-[11px] text-muted-foreground">
                <span>
                  tokens {diff.tokenDelta === 0 ? '±0' : diff.tokenDelta > 0 ? `+${diff.tokenDelta}` : diff.tokenDelta}
                </span>
                <span>
                  confidence {diff.confidenceDelta === 0 ? '±0' : diff.confidenceDelta > 0 ? `+${diff.confidenceDelta}%` : `${diff.confidenceDelta}%`}
                </span>
              </div>

              {activeTokenDiff && activeTokenDiff.summary.totalChanges > 0 ? (
                <div
                  className="mt-4 space-y-2 border-t border-border/40 pt-3"
                  data-testid="token-version-diff"
                >
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                    Token paths · {activeTokenDiff.summary.totalChanges} changes
                  </p>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 font-mono text-[11px]">
                    <span className="text-[var(--ui-success)]">
                      +{activeTokenDiff.summary.addedCount}
                    </span>
                    <span className="text-[var(--ui-danger)]">
                      −{activeTokenDiff.summary.removedCount}
                    </span>
                    <span className="text-muted-foreground">
                      ~{activeTokenDiff.summary.modifiedCount}
                    </span>
                  </div>
                  <ul className="max-h-40 space-y-1 overflow-y-auto font-mono text-[11px] text-muted-foreground">
                    {[
                      ...activeTokenDiff.added.slice(0, 6).map((change) => ({
                        key: `a-${change.path}`,
                        label: `+ ${change.path}`,
                        tone: 'text-[var(--ui-success)]' as const,
                      })),
                      ...activeTokenDiff.removed.slice(0, 6).map((change) => ({
                        key: `r-${change.path}`,
                        label: `− ${change.path}`,
                        tone: 'text-[var(--ui-danger)]' as const,
                      })),
                      ...activeTokenDiff.modified.slice(0, 6).map((change) => ({
                        key: `m-${change.path}`,
                        label: `~ ${change.path}`,
                        tone: 'text-foreground/80' as const,
                      })),
                    ].map((row) => (
                      <li key={row.key} className={row.tone}>
                        {row.label}
                      </li>
                    ))}
                  </ul>
                  {activeChangelog ? (
                    <pre className="max-h-28 overflow-auto whitespace-pre-wrap rounded-lg border border-[color:var(--soft-border)] bg-[var(--ui-paper-subtle)] p-3 font-mono text-[10px] text-muted-foreground">
                      {activeChangelog}
                    </pre>
                  ) : null}
                </div>
              ) : null}
            </div>

            {(diff.latest.screenshot || diff.previous.screenshot) && (
              <div className="mt-5 grid grid-cols-2 gap-3">
                {[diff.previous, diff.latest].map((version, index) => (
                  <figure key={`${version.scanId}-shot`} className="min-w-0">
                    <figcaption className="mb-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                      {index === 0 ? 'before' : 'after'}
                    </figcaption>
                    {version.screenshot ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={version.screenshot}
                        alt={`${domain} on ${formatDate(version.ts)}`}
                        className="aspect-[16/10] w-full rounded-lg border border-[color:var(--soft-border)] object-cover object-top"
                        loading="lazy"
                      />
                    ) : (
                      <div className="flex aspect-[16/10] items-center justify-center rounded-lg border border-dashed border-border/60 text-[11px] text-muted-foreground">
                        no capture
                      </div>
                    )}
                  </figure>
                ))}
              </div>
            )}
          </div>
        ) : null}
      </div>
    </SectionShell>
  )
}
