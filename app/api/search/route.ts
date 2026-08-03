import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { searchRatelimit } from '@/lib/ratelimit'
import { getScan, listSites } from '@/lib/storage/serverless-store'

const searchSchema = z.object({
  query: z.string().min(1),
  mode: z.enum(['tokens', 'sites', 'layouts', 'code']).default('sites'),
  limit: z.coerce.number().min(1).max(200).default(50),
  offset: z.coerce.number().min(0).default(0),
  caseInsensitive: z.coerce.boolean().default(true),
})

function matchesQuery(haystack: string, needle: string, caseInsensitive: boolean): boolean {
  if (caseInsensitive) {
    return haystack.toLowerCase().includes(needle.toLowerCase())
  }
  return haystack.includes(needle)
}

export async function GET(request: NextRequest) {
  try {
    const identifier =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') ||
      '127.0.0.1'
    const { success } = await searchRatelimit.limit(identifier)
    if (!success) {
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 , headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60' } })
    }

    const { searchParams } = new URL(request.url)
    const params = searchSchema.parse({
      query: searchParams.get('query') || searchParams.get('q') || '',
      mode: searchParams.get('mode') || 'sites',
      limit: searchParams.get('limit') || 50,
      offset: searchParams.get('offset') || 0,
      caseInsensitive: searchParams.get('caseInsensitive') !== 'false',
    })

    const sites = await listSites({ sort: 'popular', limit: 500 })
    const filteredSites = sites.filter((site) =>
      matchesQuery(
        `${site.domain} ${site.title ?? ''} ${site.description ?? ''}`,
        params.query,
        params.caseInsensitive
      )
    )

    if (params.mode === 'sites') {
      const page = filteredSites.slice(params.offset, params.offset + params.limit)
      return NextResponse.json({
        results: page.map((site) => ({
          id: site.id,
          type: 'site' as const,
          domain: site.domain,
          title: site.title,
          description: site.description,
          popularity: site.popularity,
          lastScanned: site.lastScanned,
          favicon: site.favicon,
          tokenCount: site.tokenCount,
          confidence: 0,
        })),
        total: filteredSites.length,
        mode: params.mode,
        storage: 'serverless',
      })
    }

    // Token / layout search over cached scan payloads (Blob/memory)
    const results: Array<Record<string, unknown>> = []
    for (const site of filteredSites.slice(0, 40)) {
      const scan = await getScan(site.domain)
      if (!scan) continue

      if (params.mode === 'layouts' && scan.layoutDNA) {
        const layoutText = JSON.stringify(scan.layoutDNA)
        if (matchesQuery(layoutText, params.query, params.caseInsensitive)) {
          results.push({
            id: `${site.id}-layout`,
            type: 'layout',
            site: site.domain,
            title: `${site.domain} layout DNA`,
            matches: [params.query],
            layoutData: scan.layoutDNA,
            source: 'serverless-store',
          })
        }
        continue
      }

      const tokens = (scan.curatedTokens || scan.tokens) as Record<string, unknown> | null
      if (!tokens || typeof tokens !== 'object') continue

      for (const [category, group] of Object.entries(tokens)) {
        if (!Array.isArray(group)) continue
        for (const token of group) {
          if (!token || typeof token !== 'object') continue
          const record = token as Record<string, unknown>
          const name = String(record.name ?? record.key ?? '')
          const value = String(record.value ?? record.$value ?? '')
          const blob = `${name} ${value} ${category}`
          if (!matchesQuery(blob, params.query, params.caseInsensitive)) continue
          results.push({
            id: `${site.domain}-${category}-${name || value}`,
            type: 'token',
            name: name || value,
            value,
            category,
            site: site.domain,
            confidence: Number(record.confidence ?? scan.summary.confidence ?? 0),
            usage: Number(record.usage ?? record.count ?? 0),
            source: 'serverless-store',
          })
          if (results.length >= params.offset + params.limit) break
        }
        if (results.length >= params.offset + params.limit) break
      }
      if (results.length >= params.offset + params.limit) break
    }

    return NextResponse.json({
      results: results.slice(params.offset, params.offset + params.limit),
      total: results.length,
      mode: params.mode,
      storage: 'serverless',
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid search parameters', details: error.issues }, { status: 400 , headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60' } })
    }
    console.error('Search error:', error)
    return NextResponse.json({ error: 'Search failed' }, { status: 500 , headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60' } })
  }
}
