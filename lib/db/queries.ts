import { eq, desc, sql } from 'drizzle-orm'
import { getDb } from './get-db'
import {
  sites,
  scans,
  tokenSets,
  layoutProfiles,
  submissions,
  users,
  cssContent,
  cssSources,
  type Site,
  type LayoutProfile,
} from './schema'

export async function getSiteByDomain(domain: string): Promise<Site | null> {
  const db = await getDb()
  const result = await db.select().from(sites).where(eq(sites.domain, domain)).limit(1)
  return result[0] ?? null
}

export async function createSite(data: {
  domain: string
  title?: string
  description?: string
  favicon?: string
}) {
  const db = await getDb()
  const result = await db.insert(sites).values(data).returning()
  return result[0]
}

export async function getPopularSites(limit = 20) {
  const db = await getDb()
  return db
    .select()
    .from(sites)
    .where(eq(sites.ownerOptout, false))
    .orderBy(desc(sites.popularity))
    .limit(limit)
}

export async function getTokenSetsBySiteId(siteId: string) {
  const db = await getDb()
  return db
    .select()
    .from(tokenSets)
    .where(eq(tokenSets.siteId, siteId))
    .orderBy(desc(tokenSets.createdAt))
}

export async function getPublicTokenSets(limit = 50, offset = 0) {
  const db = await getDb()
  return db
    .select({
      id: tokenSets.id,
      siteId: tokenSets.siteId,
      version: tokenSets.version,
      consensusScore: tokenSets.consensusScore,
      createdAt: tokenSets.createdAt,
      domain: sites.domain,
      title: sites.title,
      favicon: sites.favicon,
      popularity: sites.popularity,
    })
    .from(tokenSets)
    .leftJoin(sites, eq(tokenSets.siteId, sites.id))
    .where(eq(tokenSets.isPublic, true))
    .orderBy(desc(sites.popularity), desc(tokenSets.createdAt))
    .limit(limit)
    .offset(offset)
}

export async function searchTokenSets(query: string, limit = 20) {
  const db = await getDb()
  const pattern = `%${query}%`
  return db
    .select({
      id: tokenSets.id,
      siteId: tokenSets.siteId,
      version: tokenSets.version,
      consensusScore: tokenSets.consensusScore,
      createdAt: tokenSets.createdAt,
      domain: sites.domain,
      title: sites.title,
      favicon: sites.favicon,
    })
    .from(tokenSets)
    .leftJoin(sites, eq(tokenSets.siteId, sites.id))
    .where(sql`${tokenSets.isPublic} = 1 AND (${sites.domain} LIKE ${pattern} OR ${sites.title} LIKE ${pattern})`)
    .orderBy(desc(sites.popularity))
    .limit(limit)
}

export async function getLayoutProfileBySiteId(siteId: string): Promise<LayoutProfile | null> {
  const db = await getDb()
  const result = await db
    .select()
    .from(layoutProfiles)
    .where(eq(layoutProfiles.siteId, siteId))
    .orderBy(desc(layoutProfiles.createdAt))
    .limit(1)

  return result[0] ?? null
}

export async function createSubmission(data: {
  url: string
  submittedBy?: string
  notifyEmail?: string
}) {
  const db = await getDb()
  const result = await db.insert(submissions).values(data).returning()
  return result[0]
}

export async function getUserById(id: string) {
  const db = await getDb()
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1)
  return result[0] ?? null
}

export async function getUserByEmail(email: string) {
  const db = await getDb()
  const result = await db.select().from(users).where(eq(users.email, email)).limit(1)
  return result[0] ?? null
}

export async function createUser(data: {
  email: string
  name?: string
  avatarUrl?: string
  passwordHash?: string
}) {
  const db = await getDb()
  const result = await db.insert(users).values(data).returning()
  return result[0]
}

export async function getDirectoryStats() {
  const db = await getDb()
  const [siteCount, tokenSetCount, activeScans] = await Promise.all([
    db.select({ count: sql<number>`count(*)` }).from(sites).where(eq(sites.ownerOptout, false)),
    db.select({ count: sql<number>`count(*)` }).from(tokenSets).where(eq(tokenSets.isPublic, true)),
    db.select({ count: sql<number>`count(*)` }).from(sites).where(eq(sites.status, 'scanning')),
  ])

  return {
    totalSites: Number(siteCount[0]?.count ?? 0),
    totalTokenSets: Number(tokenSetCount[0]?.count ?? 0),
    activeScans: Number(activeScans[0]?.count ?? 0),
  }
}

export async function countTokensInSet(tokensJson: Record<string, unknown> | null): Promise<number> {
  if (!tokensJson) return 0

  let total = 0
  for (const [category, value] of Object.entries(tokensJson)) {
    if (category.startsWith('$')) continue
    if (Array.isArray(value)) {
      total += value.length
      continue
    }
    if (value && typeof value === 'object') {
      total += Object.keys(value as Record<string, unknown>).filter((k) => !k.startsWith('$')).length
    }
  }
  return total
}
