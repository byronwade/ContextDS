import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { sites, tokenSets, scans, layoutProfiles, cssSources } from '@/lib/db/schema'
import { eq, and, or, like, ilike, sql, desc } from 'drizzle-orm'
import { z } from 'zod'

const searchSchema = z.object({
  query: z.string().min(1),
  mode: z.enum(['tokens', 'sites', 'layouts', 'code']).default('tokens'),
  outputMode: z.enum(['content', 'files_with_matches', 'count']).default('content'),
  caseInsensitive: z.boolean().default(false),
  tokenType: z.string().optional(),
  confidenceMin: z.number().min(0).max(100).default(0),
  popularityMin: z.number().min(0).max(100).default(0),
  limit: z.number().min(1).max(500).default(50),
  offset: z.number().min(0).default(0)
})

type SearchParams = z.infer<typeof searchSchema>

type TokenEntry = {
  $value?: string | number | string[]
  value?: unknown
  $description?: string
  $type?: string
  $extensions?: Record<string, unknown>
}

type SiteSearchResult = {
  id: string
  type: 'site'
  domain: string | null
  title: string | null
  description: string | null
  popularity: number | null
  lastScanned: Date | null
  favicon: string | null
  tokenCount: number
  confidence: number
}

type TokenSearchResult = {
  id: string
  type: 'token'
  name: string
  value: string
  category: string
  site: string | null
  confidence: number
  usage: number
  source: string
}

type LayoutSearchResult = {
  id: string
  type: 'layout'
  site: string | null
  title: string | null
  matches: string[]
  layoutData: Record<string, unknown>
  source: string | null
}

type CodeSearchResult = {
  id: string
  type: 'code'
  site: string | null
  file: string | null
  lineNumber: number
  content: string
  kind: string
  source: string | null
}

type SearchResult = SiteSearchResult | TokenSearchResult | LayoutSearchResult | CodeSearchResult

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)

    const params = searchSchema.parse({
      query: searchParams.get('query'),
      mode: searchParams.get('mode') || 'tokens',
      outputMode: searchParams.get('outputMode') || 'content',
      caseInsensitive: searchParams.get('caseInsensitive') === 'true',
      tokenType: searchParams.get('tokenType') || undefined,
      confidenceMin: parseInt(searchParams.get('confidenceMin') || '0'),
      popularityMin: parseInt(searchParams.get('popularityMin') || '0'),
      limit: parseInt(searchParams.get('limit') || '50'),
      offset: parseInt(searchParams.get('offset') || '0')
    })

    let results: SearchResult[] = []

    // Build search pattern
    const searchPattern = params.caseInsensitive
      ? `%${params.query.toLowerCase()}%`
      : `%${params.query}%`

    switch (params.mode) {
      case 'sites':
        results = await searchSites(searchPattern, params)
        break
      case 'tokens':
        results = await searchTokens(searchPattern, params)
        break
      case 'layouts':
        results = await searchLayouts(params)
        break
      case 'code':
        results = await searchCode(params)
        break
    }

    // Apply output mode formatting
    if (params.outputMode === 'count') {
      return NextResponse.json({ count: results.length })
    }

    if (params.outputMode === 'files_with_matches') {
      const files = [...new Set(
        results
          .map((result) => {
            if ('source' in result && result.source) {
              return result.source
            }
            if ('domain' in result && result.domain) {
              return result.domain
            }
            if ('site' in result && result.site) {
              return result.site
            }
            return null
          })
          .filter((value): value is string => typeof value === 'string')
      )]
      return NextResponse.json({ files })
    }

    // Return full content results
    return NextResponse.json({
      results,
      total: results.length,
      query: params.query,
      mode: params.mode
    })

  } catch (error) {
    console.error('Search error:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid search parameters', details: error.issues },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Search failed' },
      { status: 500 }
    )
  }
}

async function searchSites(pattern: string, params: SearchParams): Promise<SiteSearchResult[]> {
  const rows = await db
    .select({
      id: sites.id,
      domain: sites.domain,
      title: sites.title,
      description: sites.description,
      popularity: sites.popularity,
      lastScanned: sites.lastScanned,
      favicon: sites.favicon,
      tokenCount: sql<number>`COALESCE((
        SELECT COUNT(*)::int
        FROM ${tokenSets}
        WHERE ${tokenSets.siteId} = ${sites.id}
        AND ${tokenSets.isPublic} = true
      ), 0)`,
      confidence: sql<number>`COALESCE((
        SELECT AVG(CAST(consensus_score AS DECIMAL))::numeric
        FROM ${tokenSets}
        WHERE ${tokenSets.siteId} = ${sites.id}
      ), 0)`
    })
    .from(sites)
    .where(
      and(
        eq(sites.ownerOptout, false),
        or(
          params.caseInsensitive
            ? ilike(sites.domain, pattern)
            : like(sites.domain, pattern),
          params.caseInsensitive
            ? ilike(sites.title, pattern)
            : like(sites.title, pattern),
          params.caseInsensitive
            ? ilike(sites.description, pattern)
            : like(sites.description, pattern)
        ),
        params.popularityMin > 0
          ? sql`${sites.popularity} >= ${params.popularityMin}`
          : sql`true`
      )
    )
    .orderBy(desc(sites.popularity))
    .limit(params.limit)
    .offset(params.offset)

  return rows.map<SiteSearchResult>((row) => ({
    id: row.id,
    type: 'site',
    domain: row.domain ?? null,
    title: row.title ?? null,
    description: row.description ?? null,
    popularity: row.popularity ?? null,
    lastScanned: row.lastScanned ?? null,
    favicon: row.favicon ?? null,
    tokenCount: toNumber(row.tokenCount),
    confidence: toNumber(row.confidence)
  }))
}

async function searchTokens(pattern: string, params: SearchParams): Promise<TokenSearchResult[]> {
  console.log(`🔍 Optimized database token search for: "${params.query}"`)

  try {
    const searchQuery = params.caseInsensitive ? params.query.toLowerCase() : params.query

    const tokenResults = await db.execute(sql`
      WITH token_matches AS (
        SELECT
          ts.id,
          ts.site_id,
          ts.tokens_json,
          ts.consensus_score,
          ts.created_at,
          s.domain,
          s.title,
          token_category.key as category,
          token_item.key as token_name,
          token_item.value as token_data
        FROM token_sets ts
        LEFT JOIN sites s ON ts.site_id = s.id
        CROSS JOIN LATERAL jsonb_each(ts.tokens_json) AS token_category(key, value)
        CROSS JOIN LATERAL jsonb_each(token_category.value) AS token_item(key, value)
        WHERE ts.is_public = true
          AND token_category.key != '$schema'
          AND token_category.key != '$metadata'
          AND jsonb_typeof(token_item.value) = 'object'
          AND (
            ${params.caseInsensitive ? sql`
              LOWER(token_item.key) LIKE ${'%' + searchQuery + '%'}
              OR LOWER(COALESCE(token_item.value->>'$value', '')) LIKE ${'%' + searchQuery + '%'}
              OR LOWER(COALESCE(token_item.value->>'$description', '')) LIKE ${'%' + searchQuery + '%'}
            ` : sql`
              token_item.key LIKE ${pattern}
              OR COALESCE(token_item.value->>'$value', '') LIKE ${pattern}
              OR COALESCE(token_item.value->>'$description', '') LIKE ${pattern}
            `}
          )
          ${params.tokenType && params.tokenType !== 'all' ? sql`
            AND (
              token_category.key = ${params.tokenType}
              OR token_item.value->>'$type' = ${params.tokenType}
            )
          ` : sql``}
          ${params.confidenceMin > 0 ? sql`
            AND COALESCE(
              CAST(token_item.value->'$extensions'->>'contextds.confidence' AS INTEGER),
              CAST(ts.consensus_score AS INTEGER),
              0
            ) >= ${params.confidenceMin}
          ` : sql``}
      )
      SELECT
        tm.id || '-' || tm.token_name as id,
        'token' as type,
        tm.token_name as name,
        COALESCE(tm.token_data->>'$value', tm.token_data->>'value', '') as value,
        tm.category,
        tm.domain as site,
        COALESCE(
          CAST(tm.token_data->'$extensions'->>'contextds.confidence' AS INTEGER),
          CAST(tm.consensus_score AS INTEGER),
          80
        ) as confidence,
        COALESCE(
          CAST(tm.token_data->'$extensions'->>'contextds.usage' AS INTEGER),
          1
        ) as usage,
        tm.domain || '/' || tm.category || '/' || tm.token_name as source,
        tm.created_at
      FROM token_matches tm
      ORDER BY
        confidence DESC,
        tm.created_at DESC
      LIMIT ${params.limit}
      OFFSET ${params.offset}
    `)

    type TokenSearchRow = {
      id: string
      type: 'token'
      name: string
      value: string | null
      category: string
      site: string | null
      confidence: number | string | null
      usage: number | string | null
      source: string | null
    }

    const tokenRows = tokenResults as unknown as TokenSearchRow[]

    const results = tokenRows.map<TokenSearchResult>((row) => {
      const confidence = toNumber(row.confidence, 80)
      const usage = toNumber(row.usage, 1)
      const fallbackSource = row.site ? `${row.site}/${row.category}/${row.name}` : `${row.category}/${row.name}`

      return {
        id: row.id,
        type: 'token',
        name: row.name,
        value: row.value ?? '',
        category: row.category,
        site: row.site,
        confidence,
        usage,
        source: row.source ?? fallbackSource
      }
    })

    console.log(`✅ Database search completed: ${results.length} tokens found`)
    return results

  } catch (error) {
    console.error('❌ Optimized token search failed, falling back to simple search:', error)

    const fallbackResults = await db
      .select({
        id: tokenSets.id,
        tokensJson: tokenSets.tokensJson,
        consensusScore: tokenSets.consensusScore,
        domain: sites.domain
      })
      .from(tokenSets)
      .leftJoin(sites, eq(tokenSets.siteId, sites.id))
      .where(
        and(
          eq(tokenSets.isPublic, true),
          sql`${tokenSets.tokensJson}::text ILIKE ${'%' + params.query + '%'}`
        )
      )
      .orderBy(desc(tokenSets.consensusScore))
      .limit(params.limit)

    type FallbackRow = {
      id: string
      tokensJson: unknown
      consensusScore: string | number | null
      domain: string | null
    }

    const processedResults: TokenSearchResult[] = []

    ;(fallbackResults as FallbackRow[]).forEach((tokenSet) => {
      if (!isRecord(tokenSet.tokensJson)) {
        return
      }

      Object.entries(tokenSet.tokensJson as Record<string, unknown>).forEach(([category, categoryTokens]) => {
        if (category.startsWith('$') || !isRecord(categoryTokens)) {
          return
        }

        const [tokenName, tokenData] = Object.entries(categoryTokens)[0] ?? []
        if (!tokenName || !isRecord(tokenData)) {
          return
        }

        const entry = tokenData as TokenEntry

        processedResults.push({
          id: `${tokenSet.id}-${tokenName}`,
          type: 'token',
          name: tokenName,
          value: getTokenEntryValue(entry),
          category,
          site: tokenSet.domain,
          confidence: toNumber(tokenSet.consensusScore, 80),
          usage: 1,
          source: tokenSet.domain ? `${tokenSet.domain}/${category}/${tokenName}` : `${category}/${tokenName}`
        })
      })
    })

    return processedResults.slice(0, params.limit)
  }
}

async function searchLayouts(params: SearchParams): Promise<LayoutSearchResult[]> {
  const layoutRows = await db
    .select({
      id: layoutProfiles.id,
      siteId: layoutProfiles.siteId,
      profileJson: layoutProfiles.profileJson,
      createdAt: layoutProfiles.createdAt,
      domain: sites.domain,
      title: sites.title
    })
    .from(layoutProfiles)
    .leftJoin(sites, eq(layoutProfiles.siteId, sites.id))
    .limit(params.limit * 2)

  const queryLower = params.query.toLowerCase()
  const results: LayoutSearchResult[] = []

  layoutRows.forEach((profile) => {
    if (!isRecord(profile.profileJson)) {
      return
    }

    const layoutRecord = profile.profileJson as Record<string, unknown>
    const searchableContent = JSON.stringify(layoutRecord).toLowerCase()
    if (!searchableContent.includes(queryLower)) {
      return
    }

    const matches: string[] = []

    const archetypesValue = layoutRecord['archetypes']
    if (Array.isArray(archetypesValue)) {
      archetypesValue.forEach((archetype) => {
        if (isRecord(archetype)) {
          const archetypeType = archetype['type']
          if (typeof archetypeType === 'string' && archetypeType.toLowerCase().includes(queryLower)) {
            matches.push(`Archetype: ${archetypeType}`)
          }
        }
      })
    }

    const containersValue = layoutRecord['containers']
    if (containersValue && JSON.stringify(containersValue).toLowerCase().includes(queryLower)) {
      matches.push('Container pattern')
    }

    const gridFlexValue = layoutRecord['gridFlex']
    if (gridFlexValue && JSON.stringify(gridFlexValue).toLowerCase().includes(queryLower)) {
      matches.push('Grid/Flex layout')
    }

    results.push({
      id: profile.id,
      type: 'layout',
      site: profile.domain ?? null,
      title: profile.title ?? null,
      matches,
      layoutData: layoutRecord,
      source: profile.domain ? `${profile.domain}/layout-dna` : null
    })
  })

  return results.slice(params.offset, params.offset + params.limit)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function toNumber(value: unknown, fallback = 0): number {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : fallback
}

function getTokenEntryValue(entry: TokenEntry): string {
  const rawValue = entry.$value ?? entry.value
  if (Array.isArray(rawValue)) {
    return rawValue.map((val) => String(val)).join(', ')
  }
  if (rawValue === undefined || rawValue === null) {
    return ''
  }
  return String(rawValue)
}

async function searchCode(params: SearchParams): Promise<CodeSearchResult[]> {
  const cssRows = await db
    .select({
      id: cssSources.id,
      url: cssSources.url,
      content: cssSources.content,
      kind: cssSources.kind,
      bytes: cssSources.bytes,
      domain: sites.domain
    })
    .from(cssSources)
    .leftJoin(scans, eq(cssSources.scanId, scans.id))
    .leftJoin(sites, eq(scans.siteId, sites.id))
    .where(sql`${cssSources.content} IS NOT NULL`)
    .limit(params.limit * 2)

  type CssRow = {
    id: string
    url: string | null
    content: string | null
    kind: string | null
    bytes: number | null
    domain: string | null
  }

  const results: CodeSearchResult[] = []
  const query = params.caseInsensitive ? params.query.toLowerCase() : params.query

  ;(cssRows as CssRow[]).forEach((source) => {
    if (typeof source.content !== 'string') {
      return
    }

    const lines = source.content.split('\n')

    lines.forEach((line, index) => {
      const lineToCheck = params.caseInsensitive ? line.toLowerCase() : line
      if (!lineToCheck.includes(query)) {
        return
      }

      const site = source.domain ?? null
      const kind = source.kind ?? 'css'
      const fileLabel = source.url ?? `${kind} CSS`
      const sourceLabel = site ? `${site}/${kind}-css:${index + 1}` : `${kind}-css:${index + 1}`

      results.push({
        id: `${source.id}-${index}`,
        type: 'code',
        site,
        file: fileLabel,
        lineNumber: index + 1,
        content: line.trim(),
        kind,
        source: sourceLabel
      })
    })
  })

  return results.slice(params.offset, params.offset + params.limit)
}
