/**
 * POST /api/contracts/mutate
 * Apply advanced mutations to a StudioSystem (or scanned domain):
 *   - contrast-fix (AA/AAA)
 *   - polarity (light ↔ dark)
 *   - evolve (directive string)
 * Returns ZIP (Pro) or JSON metadata.
 */

import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import type { CuratedLike } from '@/lib/analyzers/design-philosophy'
import { assertProAccess } from '@/lib/billing/entitlements'
import {
  buildStudioContractPack,
  DEFAULT_STUDIO_SYSTEM,
  slugify,
  type StudioSystem,
} from '@/lib/contracts/authored-contract'
import {
  evolveStudioSystem,
  fixStudioContrast,
  invertStudioPolarity,
} from '@/lib/contracts/system-mutate'
import { normalizeDomain } from '@/lib/domain'
import {
  toStudioSystem,
  workingSystemFromScan,
} from '@/lib/design-system/working-system'
import { agentRatelimit } from '@/lib/ratelimit'
import { getScan } from '@/lib/storage/serverless-store'

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
  colors: z.array(colorSchema).min(2).max(64),
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

const bodySchema = z
  .object({
    op: z.enum(['contrast-fix', 'polarity', 'evolve']),
    target: z.enum(['AA', 'AAA']).optional(),
    directive: z.string().min(4).max(400).optional(),
    domain: z.string().max(253).optional(),
    system: studioSchema.optional(),
    format: z.enum(['zip', 'json']).optional(),
  })
  .refine((body) => Boolean(body.system || body.domain), {
    message: 'Provide system or domain',
  })
  .refine((body) => body.op !== 'evolve' || Boolean(body.directive), {
    message: 'evolve requires directive',
  })

function parseStudio(input: z.infer<typeof studioSchema>): StudioSystem {
  return {
    ...DEFAULT_STUDIO_SYSTEM,
    ...input,
    slug: input.slug || slugify(input.name),
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
  const limited = await agentRatelimit.limit(`mutate-pack:${ip}`)
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
    let system: StudioSystem

    if (body.system) {
      system = parseStudio(body.system)
    } else {
      const domain = normalizeDomain(body.domain!)
      const scan = await getScan(domain)
      const curated = scan?.curatedTokens as CuratedLike | undefined
      if (!curated) {
        return NextResponse.json(
          {
            error: `No scan for ${domain}`,
            suggestion: 'Scan with POST /api/scan first, or pass a Studio system.',
          },
          { status: 404 }
        )
      }
      system = toStudioSystem(
        workingSystemFromScan({
          domain,
          curatedTokens: curated,
          personality: typeof scan?.personality === 'string' ? scan.personality : null,
        })
      )
    }

    let report: unknown = null
    if (body.op === 'contrast-fix') {
      const fixed = fixStudioContrast(system, body.target ?? 'AA')
      system = fixed.system
      report = { pairs: fixed.pairs, target: fixed.target, changed: fixed.changed }
    } else if (body.op === 'polarity') {
      system = invertStudioPolarity(system)
      report = { polarity: 'inverted' }
    } else {
      system = evolveStudioSystem(system, body.directive!)
      report = { directive: body.directive }
    }

    const { pack, zip, fileName } = buildStudioContractPack(system, {
      driftKind: `mutate-${body.op}`,
      driftSummary: `Studio system mutated via ${body.op}.`,
      driftEvidence: { op: body.op, report },
    })

    if (body.format === 'json') {
      return NextResponse.json({
        op: body.op,
        report,
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
        'X-Mutate-Op': body.op,
        'X-Design-Contract-Install': pack.installCommand,
      },
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid mutate payload', details: error.issues },
        { status: 400 }
      )
    }
    const message = error instanceof Error ? error.message : 'Mutate failed'
    console.error('[contracts/mutate]', error)
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
