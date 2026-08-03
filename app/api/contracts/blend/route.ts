/**
 * POST /api/contracts/blend
 * Merge 2–10 scanned domains into an installable Design Contract ZIP.
 */

import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { blendSystems } from '@/lib/analyzers/system-blend'
import type { CuratedLike } from '@/lib/analyzers/design-philosophy'
import { buildStudioContractPack } from '@/lib/contracts/authored-contract'
import { normalizeDomain } from '@/lib/domain'
import { agentRatelimit } from '@/lib/ratelimit'
import { getScan } from '@/lib/storage/serverless-store'
import {
  createWorkingSystem,
} from '@/lib/design-system/working-system'
import { saveSystem } from '@/lib/storage/system-store'

export const runtime = 'nodejs'
export const maxDuration = 60

const bodySchema = z.object({
  domains: z.array(z.string().min(1).max(253)).min(2).max(10),
  name: z.string().max(80).optional(),
  /** Also persist the blend to the public library */
  saveToLibrary: z.boolean().optional(),
  /** Return JSON metadata instead of ZIP bytes */
  format: z.enum(['zip', 'json']).optional(),
})

export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for') || 'anonymous'
  const limited = await agentRatelimit.limit(`blend-pack:${ip}`)
  if (!limited.success) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })
  }

  try {
    const body = bodySchema.parse(await request.json())
    const keys = Array.from(new Set(body.domains.map((d) => normalizeDomain(d))))
    const scans = await Promise.all(keys.map((key) => getScan(key)))
    const sources = keys
      .map((domain, index) => ({
        domain,
        curated: scans[index]?.curatedTokens as CuratedLike | undefined,
      }))
      .filter((source): source is { domain: string; curated: CuratedLike } =>
        Boolean(source.curated)
      )
    const missing = keys.filter((domain) => !sources.some((s) => s.domain === domain))

    if (sources.length < 2) {
      return NextResponse.json(
        {
          error: 'Need at least two scanned domains to blend',
          missing,
          suggestion: 'Scan missing domains with POST /api/scan first.',
        },
        { status: 404 }
      )
    }

    const blend = blendSystems(sources, body.name)
    const { pack, zip, fileName } = buildStudioContractPack(blend.system)

    let libraryId: string | null = null
    if (body.saveToLibrary) {
      const working = createWorkingSystem({
        ...blend.system,
        origin: { kind: 'blend', sources: blend.sources },
        philosophyNote: blend.philosophy.statement,
      })
      const stored = await saveSystem({ system: working, visibility: 'public' })
      libraryId = stored.id
    }

    if (body.format === 'json') {
      return NextResponse.json({
        name: blend.name,
        slug: blend.slug,
        sources: blend.sources,
        missing,
        attribution: blend.attribution,
        palette: blend.palette,
        system: blend.system,
        designMd: blend.designMd,
        installCommand: pack.installCommand,
        fileName,
        libraryId,
        download: '/api/contracts/blend',
      })
    }

    return new NextResponse(Buffer.from(zip), {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Cache-Control': 'no-store',
        'X-Design-Contract-Slug': pack.slug,
        'X-Design-Contract-Install': pack.installCommand,
        'X-Blend-Sources': blend.sources.join(','),
        ...(libraryId ? { 'X-Library-System-Id': libraryId } : {}),
      },
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid blend payload', details: error.issues },
        { status: 400 }
      )
    }
    console.error('[contracts/blend]', error)
    return NextResponse.json({ error: 'Blend failed' }, { status: 500 })
  }
}
