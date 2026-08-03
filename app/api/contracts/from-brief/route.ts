/**
 * POST /api/contracts/from-brief
 * Natural-language product brief → installable Design Contract ZIP (Pro).
 */

import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { briefToStudioSystem } from '@/lib/ai/brief-to-studio-system'
import { assertProAccess } from '@/lib/billing/entitlements'
import { buildStudioContractPack } from '@/lib/contracts/authored-contract'
import { agentRatelimit } from '@/lib/ratelimit'

export const runtime = 'nodejs'
export const maxDuration = 60

const bodySchema = z.object({
  brief: z.string().min(12).max(4000),
  name: z.string().max(80).optional(),
  format: z.enum(['zip', 'json']).optional(),
})

export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for') || 'anonymous'
  const limited = await agentRatelimit.limit(`brief-pack:${ip}`)
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
    const { system, source } = await briefToStudioSystem({
      brief: body.brief,
      name: body.name,
    })
    const { pack, zip, fileName } = buildStudioContractPack(system)

    if (body.format === 'json') {
      return NextResponse.json({
        source,
        system,
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
        'X-Brief-Source': source,
        'X-Design-Contract-Install': pack.installCommand,
      },
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid brief payload', details: error.issues },
        { status: 400 }
      )
    }
    const message = error instanceof Error ? error.message : 'Brief generation failed'
    console.error('[contracts/from-brief]', error)
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
