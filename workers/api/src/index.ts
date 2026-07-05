import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { createDb } from '../../../lib/db/d1'
import { sites, tokenSets, layoutProfiles } from '../../../lib/db/schema'
import { eq, desc, sql } from 'drizzle-orm'

type Bindings = {
  DB: D1Database
  ENVIRONMENT: string
}

const app = new Hono<{ Bindings: Bindings }>()

app.use('*', cors())

app.get('/health', async (c) => {
  const db = createDb(c.env.DB)
  await db.select({ id: sites.id }).from(sites).limit(1)
  return c.json({ healthy: true, provider: 'cloudflare-d1' })
})

app.get('/api/community/sites', async (c) => {
  const sortBy = c.req.query('sort') || 'votes'
  const limit = Number(c.req.query('limit') || '50')
  const db = createDb(c.env.DB)

  const allSites = await db
    .select()
    .from(sites)
    .where(eq(sites.status, 'completed'))

  const sitesWithData = await Promise.all(
    allSites.map(async (site) => {
      const tokenSetCount = await db
        .select({ count: sql<number>`count(*)` })
        .from(tokenSets)
        .where(eq(tokenSets.siteId, site.id))

      const avgConsensus = await db
        .select({
          avg: sql<number>`COALESCE(AVG(${tokenSets.consensusScore}), 0)`,
        })
        .from(tokenSets)
        .where(eq(tokenSets.siteId, site.id))

      return {
        id: site.id,
        domain: site.domain,
        title: site.title,
        description: site.description,
        favicon: site.favicon,
        tokensCount: Number(tokenSetCount[0]?.count ?? 0),
        popularity: site.popularity || 0,
        votes: site.popularity || 0,
        lastScanned: site.lastScanned?.toISOString() ?? null,
        consensusScore: Math.round(Number(avgConsensus[0]?.avg ?? 0) * 100),
        hasVoted: false,
      }
    })
  )

  const sorted = [...sitesWithData]
  if (sortBy === 'recent') {
    sorted.sort((a, b) => {
      if (!a.lastScanned) return 1
      if (!b.lastScanned) return -1
      return new Date(b.lastScanned).getTime() - new Date(a.lastScanned).getTime()
    })
  } else if (sortBy === 'tokens') {
    sorted.sort((a, b) => b.tokensCount - a.tokensCount)
  } else {
    sorted.sort((a, b) => b.votes - a.votes)
  }

  return c.json({ sites: sorted.slice(0, limit), total: sorted.length })
})

app.get('/api/community-detail/:domain', async (c) => {
  const domain = decodeURIComponent(c.req.param('domain'))
  const db = createDb(c.env.DB)

  const [site] = await db.select().from(sites).where(eq(sites.domain, domain)).limit(1)
  if (!site) {
    return c.json({ error: 'Site not found' }, 404)
  }

  const tokenSetsList = await db
    .select()
    .from(tokenSets)
    .where(eq(tokenSets.siteId, site.id))
    .orderBy(desc(tokenSets.createdAt))

  const [layoutProfile] = await db
    .select()
    .from(layoutProfiles)
    .where(eq(layoutProfiles.siteId, site.id))
    .orderBy(desc(layoutProfiles.createdAt))
    .limit(1)

  const latestTokenSet = tokenSetsList[0] ?? null

  return c.json({
    domain: site.domain,
    title: site.title,
    description: site.description,
    favicon: site.favicon,
    popularity: site.popularity,
    last_scanned: site.lastScanned?.toISOString() ?? null,
    status: site.status,
    submitted_by: null,
    tokenSet: latestTokenSet,
    scanHistory: tokenSetsList.map((tokenSet) => ({
      version: tokenSet.versionNumber,
      changes: `Version ${tokenSet.versionNumber}`,
      date: tokenSet.createdAt.toISOString(),
    })),
    layoutDNA: layoutProfile ?? null,
  })
})

app.get('/api/sites/:domain', async (c) => {
  const domain = decodeURIComponent(c.req.param('domain'))
  const db = createDb(c.env.DB)

  const [site] = await db.select().from(sites).where(eq(sites.domain, domain)).limit(1)

  if (!site) {
    return c.json({ hasData: false, domain, message: 'Site not found' })
  }

  const sets = await db
    .select()
    .from(tokenSets)
    .where(eq(tokenSets.siteId, site.id))

  return c.json({
    hasData: sets.length > 0,
    domain,
    site,
    tokenSetsCount: sets.length,
  })
})

app.get('/api/stats', async (c) => {
  const db = createDb(c.env.DB)
  const [siteCount, tokenCount, scanCount] = await Promise.all([
    db.select({ count: sql<number>`count(*)` }).from(sites),
    db.select({ count: sql<number>`count(*)` }).from(tokenSets),
    db.select({ count: sql<number>`count(*)` }).from(sites).where(eq(sites.status, 'scanning')),
  ])

  return c.json({
    sites: Number(siteCount[0]?.count ?? 0),
    tokenSets: Number(tokenCount[0]?.count ?? 0),
    scans: Number(scanCount[0]?.count ?? 0),
  })
})

export default app
