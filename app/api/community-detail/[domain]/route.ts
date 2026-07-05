import { NextRequest, NextResponse } from "next/server"
import {
  getSiteByDomain,
  getTokenSetsBySiteId,
  getLayoutProfileBySiteId,
} from "@/lib/db/queries"
import {
  buildLayoutDNAFromProfile,
  transformTokenSetForAnalyzer,
} from "@/lib/utils/token-set-transform"

export const dynamic = "force-dynamic"

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ domain: string }> }
) {
  try {
    const { domain: rawDomain } = await params
    const domain = decodeURIComponent(rawDomain)

    if (!domain) {
      return NextResponse.json({ error: "Domain is required" }, { status: 400 })
    }

    if (!process.env.DATABASE_URL) {
      return NextResponse.json(
        { error: "Database not available" },
        { status: 503 }
      )
    }

    const site = await getSiteByDomain(domain)
    if (!site) {
      return NextResponse.json({ error: "Site not found" }, { status: 404 })
    }

    const [tokenSets, layoutProfile] = await Promise.all([
      getTokenSetsBySiteId(site.id),
      getLayoutProfileBySiteId(site.id),
    ])

    const latestTokenSet = tokenSets[0] ?? null

    const scanHistory = tokenSets.map((tokenSet) => ({
      version: tokenSet.versionNumber,
      changes: `Version ${tokenSet.versionNumber} · ${tokenSet.version}`,
      date: tokenSet.createdAt.toISOString(),
      tokenSetId: tokenSet.id,
    }))

    return NextResponse.json(
      {
        domain: site.domain,
        title: site.title,
        description: site.description,
        favicon: site.favicon,
        popularity: site.popularity,
        last_scanned: site.lastScanned?.toISOString() ?? null,
        status: site.status,
        submitted_by: null,
        tokenSet: latestTokenSet
          ? transformTokenSetForAnalyzer(latestTokenSet)
          : null,
        scanHistory,
        layoutDNA: layoutProfile
          ? buildLayoutDNAFromProfile(layoutProfile)
          : null,
      },
      {
        headers: {
          "Cache-Control": "public, max-age=60, stale-while-revalidate=120",
        },
      }
    )
  } catch (error) {
    console.error("Community detail API error:", error)
    return NextResponse.json(
      { error: "Failed to load site details" },
      { status: 500 }
    )
  }
}
