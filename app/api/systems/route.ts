import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getEntitlementFromRequest } from '@/lib/billing/entitlements'
import { slugify } from '@/lib/contracts/authored-contract'
import { createWorkingSystem, type WorkingSystem } from '@/lib/design-system/working-system'
import { canAccessSystem, getSystem, listSystems, saveSystem } from '@/lib/storage/system-store'

export const runtime = 'nodejs'

/** Roughly 200 tokens + prose — anything larger is not a design system. */
const MAX_BODY_BYTES = 256 * 1024

const originSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('blank') }),
  z.object({
    kind: z.literal('scan'),
    domain: z.string().min(1).max(253),
    scanId: z.string().max(120).optional(),
  }),
  z.object({
    kind: z.literal('blend'),
    sources: z.array(z.string().min(1).max(253)).min(1).max(8),
  }),
  z.object({
    kind: z.literal('fork'),
    systemId: z.string().min(1).max(120),
    name: z.string().min(1).max(80),
  }),
])

const colorSchema = z.object({
  id: z.string().min(1).max(60).optional(),
  role: z.string().min(1).max(60),
  value: z.string().min(1).max(120),
})

const systemSchema = z.object({
  id: z.string().max(120).nullable().optional(),
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
  origin: originSchema.optional(),
  revision: z.number().int().min(0).max(100000).optional(),
})

const saveRequestSchema = z.object({
  id: z.string().min(3).max(120).optional(),
  system: systemSchema,
  visibility: z.enum(['public', 'private']).optional(),
})

/** Drop absent keys so zod optionals never overwrite the system defaults. */
function defined<T extends Record<string, unknown>>(input: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(input).filter(([, value]) => value !== undefined)
  ) as Partial<T>
}

function toWorkingSystem(input: z.infer<typeof systemSchema>): WorkingSystem {
  const { id, name, slug, colors, origin, ...rest } = input
  return createWorkingSystem({
    ...defined(rest),
    id: id ?? null,
    name,
    slug: slug || slugify(name),
    colors: colors.map((color) => ({
      id: color.id ?? color.role,
      role: color.role,
      value: color.value,
    })),
    origin: origin ?? { kind: 'blank' },
  })
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const rawLimit = Number.parseInt(searchParams.get('limit') || '50', 10)
    const mine = searchParams.get('mine') === '1'
    const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(rawLimit, 1), 200) : 50

    if (mine) {
      const entitlement = await getEntitlementFromRequest(request)
      const customerId = entitlement?.customerId || entitlement?.stripeCustomerId
      if (!customerId) {
        return NextResponse.json(
          { error: 'Sign in via Stripe checkout to list your private systems', systems: [] }, { status: 401 , headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60' } })
      }
      const systems = await listSystems({
        limit,
        ownerCustomerId: customerId,
      })
      return NextResponse.json({ systems, total: systems.length, mine: true })
    }

    // Unauthenticated listing only enumerates public systems.
    const systems = await listSystems({
      limit,
      visibility: 'public',
    })

    return NextResponse.json({ systems, total: systems.length })
  } catch (error) {
    console.error('Error loading systems:', error)
    return NextResponse.json({ error: 'Failed to load systems' }, { status: 500 , headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60' } })
  }
}

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type')
    if (!contentType || !contentType.includes('application/json')) {
      return NextResponse.json(
        { error: 'Content-Type must be application/json' }, { status: 415 , headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60' } })
    }

    const contentLength = request.headers.get('content-length')
    if (contentLength && Number.parseInt(contentLength, 10) > MAX_BODY_BYTES) {
      return NextResponse.json({ error: 'Request body too large' }, { status: 413 , headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60' } })
    }

    const raw = await request.text()
    if (raw.length > MAX_BODY_BYTES) {
      return NextResponse.json({ error: 'Request body too large' }, { status: 413 , headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60' } })
    }

    const params = saveRequestSchema.parse(JSON.parse(raw))
    const visibility = params.visibility ?? 'public'
    const entitlement = await getEntitlementFromRequest(request)
    const customerId = entitlement?.customerId || entitlement?.stripeCustomerId

    if (visibility === 'private' && !customerId && process.env.BILLING_BYPASS !== '1') {
      return NextResponse.json(
        {
          error:
            'Private systems require a billing session. Complete checkout at /pricing first.',
          upgradePath: '/pricing',
        }, { status: 401 , headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60' } })
    }

    if (params.id) {
      const existing = await getSystem(params.id)
      if (existing && !canAccessSystem(existing, customerId)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 , headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60' } })
      }
    }

    const stored = await saveSystem({
      id: params.id,
      system: toWorkingSystem(params.system),
      visibility,
      ownerCustomerId:
        visibility === 'private'
          ? customerId || (process.env.BILLING_BYPASS === '1' ? 'bypass' : null)
          : customerId ?? null,
      ownerEmail: entitlement?.email ?? null,
    })

    return NextResponse.json(stored, { headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60' } })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid system payload', details: error.issues }, { status: 400 , headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60' } })
    }

    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 , headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60' } })
    }

    console.error('Error saving system:', error)
    return NextResponse.json({ error: 'Failed to save system' }, { status: 500 , headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60' } })
  }
}
