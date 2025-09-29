import { NextResponse } from 'next/server'
import { db, scans, sites } from '@/lib/db'
import { desc, eq } from 'drizzle-orm'

export async function GET() {
  const latestScans = await db
    .select({
      id: scans.id,
      siteId: scans.siteId,
      startedAt: scans.startedAt,
      finishedAt: scans.finishedAt,
      metrics: scans.metricsJson,
      cssSourceCount: scans.cssSourceCount,
      method: scans.method,
      domain: sites.domain
    })
    .from(scans)
    .leftJoin(sites, eq(sites.id, scans.siteId))
    .orderBy(desc(scans.startedAt))
    .limit(50)

  const aggregated = aggregateMetrics(latestScans)

  return NextResponse.json({
    summary: aggregated.summary,
    phases: aggregated.phases,
    qualities: aggregated.qualities,
    recent: aggregated.recent
  })
}

type ScanRow = {
  id: string
  siteId: string
  startedAt: Date | null
  finishedAt: Date | null
  metrics: unknown
  cssSourceCount: number
  method: string
  domain: string | null
}

type PhaseMetrics = {
  name: string
  averageMs: number
  samples: number
}

type TokenQualitySummary = {
  totalTokens: number
  topTokens: Array<{
    category: string
    value: string
    usage: number
    qualityScore: number
  }>
}

function aggregateMetrics(rows: ScanRow[]) {
  let totalDuration = 0
  let durationSamples = 0
  const phaseTotals = new Map<string, { total: number; samples: number }>()
  const qualityTotals: TokenQualitySummary = {
    totalTokens: 0,
    topTokens: []
  }

  const recent = rows.map((row) => {
    const metrics = normalizeMetrics(row.metrics)
    if (metrics) {
      totalDuration += metrics.totalDurationMs
      durationSamples += 1

      metrics.entries.forEach((entry) => {
        if (entry.durationMs !== undefined) {
          const current = phaseTotals.get(entry.name) ?? { total: 0, samples: 0 }
          current.total += entry.durationMs
          current.samples += 1
          phaseTotals.set(entry.name, current)
        }
      })

      if (metrics.tokenQuality) {
        qualityTotals.totalTokens += metrics.tokenQuality.totalTokens
        metrics.tokenQuality.topTokens.forEach((token) => {
          qualityTotals.topTokens.push(token)
        })
      }
    }

    return {
      id: row.id,
      domain: row.domain,
      cssSources: row.cssSourceCount,
      method: row.method,
      totalDurationMs: metrics?.totalDurationMs ?? null,
      startedAt: row.startedAt,
      finishedAt: row.finishedAt
    }
  })

  const phases: PhaseMetrics[] = Array.from(phaseTotals.entries()).map(([name, data]) => ({
    name,
    averageMs: data.samples ? Math.round(data.total / data.samples) : 0,
    samples: data.samples
  }))

  return {
    summary: {
      totalScans: rows.length,
      averageDurationMs: durationSamples ? Math.round(totalDuration / durationSamples) : 0
    },
    phases: phases.sort((a, b) => b.averageMs - a.averageMs),
    qualities: {
      totalTokens: qualityTotals.totalTokens,
      topTokens: qualityTotals.topTokens
        .sort((a, b) => b.qualityScore - a.qualityScore)
        .slice(0, 20)
    },
    recent
  }
}

function normalizeMetrics(value: unknown): {
  totalDurationMs: number
  entries: Array<{ name: string; durationMs?: number }>
  tokenQuality?: TokenQualitySummary
} | null {
  if (typeof value !== 'object' || value === null) return null
  const record = value as Record<string, unknown>
  const totalDurationMs = typeof record.totalDurationMs === 'number' ? record.totalDurationMs : null
  const entries = Array.isArray(record.entries) ? record.entries : null
  if (totalDurationMs === null || !entries) return null
  const qualityRecord = record.tokenQuality
  return {
    totalDurationMs,
    entries: entries.flatMap((entry) => {
      if (!entry || typeof entry !== 'object') return []
      const record = entry as Record<string, unknown>
      if (typeof record.name !== 'string') return []
      const durationValue = record.durationMs
      return [{ name: record.name, durationMs: typeof durationValue === 'number' ? durationValue : undefined }]
    }),
    tokenQuality: normalizeTokenQuality(qualityRecord)
  }
}

function normalizeTokenQuality(value: unknown): TokenQualitySummary | undefined {
  if (typeof value !== 'object' || value === null) return undefined
  const record = value as Record<string, unknown>
  const overall = record.overall
  if (!overall || typeof overall !== 'object') return undefined
  const overallRecord = overall as Record<string, unknown>
  const totalTokens = typeof overallRecord.totalTokens === 'number' ? overallRecord.totalTokens : 0
  const topTokensRaw = Array.isArray(overallRecord.topTokens) ? overallRecord.topTokens : []

  const topTokens: TokenQualitySummary['topTokens'] = topTokensRaw.flatMap((entry) => {
    if (!entry || typeof entry !== 'object') return []
    const tokenEntry = entry as Record<string, unknown>
    const category = typeof tokenEntry.category === 'string' ? tokenEntry.category : 'unknown'
    const token = tokenEntry.token
    if (!token || typeof token !== 'object') return []
    const tokenRecord = token as Record<string, unknown>
    return [{
      category,
      value: typeof tokenRecord.value === 'string' ? tokenRecord.value : '',
      usage: typeof tokenRecord.usage === 'number' ? tokenRecord.usage : 0,
      qualityScore: typeof tokenRecord.qualityScore === 'number' ? tokenRecord.qualityScore : 0
    }]
  })

  return {
    totalTokens,
    topTokens
  }
}
