/**
 * POST /api/contracts/restyle
 * Structure domain × skin domain → installable Design Contract ZIP.
 */

import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import type { CuratedLike } from '@/lib/analyzers/design-philosophy'
import {
  restyleToStudioSystem,
  type RestyleLayout,
} from '@/lib/analyzers/system-restyle'
import { assertProAccess } from '@/lib/billing/entitlements'
import { buildStudioContractPack } from '@/lib/contracts/authored-contract'
import { normalizeDomain } from '@/lib/domain'
import { agentRatelimit } from '@/lib/ratelimit'
import { getScan } from '@/lib/storage/serverless-store'

export const runtime = 'nodejs'
export const maxDuration = 60

const bodySchema = z.object({
  structureDomain: z.string().min(1).max(253),
  skinDomain: z.string().min(1).max(253),
  name: z.string().max(80).optional(),
  format: z.enum(['zip', 'json']).optional(),
})

export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for') || 'anonymous'
  const limited = await agentRatelimit.limit(`restyle-pack:${ip}`)
  if (!limited.success) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })
  }

  const access = await assertProAccess()
  if (!access.ok) {
    return NextResponse.json(
      { error: access.error, code: access.code, upgradePath: access.upgradePath },
      { status: access.status }
    )
  }

  try {
    const body = bodySchema.parse(await request.json())
    const structureKey = normalizeDomain(body.structureDomain)
    const skinKey = normalizeDomain(body.skinDomain)
    const [structureScan, skinScan] = await Promise.all([
      getScan(structureKey),
      getScan(skinKey),
    ])

    const layout = structureScan?.layoutDNA as RestyleLayout | undefined
    const skin = skinScan?.curatedTokens as CuratedLike | undefined
    const missing = [
      !layout ? structureKey : null,
      !skin ? skinKey : null,
    ].filter(Boolean)

    if (!layout || !skin) {
      return NextResponse.json(
        {
          error: 'Need scanned structure + skin domains',
          missing,
          suggestion: 'Scan missing domains with POST /api/scan first.',
        },
        { status: 404 }
      )
    }

    const restyle = restyleToStudioSystem({
      structureDomain: structureKey,
      skinDomain: skinKey,
      layout,
      skinCurated: skin,
      name: body.name,
    })
    const { pack, zip, fileName } = buildStudioContractPack(
      restyle.system,
      restyle.packOptions
    )

    if (body.format === 'json') {
      return NextResponse.json({
        name: restyle.name,
        structureDomain: restyle.structureDomain,
        skinDomain: restyle.skinDomain,
        appType: restyle.appType,
        system: restyle.system,
        brief: restyle.brief,
        installCommand: pack.installCommand,
        fileName,
        designMd: pack.designMd.markdown,
        fileCount: pack.files.length,
      })
    }

    return new NextResponse(Buffer.from(zip), {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Cache-Control': 'no-store',
        'X-Restyle-Structure': structureKey,
        'X-Restyle-Skin': skinKey,
        'X-Design-Contract-Install': pack.installCommand,
      },
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid restyle payload', details: error.issues },
        { status: 400 }
      )
    }
    const message = error instanceof Error ? error.message : 'Restyle failed'
    console.error('[contracts/restyle]', error)
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
