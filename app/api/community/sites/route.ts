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

    // Base query to get sites with token counts
    const sitesQuery = db
      .select({
        id: sites.id,
        domain: sites.domain,
        title: sites.title,
        description: sites.description,
        favicon: sites.favicon,
        popularity: sites.popularity,
        lastScanned: sites.lastScanned,
        tokensCount: sql<number>`(
          SELECT COUNT(DISTINCT jsonb_object_keys(tokens_json))
          FROM ${tokenSets}
          WHERE ${tokenSets.siteId} = ${sites.id}
          LIMIT 1
        )`.as("tokens_count"),
        votes: sql<number>`COALESCE(${sites.popularity}, 0)`.as("votes"),
        consensusScore: sql<number>`(
          SELECT COALESCE(AVG(CAST(consensus_score AS FLOAT)), 0)
          FROM ${tokenSets}
          WHERE ${tokenSets.siteId} = ${sites.id}
        )`.as("consensus_score"),
      })
      .from(sites)
      .where(eq(sites.status, "completed"))

    // Apply sorting
    let orderedQuery
    switch (sortBy) {
      case "recent":
        orderedQuery = sitesQuery.orderBy(desc(sites.lastScanned))
        break
      case "tokens":
        orderedQuery = sitesQuery.orderBy(
          desc(sql`(
            SELECT COUNT(DISTINCT jsonb_object_keys(tokens_json))
            FROM ${tokenSets}
            WHERE ${tokenSets.siteId} = ${sites.id}
            LIMIT 1
          )`)
        )
        break
      case "votes":
      default:
        orderedQuery = sitesQuery.orderBy(desc(sites.popularity))
        break
    }

    const results = await orderedQuery.limit(limit)

    // Transform results
    const sitesWithVotes = results.map((site: typeof results[number]) => ({
      id: site.id,
      domain: site.domain,
      title: site.title,
      description: site.description,
      favicon: site.favicon,
      tokensCount: Number(site.tokensCount) || 0,
      popularity: site.popularity || 0,
      votes: Number(site.votes) || 0,
      lastScanned: site.lastScanned?.toISOString() || null,
      consensusScore: Math.round(Number(site.consensusScore) || 0),
      hasVoted: false, // TODO: Track user votes with session/auth
    }))

    return NextResponse.json({
      sites: sitesWithVotes,
      total: sitesWithVotes.length,
    })
  } catch (error) {
    console.error("Error loading community sites:", error)
    return NextResponse.json(
      { error: "Failed to load sites" },
      { status: 500 }
    )
  }
}