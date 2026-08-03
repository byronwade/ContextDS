/**
 * POST /api/contracts/authored
 * Studio → full installable Design Contract ZIP (Pro).
 */

import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { assertProAccess } from '@/lib/billing/entitlements'
import {
  buildStudioContractPack,
  DEFAULT_STUDIO_SYSTEM,
  type StudioSystem,
} from '@/lib/contracts/authored-contract'
import { agentRatelimit } from '@/lib/ratelimit'

export const runtime = 'nodejs'
export const maxDuration = 30

const colorSchema = z.object({
  id: z.string().min(1).max(60),
  role: z.string().min(1).max(60),
  value: z.string().min(1).max(120),
})

const studioSchema = z.object({
  name: z.string().min(1).max(80),
  slug: z.string().max(120).optional(),
  philosophyNote: z.string().max(600).optional(),
  colors: z.array(colorSchema).min(1).max(64),
  fontDisplay: z.string().max(60).optional(),
  fontBody: z.string().max(60).optional(),
  fontMono: z.string().max(60).optional(),
  baseSize: z.number().min(10).max(24).optional(),
  scaleRatio: z.number().min(1.05).max(1.8).optional(),
  scaleSteps: z.number().int().min(3).max(10).optional(),
  spacingBase: z.union([z.literal(4), z.literal(8)]).optional(),
  spacingSteps: z.number().int().min(4).max(12).optional(),
  radius: z.number().min(0).max(48).optional(),
  depth: z.enum(['flat', 'soft', 'layered']).optional(),
})

function toStudioSystem(input: z.infer<typeof studioSchema>): StudioSystem {
  return {
    ...DEFAULT_STUDIO_SYSTEM,
    ...input,
    slug: input.slug || DEFAULT_STUDIO_SYSTEM.slug,
    philosophyNote: input.philosophyNote ?? '',
    colors: input.colors,
    fontDisplay: input.fontDisplay || DEFAULT_STUDIO_SYSTEM.fontDisplay,
    fontBody: input.fontBody || DEFAULT_STUDIO_SYSTEM.fontBody,
    fontMono: input.fontMono || DEFAULT_STUDIO_SYSTEM.fontMono,
    baseSize: input.baseSize ?? DEFAULT_STUDIO_SYSTEM.baseSize,
    scaleRatio: input.scaleRatio ?? DEFAULT_STUDIO_SYSTEM.scaleRatio,
    scaleSteps: input.scaleSteps ?? DEFAULT_STUDIO_SYSTEM.scaleSteps,
    spacingBase: input.spacingBase ?? DEFAULT_STUDIO_SYSTEM.spacingBase,
    spacingSteps: input.spacingSteps ?? DEFAULT_STUDIO_SYSTEM.spacingSteps,
    radius: input.radius ?? DEFAULT_STUDIO_SYSTEM.radius,
    depth: input.depth ?? DEFAULT_STUDIO_SYSTEM.depth,
  }
}

export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for') || 'anonymous'
  const limited = await agentRatelimit.limit(`studio-pack:${ip}`)
  if (!limited.success) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })
  }

  const access = await assertProAccess()
  if (!access.ok) {
    return NextResponse.json(
      {
        error: access.error,
        code: access.code,
        upgradePath: access.upgradePath,
      },
      { status: access.status }
    )
  }

  try {
    const body = await request.json()
    const parsed = studioSchema.parse(body.system ?? body)
    const system = toStudioSystem(parsed)
    const { pack, zip, fileName } = buildStudioContractPack(system)

    return new NextResponse(Buffer.from(zip), {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Cache-Control': 'no-store',
        'X-Design-Contract-Slug': pack.slug,
        'X-Design-Contract-Files': String(pack.files.length),
        'X-Design-Contract-Install': pack.installCommand,
      },
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid Studio system', details: error.issues },
        { status: 400 }
      )
    }
    console.error('[contracts/authored]', error)
    return NextResponse.json({ error: 'Failed to build Studio pack' }, { status: 500 })
  }
}
