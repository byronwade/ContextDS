import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { sites } from "@/lib/db/schema"
import { eq, sql } from "drizzle-orm"
import { redis } from "@/lib/ratelimit"
import { createHash } from "crypto"

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

    // Create user fingerprint for vote deduplication
    const identifier = request.headers.get('x-forwarded-for')?.split(',')[0] ??
                      request.headers.get('x-real-ip') ??
                      'unknown'
    const userAgent = request.headers.get('user-agent') ?? ''
    const fingerprint = createHash('sha256')
      .update(`${identifier}:${userAgent}`)
      .digest('hex')

    // Check if already voted (24-hour window) - skip in development
    if (redis) {
      const voteKey = `vote:${siteId}:${fingerprint}`
      const hasVoted = await redis.get(voteKey)

      if (hasVoted) {
        return NextResponse.json(
          { error: "Already voted for this site. Please try again in 24 hours." },
          { status: 429 }
        )
      }
    }

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

    // Record vote with 24-hour expiry - skip in development
    if (redis) {
      const voteKey = `vote:${siteId}:${fingerprint}`
      await redis.set(voteKey, '1', { ex: 86400 })
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