/**
 * POST /api/sites/[domain]/versions/compare
 * Compare two serverless ScanVersion snapshots (Blob/Redis), not Postgres.
 */

import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { curatedToW3CTokenSet } from '@/lib/analyzers/curated-to-w3c'
import { compareTokenSets, generateChangelog } from '@/lib/analyzers/version-diff'
import { listScanVersions } from '@/lib/storage/serverless-store'

export const runtime = 'nodejs'

const bodySchema = z.object({
  oldScanId: z.string().min(1).max(120),
  newScanId: z.string().min(1).max(120),
})

function snapshotToCurated(version: Awaited<ReturnType<typeof listScanVersions>>[number]) {
  if (version.curated) return version.curated
  return {
    colors: version.colors.map((value, index) => ({ name: `color-${index + 1}`, value })),
    typography: {
      families: version.fonts.map((value, index) => ({
        name: `font-${index + 1}`,
        value,
      })),
    },
    spacing: version.spacing.map((value, index) => ({
      name: `space-${index + 1}`,
      value,
    })),
    radius: version.radius.map((value, index) => ({
      name: `radius-${index + 1}`,
      value,
    })),
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ domain: string }> }
) {
  try {
    const { domain: rawDomain } = await params
    const domain = decodeURIComponent(rawDomain || '').trim()
    if (!domain) {
      return NextResponse.json({ error: 'Domain is required' }, { status: 400 })
    }

    const body = bodySchema.parse(await request.json())
    const versions = await listScanVersions(domain)
    const oldVersion = versions.find((entry) => entry.scanId === body.oldScanId)
    const newVersion = versions.find((entry) => entry.scanId === body.newScanId)

    if (!oldVersion || !newVersion) {
      return NextResponse.json(
        { error: 'One or both scan versions were not found for this domain' },
        { status: 404 }
      )
    }

    const oldTokens = curatedToW3CTokenSet(snapshotToCurated(oldVersion), {
      name: `${domain}@${oldVersion.scanId}`,
      url: `https://${domain}`,
    })
    const newTokens = curatedToW3CTokenSet(snapshotToCurated(newVersion), {
      name: `${domain}@${newVersion.scanId}`,
      url: `https://${domain}`,
    })

    const diff = compareTokenSets(oldTokens, newTokens)
    const changelog = generateChangelog(diff)

    return NextResponse.json({
      domain,
      diff,
      changelog,
      oldVersion: {
        scanId: oldVersion.scanId,
        ts: oldVersion.ts,
        confidence: oldVersion.confidence,
      },
      newVersion: {
        scanId: newVersion.scanId,
        ts: newVersion.ts,
        confidence: newVersion.confidence,
      },
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid compare payload', details: error.issues },
        { status: 400 }
      )
    }
    console.error('[versions/compare]', error)
    return NextResponse.json({ error: 'Failed to compare versions' }, { status: 500 })
  }
}
