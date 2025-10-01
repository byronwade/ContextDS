import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { sites, tokenSets, scans } from "@/lib/db/schema"
import { desc, sql, count, eq } from "drizzle-orm"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const sortBy = searchParams.get("sort") || "votes"
    const limit = parseInt(searchParams.get("limit") || "50")

    // Get all completed sites
    const allSites = await db
      .select({
        id: sites.id,
        domain: sites.domain,
        title: sites.title,
        description: sites.description,
        favicon: sites.favicon,
        popularity: sites.popularity,
        lastScanned: sites.lastScanned,
      })
      .from(sites)
      .where(eq(sites.status, "completed"))

    // For each site, get token set count and consensus score
    const sitesWithData = await Promise.all(
      allSites.map(async (site) => {
        // Count token sets for this site
        const tokenSetCount = await db
          .select({ count: count() })
          .from(tokenSets)
          .where(eq(tokenSets.siteId, site.id))

        // Get average consensus score
        const avgConsensus = await db
          .select({
            avg: sql<number>`COALESCE(AVG(CAST(${tokenSets.consensusScore} AS FLOAT)), 0)`,
          })
          .from(tokenSets)
          .where(eq(tokenSets.siteId, site.id))

        return {
          id: site.id,
          domain: site.domain,
          title: site.title,
          description: site.description,
          favicon: site.favicon,
          tokensCount: tokenSetCount[0]?.count || 0,
          popularity: site.popularity || 0,
          votes: site.popularity || 0,
          lastScanned: site.lastScanned?.toISOString() || null,
          consensusScore: Math.round(Number(avgConsensus[0]?.avg) || 0),
          hasVoted: false, // TODO: Track user votes with session/auth
        }
      })
    )

    // Apply sorting
    let sortedSites = sitesWithData
    switch (sortBy) {
      case "recent":
        sortedSites.sort((a, b) => {
          if (!a.lastScanned) return 1
          if (!b.lastScanned) return -1
          return new Date(b.lastScanned).getTime() - new Date(a.lastScanned).getTime()
        })
        break
      case "tokens":
        sortedSites.sort((a, b) => b.tokensCount - a.tokensCount)
        break
      case "votes":
      default:
        sortedSites.sort((a, b) => b.votes - a.votes)
        break
    }

    // Apply limit
    const limitedSites = sortedSites.slice(0, limit)

    return NextResponse.json({
      sites: limitedSites,
      total: limitedSites.length,
    })
  } catch (error) {
    console.error("Error loading community sites:", error)
    return NextResponse.json(
      { error: "Failed to load sites" },
      { status: 500 }
    )
  }
}