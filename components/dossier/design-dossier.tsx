'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowSquareOutIcon,
  ArrowsClockwiseIcon,
  CheckIcon,
  DownloadSimpleIcon,
  ShareNetworkIcon,
} from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { ScanResult, ScanProgress } from '@/stores/scan-store'
import {
  generatePhilosophy,
  inkFor,
  type DesignPhilosophy,
  type UxEvidence,
} from '@/lib/analyzers/design-philosophy'
import { FactRow, MonoStat, Overline, SectionShell } from './shared'
import { ColorSection } from './color-section'
import { ContrastSection } from './contrast-section'
import { TypeSection } from './type-section'
import { StructureSection } from './structure-section'
import { ComponentLab } from './component-lab'
import { GraphSection } from './graph-section'
import { LayoutSection } from './layout-section'
import { ScreensSection } from './screens-section'
import { HistorySection } from './history-section'
import { ArtifactsSection } from './artifacts-section'

type SectionDef = { id: string; label: string }

function useScrollSpy(ids: string[]) {
  const [activeId, setActiveId] = useState<string | null>(ids[0] ?? null)
  useEffect(() => {
    if (ids.length === 0) return
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
        if (visible[0]) setActiveId(visible[0].target.id)
      },
      { rootMargin: '-20% 0px -70% 0px' }
    )
    for (const id of ids) {
      const element = document.getElementById(id)
      if (element) observer.observe(element)
    }
    return () => observer.disconnect()
  }, [ids])
  return activeId
}

function ScanningState({ progress, domain }: { progress?: ScanProgress | null; domain: string }) {
  const percent = Math.min(95, ((progress?.step || 1) / (progress?.totalSteps || 6)) * 100)
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-6 py-24">
      <div>
        <Overline>Gathering the design system</Overline>
        <h1 className="mt-2 font-serif text-4xl tracking-tight text-foreground">{domain}</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          {progress?.message || 'Collecting public CSS…'}
        </p>
      </div>
      <div className="h-1 overflow-hidden rounded-full bg-secondary/60">
        <div
          className="h-full rounded-full bg-[var(--ui-accent)] transition-all duration-700"
          style={{ width: `${percent}%` }}
        />
      </div>
      <div className="space-y-3">
        {['Palette + neutrals', 'Typography + scale', 'Spacing, radii, depth', 'Semantic graph', 'Design Contract pack'].map(
          (label, index) => {
            const step = progress?.step ?? 1
            const done = index + 1 < step
            const current = index + 1 === step
            return (
              <div key={label} className="flex items-center gap-3 text-sm">
                <span
                  className={cn(
                    'flex size-4 items-center justify-center rounded-full border',
                    done
                      ? 'border-[var(--ui-success)] text-[var(--ui-success)]'
                      : current
                        ? 'animate-pulse border-[var(--ui-accent)]'
                        : 'border-border/60'
                  )}
                >
                  {done ? <CheckIcon className="size-2.5" /> : null}
                </span>
                <span className={done || current ? 'text-foreground' : 'text-muted-foreground'}>
                  {label}
                </span>
              </div>
            )
          }
        )}
      </div>
    </div>
  )
}

function Hero({
  result,
  philosophy,
  domain,
}: {
  result: ScanResult
  philosophy: DesignPhilosophy
  domain: string
}) {
  const screenshot = result.screenshots?.[0]
  const palette = philosophy.systems.color.all
    .slice()
    .sort((a, b) => (b.usage ?? 0) - (a.usage ?? 0))
    .slice(0, 10)

  return (
    <section id="overview" className="scroll-mt-28 pt-10">
      <div className="grid items-start gap-10 lg:grid-cols-[1fr_0.9fr]">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Overline>Design Contract · {result.cacheHit ? 'from cache' : 'fresh scan'}</Overline>
            {result.metadata?.engine ? (
              <span className="rounded-full border border-[color:var(--soft-border)] px-2 py-px font-mono text-[10px] text-muted-foreground">
                {result.metadata.engine}
              </span>
            ) : null}
          </div>
          <h1 className="mt-3 font-serif text-5xl leading-[1.05] tracking-tight text-foreground sm:text-6xl">
            {domain}
          </h1>
          <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-muted-foreground">
            {philosophy.statement}
          </p>

          <div className="mt-6 flex flex-wrap gap-2">
            {philosophy.traits.map((trait) => (
              <span
                key={trait}
                className="rounded-full border border-[color:var(--soft-border)] bg-card/40 px-3 py-1 font-mono text-[11px] text-muted-foreground"
              >
                {trait}
              </span>
            ))}
          </div>

          <div className="mt-10 grid grid-cols-2 gap-x-6 gap-y-5 border-t border-border/40 pt-6 sm:grid-cols-4">
            <MonoStat
              label="Tokens"
              value={String(result.summary?.tokensExtracted ?? philosophy.systems.color.all.length)}
            />
            <MonoStat
              label="Confidence"
              value={`${Math.round(result.summary?.confidence ?? 0)}%`}
            />
            <MonoStat
              label="Graph"
              value={
                result.semanticGraph
                  ? `${result.semanticGraph.summary.nodeCount}·${result.semanticGraph.summary.edgeCount}`
                  : '—'
              }
              hint={
                result.semanticGraph
                  ? `${result.semanticGraph.summary.nodeCount} nodes, ${result.semanticGraph.summary.edgeCount} edges`
                  : undefined
              }
            />
            <MonoStat
              label="Scan time"
              value={`${(Math.round((result.summary?.processingTime ?? 0) / 100) / 10).toFixed(1)}s`}
            />
          </div>
        </div>

        <div className="space-y-3">
          <div className="overflow-hidden rounded-2xl border border-[color:var(--soft-border)] bg-card shadow-[var(--soft-shadow)]">
            <div className="flex items-center gap-1.5 border-b border-border/40 px-4 py-2.5">
              <span className="size-2.5 rounded-full bg-border" />
              <span className="size-2.5 rounded-full bg-border" />
              <span className="size-2.5 rounded-full bg-border" />
              <span className="ml-3 flex-1 truncate rounded-md bg-secondary/50 px-2.5 py-1 text-center font-mono text-[10px] text-muted-foreground">
                https://{domain}
              </span>
              <a
                href={`https://${domain}`}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Open ${domain}`}
                className="text-muted-foreground transition-colors hover:text-foreground"
              >
                <ArrowSquareOutIcon className="size-3.5" />
              </a>
            </div>
            {screenshot?.url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={screenshot.url}
                alt={`Screenshot of ${domain}`}
                className="max-h-[380px] w-full object-cover object-top"
              />
            ) : (
              <div
                className="flex h-56 items-end p-6"
                style={{
                  background: `linear-gradient(135deg, ${palette
                    .slice(0, 4)
                    .map((color) => color.hex)
                    .join(', ')})`,
                }}
              >
                <span
                  className="font-serif text-3xl tracking-tight"
                  style={{ color: palette[0] ? inkFor(palette[0]) : undefined }}
                >
                  {domain}
                </span>
              </div>
            )}
          </div>
          {palette.length > 0 && (
            <div className="flex h-8 overflow-hidden rounded-lg border border-[color:var(--soft-border)]">
              {palette.map((color) => (
                <div
                  key={color.hex}
                  className="min-w-0 flex-1"
                  style={{
                    background: color.hex,
                    flexGrow: Math.max(1, Math.sqrt(color.usage ?? 1)),
                  }}
                  title={color.hex}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

function PhilosophySection({ philosophy }: { philosophy: DesignPhilosophy }) {
  return (
    <SectionShell
      id="philosophy"
      overline="Philosophy · generated from the tokens"
      title={philosophy.title}
      lede="A working philosophy derived deterministically from what the scan observed — the rules an agent should internalize before touching this UI."
    >
      <div className="grid gap-x-10 gap-y-8 md:grid-cols-2">
        {philosophy.principles.map((principle, index) => (
          <div key={principle.title} className="border-t border-border/60 pt-4">
            <div className="flex items-baseline gap-3">
              <span className="font-mono text-[11px] text-[var(--ui-accent)]">
                {String(index + 1).padStart(2, '0')}
              </span>
              <h3 className="text-[15px] font-medium text-foreground">{principle.title}</h3>
            </div>
            <p className="mt-2 pl-8 text-sm leading-relaxed text-muted-foreground">
              {principle.body}
            </p>
          </div>
        ))}
      </div>
    </SectionShell>
  )
}

function ProvenanceSection({ result }: { result: ScanResult }) {
  const meta = (result.metadata ?? {}) as Record<string, unknown>
  const summary = result.summary
  const num = (value: unknown) => (typeof value === 'number' ? value : null)
  const str = (value: unknown) => (typeof value === 'string' && value ? value : null)
  const coverage = (meta.renderCoverage ?? null) as {
    overall: number
    colors: number
    fonts: number
    verifiedColors: number
    dormantColors: number
    addedFromRender: number
    elementCount: number
    pagesAudited?: number
  } | null
  const crawl = (meta.crawl ?? null) as { pages: number; paths: string[] } | null

  return (
    <SectionShell
      id="meta"
      overline="Provenance"
      title="How this dossier was gathered"
      lede="Everything here is measured, not guessed — this is the evidence trail for the scan behind this contract."
    >
      <div className="grid gap-x-12 gap-y-2 sm:grid-cols-2">
        <div>
          <FactRow label="Scan mode" value={str(meta.mode) ?? 'fast'} />
          <FactRow label="Engine" value={str(meta.engine) ?? str(meta.browserEngine) ?? 'static-css'} />
          <FactRow
            label="CSS sources"
            value={
              num(meta.cssSources) !== null
                ? `${num(meta.cssSources)} total · ${num(meta.staticCssSources) ?? 0} static · ${num(meta.computedCssSources) ?? 0} computed`
                : '—'
            }
          />
          <FactRow label="Wallace analysis" value={meta.wallace ? 'yes' : 'no'} />
          <FactRow
            label="Pages crawled"
            value={
              crawl
                ? `${crawl.pages} — ${crawl.paths.slice(0, 5).join(', ')}${crawl.paths.length > 5 ? '…' : ''}`
                : '1 (homepage)'
            }
          />
          <FactRow
            label="Render audit"
            value={
              coverage
                ? `${coverage.overall}% of painted site explained · ${coverage.elementCount} elements across ${coverage.pagesAudited ?? 1} page${(coverage.pagesAudited ?? 1) === 1 ? '' : 's'}`
                : 'not run (fast scan)'
            }
          />
          {coverage ? (
            <FactRow
              label="Token verification"
              value={`${coverage.verifiedColors} verified · ${coverage.dormantColors} dormant · ${coverage.addedFromRender} recovered`}
            />
          ) : null}
          <FactRow label="Page title" value={str(meta.pageTitle) ?? '—'} />
        </div>
        <div>
          <FactRow label="Confidence" value={`${Math.round(summary?.confidence ?? 0)}%`} />
          <FactRow label="Completeness" value={`${Math.round(summary?.completeness ?? 0)}%`} />
          <FactRow label="Reliability" value={`${Math.round(summary?.reliability ?? 0)}%`} />
          <FactRow
            label="Processing time"
            value={`${((summary?.processingTime ?? 0) / 1000).toFixed(1)}s`}
          />
          <FactRow label="Scan id" value={str(meta.scanId) ?? '—'} />
        </div>
      </div>
    </SectionShell>
  )
}

export function DesignDossier({
  result,
  isLoading,
  progress,
  error,
  domain,
  onExport,
  onShare,
  onRescan,
}: {
  result: ScanResult | null
  isLoading: boolean
  progress?: ScanProgress | null
  error?: string | null
  domain: string
  onExport: (format: string) => void
  onShare: () => void
  onRescan: () => void
}) {
  const [shared, setShared] = useState(false)
  const [historyAvailable, setHistoryAvailable] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  const philosophy = useMemo(() => {
    if (!result) return null
    return generatePhilosophy({
      domain: result.domain || domain,
      curated: result.curatedTokens ?? null,
      personality: result.brandAnalysis?.personality ?? null,
      primaryFont: result.brandAnalysis?.primaryFont ?? null,
      ux: result.uxDna
        ? {
            shell: result.uxDna.shell as UxEvidence['shell'],
            density: result.uxDna.density as UxEvidence['density'],
            interaction: result.uxDna.interaction ?? null,
            keyframeCount: result.uxDna.keyframes?.length,
            pagesAudited: result.metadata?.renderCoverage?.pagesAudited,
          }
        : null,
    })
  }, [result, domain])

  const detectedComponents = useMemo(() => {
    const nodes = (result?.semanticGraph?.nodes ?? []) as Array<{
      kind?: string
      type?: string
      variant?: string
      confidence?: number
      states?: string[]
    }>
    return nodes
      .filter((node) => node?.kind === 'component' && node.type)
      .map((node) => ({
        type: node.type as string,
        variant: node.variant,
        confidence: node.confidence ?? 0,
        states: node.states,
      }))
  }, [result?.semanticGraph])

  const sections = useMemo<SectionDef[]>(() => {
    if (!result || !philosophy) return []
    const defs: SectionDef[] = [{ id: 'overview', label: 'Overview' }]
    defs.push({ id: 'philosophy', label: 'Philosophy' })
    if (philosophy.systems.color.all.length > 0) defs.push({ id: 'color', label: 'Color' })
    if (
      philosophy.systems.type.families.length > 0 ||
      philosophy.systems.type.sizesPx.length > 0
    ) {
      defs.push({ id: 'type', label: 'Type' })
    }
    if (
      philosophy.systems.space.valuesPx.length > 0 ||
      philosophy.systems.shape.radiiPx.length > 0
    ) {
      defs.push({ id: 'space', label: 'Space' })
    }
    if (philosophy.systems.color.all.length >= 4) {
      defs.push({ id: 'contrast', label: 'Contrast' })
    }
    defs.push({ id: 'components', label: 'Components' })
    if ((result.screenshots?.length ?? 0) > 0) defs.push({ id: 'screens', label: 'Screens' })
    if (historyAvailable) defs.push({ id: 'history', label: 'History' })
    if (result.semanticGraph) defs.push({ id: 'graph', label: 'Graph' })
    if (result.layoutDNA && Object.keys(result.layoutDNA).length > 0) {
      defs.push({ id: 'layout', label: 'Layout' })
    }
    defs.push({ id: 'meta', label: 'Provenance' })
    defs.push({ id: 'files', label: 'Files' })
    return defs
  }, [result, philosophy, historyAvailable])

  const sectionIds = useMemo(() => sections.map((section) => section.id), [sections])
  const activeId = useScrollSpy(sectionIds)

  if (error) {
    return (
      <div className="mx-auto flex max-w-2xl flex-col items-start gap-4 px-6 py-24">
        <Overline className="text-destructive/80">Scan failed</Overline>
        <h1 className="font-serif text-4xl tracking-tight text-foreground">{domain}</h1>
        <p className="text-sm text-muted-foreground">{error}</p>
        <Button className="mt-2 gap-2" onClick={onRescan}>
          <ArrowsClockwiseIcon className="size-3.5" />
          Scan again
        </Button>
      </div>
    )
  }

  if (isLoading || !result || !philosophy) {
    return <ScanningState progress={progress} domain={domain} />
  }

  const actions = (
    <div className="flex shrink-0 items-center gap-1.5">
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={() => {
          onShare()
          setShared(true)
          window.setTimeout(() => setShared(false), 1400)
        }}
        aria-label="Copy share link"
        title={shared ? 'Link copied' : 'Copy share link'}
      >
        {shared ? (
          <CheckIcon className="size-4 text-[var(--ui-accent)]" />
        ) : (
          <ShareNetworkIcon className="size-4" />
        )}
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={onRescan}
        aria-label="Re-scan site"
        title="Re-scan site"
      >
        <ArrowsClockwiseIcon className="size-4" />
      </Button>
      <Button
        size="sm"
        className="gap-2"
        onClick={() => {
          window.location.href = `/api/contracts/download?domain=${encodeURIComponent(domain)}`
        }}
      >
        <DownloadSimpleIcon className="size-3.5" />
        <span className="hidden sm:inline">Contract</span>
      </Button>
    </div>
  )

  return (
    <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto">
      {/* Compact mobile section nav — the floating rail takes over at xl */}
      <div className="sticky top-0 z-30 bg-background/85 backdrop-blur-xl xl:hidden">
        <nav
          className="mx-auto flex max-w-6xl items-center gap-0.5 overflow-x-auto px-4 py-2 sm:px-6"
          aria-label="Dossier sections"
        >
          {sections.map((section) => (
            <a
              key={section.id}
              href={`#${section.id}`}
              className={cn(
                'shrink-0 rounded-full px-2.5 py-1 text-xs transition-colors',
                activeId === section.id
                  ? 'text-[var(--ui-accent)]'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {section.label}
            </a>
          ))}
        </nav>
      </div>

      {/* Symmetric columns keep the content column truly centered under the shell */}
      <div className="mx-auto max-w-[88rem] xl:grid xl:grid-cols-[168px_minmax(0,1fr)_168px] xl:gap-4">
        {/* Floating scrollspy rail — no background, no border */}
        <nav
          className="sticky top-16 hidden h-fit self-start pb-16 pl-6 pt-14 xl:block"
          aria-label="Dossier sections"
        >
          <p className="mb-4 truncate pr-2 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground/70">
            {domain}
          </p>
          <ul className="space-y-0.5">
            {sections.map((section) => {
              const isActive = activeId === section.id
              return (
                <li key={section.id}>
                  <a
                    href={`#${section.id}`}
                    aria-current={isActive ? 'true' : undefined}
                    className={cn(
                      'group flex items-center gap-2.5 py-1.5 text-[13px] transition-colors',
                      isActive
                        ? 'text-foreground'
                        : 'text-muted-foreground/75 hover:text-foreground'
                    )}
                  >
                    <span
                      className={cn(
                        'h-px transition-all duration-200',
                        isActive
                          ? 'w-5 bg-[var(--ui-accent)]'
                          : 'w-2.5 bg-border group-hover:w-4 group-hover:bg-foreground/40'
                      )}
                      aria-hidden
                    />
                    {section.label}
                  </a>
                </li>
              )
            })}
          </ul>
        </nav>

        <div className="mx-auto w-full min-w-0 max-w-6xl px-4 pb-24 sm:px-6">
        <div className="flex items-center justify-end pt-4">{actions}</div>
        <Hero result={result} philosophy={philosophy} domain={domain} />
        <div className="mt-14">
          <PhilosophySection philosophy={philosophy} />
          <ColorSection
            system={philosophy.systems.color}
            screenshotUrl={
              result.screenshots?.find(
                (shot) => shot.viewport === 'desktop' && !/full/.test(shot.label)
              )?.url ??
              result.screenshots?.[0]?.url ??
              null
            }
          />
          <TypeSection
            system={philosophy.systems.type}
            primaryStack={result.brandAnalysis?.primaryFont ?? null}
          />
          <StructureSection
            space={philosophy.systems.space}
            shape={philosophy.systems.shape}
            motion={philosophy.systems.motion}
            shadows={result.curatedTokens?.shadows ?? []}
            motionTokens={result.curatedTokens?.motion ?? []}
          />
          <ContrastSection system={philosophy.systems.color} />
          <ComponentLab
            color={philosophy.systems.color}
            shape={philosophy.systems.shape}
            type={philosophy.systems.type}
            detectedComponents={detectedComponents}
          />
          {(result.screenshots?.length ?? 0) > 0 ? (
            <ScreensSection screenshots={result.screenshots ?? []} domain={domain} />
          ) : null}
          <HistorySection domain={domain} onAvailability={setHistoryAvailable} />
          {result.semanticGraph ? (
            <GraphSection graph={result.semanticGraph} domain={domain} />
          ) : null}
          <LayoutSection layoutDNA={result.layoutDNA ?? null} uxDna={result.uxDna ?? null} />
          <ProvenanceSection result={result} />
          <ArtifactsSection
            domain={domain}
            designMd={result.designMd ?? null}
            designSkill={result.designSkill ?? null}
            installCommand={result.designContract?.installCommand ?? null}
            packFileCount={result.designContract?.summary?.fileCount ?? null}
            onExportTokens={(format) => onExport(format)}
            graph={result.semanticGraph ?? null}
          />
        </div>
        </div>
      </div>
    </div>
  )
}
