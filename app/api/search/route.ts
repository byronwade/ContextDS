import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { sites, tokenSets, scans, layoutProfiles, cssSources, cssContent } from '@/lib/db/schema'
import { eq, and, or, like, sql, desc } from 'drizzle-orm'
import { z } from 'zod'
import { searchRatelimit } from '@/lib/ratelimit'

// PERFORMANCE: Node.js runtime required for database access
export const runtime = 'nodejs'

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
    // Rate limiting for search endpoint
    const identifier = request.headers.get('x-forwarded-for')?.split(',')[0] ?? request.headers.get('x-real-ip') ?? '127.0.0.1'
    const { success } = await searchRatelimit.limit(identifier)

    if (!success) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please slow down your searches.' },
        { status: 429 }
      )
    }

    const { searchParams } = new URL(request.url)

    // Helper to safely parse positive integers
    const parsePositiveInt = (value: string | null, defaultValue: number): number => {
      if (!value) return defaultValue
      const parsed = parseInt(value, 10)
      return !isNaN(parsed) && parsed >= 0 ? parsed : defaultValue
    }

    const params = searchSchema.parse({
      query: searchParams.get('query'),
      mode: searchParams.get('mode') || 'tokens',
      outputMode: searchParams.get('outputMode') || 'content',
      caseInsensitive: searchParams.get('caseInsensitive') === 'true',
      tokenType: searchParams.get('tokenType') || undefined,
      confidenceMin: parsePositiveInt(searchParams.get('confidenceMin'), 0),
      popularityMin: parsePositiveInt(searchParams.get('popularityMin'), 0),
      limit: Math.min(parsePositiveInt(searchParams.get('limit'), 50), 100), // Cap at 100
      offset: parsePositiveInt(searchParams.get('offset'), 0)
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
  const db = await getDb()
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
          like(sites.domain, pattern),
          like(sites.title, pattern),
          like(sites.description, pattern)
        ),
        params.popularityMin > 0
          ? sql`${sites.popularity} >= ${params.popularityMin}`
          : sql`true`
      )
    )
    .orderBy(desc(sites.popularity))
    .limit(params.limit)
    .offset(params.offset)

  return rows.map((row: typeof rows[number]): SiteSearchResult => ({
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
  const db = await getDb()
  console.log(`🔍 Token search for: "${params.query}"`)

  const searchQuery = params.caseInsensitive ? params.query.toLowerCase() : params.query

  // Fetch token sets with site domain, then search in JS (SQLite has no jsonb lateral joins)
  const tokenSetRows = await db
    .select({
      id: tokenSets.id,
      tokensJson: tokenSets.tokensJson,
      consensusScore: tokenSets.consensusScore,
      createdAt: tokenSets.createdAt,
      domain: sites.domain
    })
    .from(tokenSets)
    .leftJoin(sites, eq(tokenSets.siteId, sites.id))
    .where(and(eq(tokenSets.isPublic, true), sql`${tokenSets.tokensJson} IS NOT NULL`))
    .orderBy(desc(tokenSets.createdAt))
    .limit(200)

  const processedResults: TokenSearchResult[] = []

  for (const tokenSet of tokenSetRows) {
    if (!isRecord(tokenSet.tokensJson)) continue

    for (const [category, categoryTokens] of Object.entries(tokenSet.tokensJson as Record<string, unknown>)) {
      if (category.startsWith('$') || !isRecord(categoryTokens)) continue
      if (params.tokenType && params.tokenType !== 'all' && category !== params.tokenType) continue

      for (const [tokenName, tokenData] of Object.entries(categoryTokens as Record<string, unknown>)) {
        if (!isRecord(tokenData)) continue

        const entry = tokenData as TokenEntry
        const entryValue = getTokenEntryValue(entry)
        const entryDesc = typeof entry.$description === 'string' ? entry.$description : ''

        const nameToCheck = params.caseInsensitive ? tokenName.toLowerCase() : tokenName
        const valueToCheck = params.caseInsensitive ? entryValue.toLowerCase() : entryValue
        const descToCheck = params.caseInsensitive ? entryDesc.toLowerCase() : entryDesc

        if (!nameToCheck.includes(searchQuery) && !valueToCheck.includes(searchQuery) && !descToCheck.includes(searchQuery)) continue

        const confidence = toNumber(tokenSet.consensusScore, 80)
        if (params.confidenceMin > 0 && confidence < params.confidenceMin) continue

        processedResults.push({
          id: `${tokenSet.id}-${tokenName}`,
          type: 'token',
          name: tokenName,
          value: entryValue,
          category,
          site: tokenSet.domain ?? null,
          confidence,
          usage: 1,
          source: tokenSet.domain ? `${tokenSet.domain}/${category}/${tokenName}` : `${category}/${tokenName}`
        })

        if (processedResults.length >= params.limit + params.offset) break
      }
      if (processedResults.length >= params.limit + params.offset) break
    }
    if (processedResults.length >= params.limit + params.offset) break
  }

  console.log(`✅ Token search completed: ${processedResults.length} tokens found`)
  return processedResults.slice(params.offset, params.offset + params.limit)
}

async function searchLayouts(params: SearchParams): Promise<LayoutSearchResult[]> {
  const db = await getDb()
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

  layoutRows.forEach((profile: typeof layoutRows[number]) => {
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
  const db = await getDb()
  const cssRows = await db
    .select({
      id: cssSources.id,
      url: cssSources.url,
      content: cssContent.content,
      kind: cssSources.kind,
      bytes: cssSources.bytes,
      domain: sites.domain
    })
    .from(cssSources)
    .leftJoin(cssContent, eq(cssSources.sha, cssContent.sha))
    .leftJoin(scans, eq(cssSources.scanId, scans.id))
    .leftJoin(sites, eq(scans.siteId, sites.id))
    .where(sql`${cssContent.content} IS NOT NULL`)
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

  ;(cssRows as CssRow[]).forEach((source: CssRow) => {
    const content = source.content
    if (typeof content !== 'string') {
      return
    }

    const lines = content.split('\n')

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
