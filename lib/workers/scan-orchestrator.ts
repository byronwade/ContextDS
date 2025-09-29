import { db, sites, scans, tokenSets, cssSources, layoutProfiles } from '@/lib/db'
import { eq } from 'drizzle-orm'
import { collectStaticCss, type CssSource } from '@/lib/extractors/static-css'
import { collectComputedCss } from '@/lib/extractors/computed-css'
import { generateTokenSet, hashTokenSet } from '@/lib/analyzers/basic-tokenizer'
import { analyzeLayout } from '@/lib/analyzers/layout-inspector'
import { buildPromptPack } from '@/lib/analyzers/prompt-pack'
import { collectLayoutWireframe } from '@/lib/analyzers/layout-wireframe'
import { MetricsCollector } from '@/lib/observability/metrics'

export type ScanJobInput = {
  url: string
  prettify: boolean
  includeComputed: boolean
}

export type ScanJobResult = {
  status: 'completed'
  domain: string
  url: string
  summary: {
    tokensExtracted: number
    confidence: number
    completeness: number
    reliability: number
    processingTime: number
  }
  tokens: ReturnType<typeof generateTokenSet>['tokenGroups']
  layoutDNA: ReturnType<typeof analyzeLayout>
  promptPack: ReturnType<typeof buildPromptPack>
  brandAnalysis: ReturnType<typeof buildBrandAnalysis>
  metadata: {
    cssSources: number
    staticCssSources: number
    computedCssSources: number
    tokenSetId: string
    scanId: string
    promptPackVersion: string
    metrics: {
      totalDurationMs: number
      entries: ReturnType<MetricsCollector['summary']>['entries']
    }
    tokenQuality: ReturnType<typeof generateTokenSet>['qualityInsights']
  }
  database: {
    siteId: string
    scanId: string
    tokenSetId: string
    stored: true
  }
}

export async function runScanJob({ url, prettify, includeComputed }: ScanJobInput): Promise<ScanJobResult> {
  const normalized = url.startsWith('http') ? url : `https://${url}`
  const target = new URL(normalized)
  const domain = target.hostname
  const startedAt = Date.now()
  const metrics = new MetricsCollector()

  const [siteRecord] = await ensureSite(domain)
  const [scanRecord] = await db
    .insert(scans)
    .values({
      siteId: siteRecord.id,
      method: includeComputed ? 'computed' : 'static',
      prettify,
      startedAt: new Date()
    })
    .returning()

  const endStaticPhase = metrics.startPhase('collect_static_css')
  const staticCss = await collectStaticCss(target.toString())
  endStaticPhase()

  let computedCss: CssSource[] = []
  if (includeComputed) {
    const endComputedPhase = metrics.startPhase('collect_computed_css')
    computedCss = await collectComputedCss(target.toString())
    endComputedPhase()
  }

  const endDedupePhase = metrics.startPhase('dedupe_css_sources')
  const cssArtifacts = dedupeCssSources([...staticCss, ...computedCss])
  endDedupePhase()

  if (cssArtifacts.length === 0) {
    throw new Error('No CSS sources discovered for the requested URL')
  }

  const endPersistPhase = metrics.startPhase('persist_css_sources')
  await persistCssSources(scanRecord.id, cssArtifacts)
  endPersistPhase()

  const endTokenPhase = metrics.startPhase('generate_tokens')
  const generated = generateTokenSet(cssArtifacts, { domain, url: target.toString() })
  endTokenPhase()

  const endLayoutPhase = metrics.startPhase('analyze_layout')
  const layoutDNA = analyzeLayout(cssArtifacts)
  endLayoutPhase()

  const wireframeSections = includeComputed
    ? await (async () => {
        const endWireframePhase = metrics.startPhase('collect_layout_wireframe')
        const sections = await collectLayoutWireframe(target.toString())
        endWireframePhase()
        return sections
      })()
    : []

  const endPromptPhase = metrics.startPhase('build_prompt_pack')
  const promptPack = buildPromptPack(generated.tokenGroups, layoutDNA)
  endPromptPhase()

  if (wireframeSections.length > 0) {
    layoutDNA.wireframe = { sections: wireframeSections }
    augmentArchetypesWithWireframe(layoutDNA, wireframeSections)
  }

  const [tokenSetRecord] = await db
    .insert(tokenSets)
    .values({
      siteId: siteRecord.id,
      scanId: scanRecord.id,
      tokensJson: generated.tokenSet,
      packJson: promptPack,
      consensusScore: (generated.summary.confidence / 100).toFixed(2),
      isPublic: true
    })
    .returning()

  await db
    .insert(layoutProfiles)
    .values({
      siteId: siteRecord.id,
      scanId: scanRecord.id,
      profileJson: layoutDNA,
      archetypes: layoutDNA.archetypes,
      containers: layoutDNA.containers,
      gridFlex: { system: layoutDNA.gridSystem },
      spacingScale: layoutDNA.spacingBase ? { base: layoutDNA.spacingBase } : null,
      motion: null,
      accessibility: null
    })
    .onConflictDoNothing()

  const durationMs = Date.now() - startedAt
  metrics.record('persist_summary', {
    cssSources: cssArtifacts.length,
    tokenSetId: tokenSetRecord.id
  })
  const metricsSummary = metrics.summary()

  await db
    .update(scans)
    .set({
      finishedAt: new Date(),
      cssSourceCount: cssArtifacts.length,
      sha: hashTokenSet(generated.tokenSet),
      metricsJson: {
        ...metricsSummary,
        tokenQuality: generated.qualityInsights
      }
    })
    .where(eq(scans.id, scanRecord.id))

  await db
    .update(sites)
    .set({
      status: 'completed',
      lastScanned: new Date(),
      popularity: (siteRecord.popularity ?? 0) + 1
    })
    .where(eq(sites.id, siteRecord.id))

  return {
    status: 'completed',
    domain,
    url: target.toString(),
    summary: {
      tokensExtracted: generated.summary.tokensExtracted,
      confidence: generated.summary.confidence,
      completeness: generated.summary.completeness,
      reliability: generated.summary.reliability,
      processingTime: Math.max(1, Math.round(durationMs / 1000))
    },
    tokens: generated.tokenGroups,
    layoutDNA,
    promptPack,
    brandAnalysis: buildBrandAnalysis(generated.tokenGroups.colors),
    metadata: {
      cssSources: cssArtifacts.length,
      staticCssSources: staticCss.length,
      computedCssSources: computedCss.length,
      tokenSetId: tokenSetRecord.id,
      scanId: scanRecord.id,
      promptPackVersion: promptPack.version,
      metrics: metricsSummary,
      tokenQuality: generated.qualityInsights
    },
    database: {
      siteId: siteRecord.id,
      scanId: scanRecord.id,
      tokenSetId: tokenSetRecord.id,
      stored: true
    }
  }
}

async function ensureSite(domain: string) {
  const existing = await db.select().from(sites).where(eq(sites.domain, domain)).limit(1)
  if (existing.length > 0) {
    return existing
  }

  return db
    .insert(sites)
    .values({
      domain,
      title: `${domain} design system`,
      description: `Design tokens extracted from ${domain}`,
      robotsStatus: 'allowed',
      status: 'scanning',
      firstSeen: new Date(),
      popularity: 0
    })
    .returning()
}

async function persistCssSources(scanId: string, sources: CssSource[]) {
  await Promise.all(
    sources.map((artifact) =>
      db.insert(cssSources).values({
        scanId,
        url: artifact.url,
        kind: artifact.kind,
        content: artifact.content,
        bytes: artifact.bytes,
        sha: artifact.sha
      })
    )
  )
}

function dedupeCssSources(sources: CssSource[]): CssSource[] {
  const map = new Map<string, CssSource>()
  sources.forEach((source) => {
    if (!map.has(source.sha)) {
      map.set(source.sha, source)
    }
  })
  return [...map.values()]
}

function buildBrandAnalysis(colors: { value: string }[]): {
  style: string
  maturity: string
  consistency: number
} {
  if (colors.length === 0) {
    return {
      style: 'unknown',
      maturity: 'prototype',
      consistency: 40
    }
  }

  return {
    style: inferStyle(colors),
    maturity: colors.length > 12 ? 'systematic' : colors.length > 6 ? 'mature' : 'developing',
    consistency: Math.min(95, 60 + colors.length * 3)
  }
}

function inferStyle(colors: { value: string }[]): string {
  const palette = colors.map((color) => color.value.toLowerCase())
  const hasDark = palette.some((color) => color.startsWith('#0') || color.startsWith('#1'))
  const hasVibrant = palette.some((color) => color.includes('f0') || color.includes('ff'))

  if (hasDark && !hasVibrant) return 'minimal'
  if (hasVibrant) return 'vibrant'
  return 'modern'
}

function augmentArchetypesWithWireframe(layoutDNA: ReturnType<typeof analyzeLayout>, sections: ReturnType<typeof collectLayoutWireframe>): void {
  const archetypes = new Map(layoutDNA.archetypes.map((item) => [item.type, item.confidence]))

  sections.forEach((section, index) => {
    const tag = section.tag
    const description = section.description.toLowerCase()

    if ((tag === 'nav' || section.role === 'navigation') && !archetypes.has('navigation')) {
      archetypes.set('navigation', 80)
    }

    if (tag === 'header' && section.columns && section.columns >= 2 && !archetypes.has('marketing-hero')) {
      archetypes.set('marketing-hero', 75)
    }

    if (section.category === 'form' && !archetypes.has('form-experience')) {
      archetypes.set('form-experience', 70)
    }

    if (section.category === 'table' && !archetypes.has('data-table')) {
      archetypes.set('data-table', 65)
    }

    if (section.category === 'footer' && !archetypes.has('marketing-footer')) {
      archetypes.set('marketing-footer', 60)
    }

    if (description.includes('grid layout') && section.columns && section.columns >= 3 && !archetypes.has('feature-grid')) {
      archetypes.set('feature-grid', 70)
    }

    if (description.includes('flex') && section.columns && section.columns > 3 && !archetypes.has('carousel')) {
      archetypes.set('carousel', 55)
    }

    if (index === 0 && section.childCount >= 3 && !archetypes.has('hero')) {
      archetypes.set('hero', 65)
    }
  })

  layoutDNA.archetypes = Array.from(archetypes.entries()).map(([type, confidence]) => ({ type, confidence }))
}
