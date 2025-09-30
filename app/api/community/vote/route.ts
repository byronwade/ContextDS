import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { sites } from "@/lib/db/schema"
import { eq, sql } from "drizzle-orm"

export async function POST(request: NextRequest) {
  try {
    const { siteId, voteType } = await request.json()

    // Validate input
    if (!siteId || voteType !== "upvote") {
      return NextResponse.json(
        { error: "Invalid vote parameters" },
        { status: 400 }
      )
    }

    // TODO: Check if user already voted (requires auth/session)
    // For now, we'll allow multiple votes (MVP version)

    // Increment site popularity as vote counter
    const result = await db
      .update(sites)
      .set({
        popularity: sql`COALESCE(${sites.popularity}, 0) + 1`,
        updatedAt: new Date(),
      })
      .where(eq(sites.id, siteId))
      .returning({
        id: sites.id,
        domain: sites.domain,
        popularity: sites.popularity,
      })

    if (result.length === 0) {
      return NextResponse.json(
        { error: "Site not found" },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      site: result[0],
      votes: result[0].popularity || 0,
    })
  } catch (error) {
    console.error("Error processing vote:", error)
    return NextResponse.json(
      { error: "Failed to process vote" },
      { status: 500 }
    )
  }
}