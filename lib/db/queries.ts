import { eq, desc, and, or, like, count, sql } from 'drizzle-orm'
import { db } from './index'
import {
  sites,
  scans,
  tokenSets,
  layoutProfiles,
  submissions,
  users,
  type Site,
  type TokenSet,
  type LayoutProfile,
  type Submission
} from './schema'

// Site queries
export async function getSiteByDomain(domain: string): Promise<Site | null> {
  const result = await db.select().from(sites).where(eq(sites.domain, domain)).limit(1)
  return result[0] || null
}

export async function createSite(data: {
  domain: string
  title?: string
  description?: string
  favicon?: string
}) {
  const result = await db.insert(sites).values(data).returning()
  return result[0]
}

export async function getPopularSites(limit = 20) {
  return await db
    .select()
    .from(sites)
    .where(and(eq(sites.ownerOptout, false), eq(sites.robotsStatus, 'allowed')))
    .orderBy(desc(sites.popularity))
    .limit(limit)
}

// Token set queries
export async function getTokenSetsBySiteId(siteId: string) {
  return await db
    .select()
    .from(tokenSets)
    .where(and(eq(tokenSets.siteId, siteId), eq(tokenSets.isPublic, true)))
    .orderBy(desc(tokenSets.createdAt))
}

export async function getPublicTokenSets(limit = 50, offset = 0) {
  return await db
    .select({
      id: tokenSets.id,
      siteId: tokenSets.siteId,
      version: tokenSets.version,
      consensusScore: tokenSets.consensusScore,
      createdAt: tokenSets.createdAt,
      domain: sites.domain,
      title: sites.title,
      favicon: sites.favicon,
      popularity: sites.popularity
    })
    .from(tokenSets)
    .leftJoin(sites, eq(tokenSets.siteId, sites.id))
    .where(eq(tokenSets.isPublic, true))
    .orderBy(desc(sites.popularity), desc(tokenSets.createdAt))
    .limit(limit)
    .offset(offset)
}

export async function searchTokenSets(query: string, limit = 20) {
  return await db
    .select({
      id: tokenSets.id,
      siteId: tokenSets.siteId,
      version: tokenSets.version,
      consensusScore: tokenSets.consensusScore,
      createdAt: tokenSets.createdAt,
      domain: sites.domain,
      title: sites.title,
      favicon: sites.favicon
    })
    .from(tokenSets)
    .leftJoin(sites, eq(tokenSets.siteId, sites.id))
    .where(
      and(
        eq(tokenSets.isPublic, true),
        or(
          like(sites.domain, `%${query}%`),
          like(sites.title, `%${query}%`)
        )
      )
    )
    .orderBy(desc(sites.popularity))
    .limit(limit)
}

// Layout profile queries
export async function getLayoutProfileBySiteId(siteId: string): Promise<LayoutProfile | null> {
  const result = await db
    .select()
    .from(layoutProfiles)
    .where(eq(layoutProfiles.siteId, siteId))
    .orderBy(desc(layoutProfiles.createdAt))
    .limit(1)

  return result[0] || null
}

// Submission queries
export async function createSubmission(data: {
  url: string
  submittedBy?: string
  notifyEmail?: string
}) {
  const result = await db.insert(submissions).values(data).returning()
  return result[0]
}

export async function getQueuePosition(submissionId: string): Promise<number> {
  const result = await db
    .select({ count: count() })
    .from(submissions)
    .where(
      and(
        eq(submissions.status, 'queued'),
        sql`${submissions.createdAt} < (SELECT created_at FROM ${submissions} WHERE id = ${submissionId})`
      )
    )

  return result[0]?.count || 0
}

// User queries
export async function getUserById(id: string) {
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1)
  return result[0] || null
}

export async function getUserByEmail(email: string) {
  const result = await db.select().from(users).where(eq(users.email, email)).limit(1)
  return result[0] || null
}

export async function createUser(data: {
  email: string
  name?: string
  avatarUrl?: string
}) {
  const result = await db.insert(users).values(data).returning()
  return result[0]
}

// Analytics queries
export async function getDirectoryStats() {
  const [siteCount, tokenSetCount, activeScans] = await Promise.all([
    db.select({ count: count() }).from(sites).where(eq(sites.ownerOptout, false)),
    db.select({ count: count() }).from(tokenSets).where(eq(tokenSets.isPublic, true)),
    db.select({ count: count() }).from(scans).where(eq(scans.status, 'scanning'))
  ])

  return {
    totalSites: siteCount[0]?.count || 0,
    totalTokenSets: tokenSetCount[0]?.count || 0,
    activeScans: activeScans[0]?.count || 0
  }
}