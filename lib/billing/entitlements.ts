/**
 * Server-side entitlements — Redis when available, in-memory fallback.
 * Cookie session bridges Stripe Checkout → browser without a full auth stack.
 */

import { createHmac, timingSafeEqual } from 'node:crypto'
import { cookies } from 'next/headers'
import { type NextRequest, type NextResponse } from 'next/server'
import {
  BILLING,
  currentQuotaPeriod,
  isProEntitlement,
  type Entitlement,
} from '@/lib/billing/config'

const COOKIE_NAME = 'dc_pro'
const MEMORY = new Map<string, Entitlement>()

function redis() {
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN
  if (!url || !token) return null
  return { url: url.replace(/\/$/, ''), token }
}

async function redisGet(key: string): Promise<string | null> {
  const client = redis()
  if (!client) return null
  const response = await fetch(`${client.url}/get/${encodeURIComponent(key)}`, {
    headers: { Authorization: `Bearer ${client.token}` },
    cache: 'no-store',
  })
  if (!response.ok) return null
  const data = (await response.json()) as { result?: string | null }
  return data.result ?? null
}

async function redisSet(key: string, value: string, ttlSeconds?: number): Promise<void> {
  const client = redis()
  if (!client) return
  const path = ttlSeconds
    ? `/set/${encodeURIComponent(key)}/${encodeURIComponent(value)}/EX/${ttlSeconds}`
    : `/set/${encodeURIComponent(key)}/${encodeURIComponent(value)}`
  await fetch(`${client.url}${path}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${client.token}` },
  }).catch(() => undefined)
}

async function redisDel(key: string): Promise<void> {
  const client = redis()
  if (!client) return
  await fetch(`${client.url}/del/${encodeURIComponent(key)}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${client.token}` },
  }).catch(() => undefined)
}

function entitlementKey(customerId: string): string {
  return `entitlement:stripe:${customerId}`
}

function signingSecret(): string {
  return (
    process.env.BILLING_COOKIE_SECRET?.trim() ||
    process.env.STRIPE_SECRET_KEY?.trim() ||
    'dev-only-billing-secret'
  )
}

export type SessionPayload = {
  customerId: string
  email?: string
  plan: 'pro'
  exp: number
}

export function signSession(payload: SessionPayload): string {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const sig = createHmac('sha256', signingSecret()).update(body).digest('base64url')
  return `${body}.${sig}`
}

export function verifySession(token: string | undefined | null): SessionPayload | null {
  if (!token || !token.includes('.')) return null
  const [body, sig] = token.split('.')
  if (!body || !sig) return null
  const expected = createHmac('sha256', signingSecret()).update(body).digest('base64url')
  try {
    const a = Buffer.from(sig)
    const b = Buffer.from(expected)
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null
  } catch {
    return null
  }
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as SessionPayload
    if (payload.plan !== 'pro' || !payload.customerId) return null
    if (payload.exp < Date.now()) return null
    return payload
  } catch {
    return null
  }
}

export async function saveEntitlement(entitlement: Entitlement): Promise<void> {
  if (!entitlement.customerId) return
  const key = entitlementKey(entitlement.customerId)
  MEMORY.set(key, entitlement)
  const ttl =
    entitlement.periodEnd && entitlement.periodEnd > Date.now()
      ? Math.ceil((entitlement.periodEnd - Date.now()) / 1000) + 86_400
      : 60 * 60 * 24 * 40
  await redisSet(key, JSON.stringify(entitlement), ttl)
}

export async function getEntitlementByCustomerId(
  customerId: string
): Promise<Entitlement | null> {
  const key = entitlementKey(customerId)
  const cached = MEMORY.get(key)
  if (cached) return cached
  const raw = await redisGet(key)
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as Entitlement
    MEMORY.set(key, parsed)
    return parsed
  } catch {
    return null
  }
}

export async function grantProEntitlement(input: {
  stripeCustomerId: string
  stripeSubscriptionId: string
  email?: string
  status: NonNullable<Entitlement['status']>
  currentPeriodEnd: number
  appPacksIncluded?: number
  /** When set, force remaining; otherwise preserve in-period usage */
  appPacksUsed?: number
}): Promise<Entitlement> {
  const existing = await getEntitlementByCustomerId(input.stripeCustomerId)
  const period = currentQuotaPeriod()
  const included = input.appPacksIncluded ?? BILLING.appPacksPerMonth

  let remaining = included
  if (typeof input.appPacksUsed === 'number') {
    remaining = Math.max(0, included - input.appPacksUsed)
  } else if (
    existing &&
    existing.quotaPeriod === period &&
    typeof existing.appPacksRemaining === 'number'
  ) {
    remaining = existing.appPacksRemaining
  }

  const entitlement: Entitlement = {
    plan: 'pro',
    customerId: input.stripeCustomerId,
    email: input.email || existing?.email,
    status: input.status,
    periodEnd: input.currentPeriodEnd,
    appPacksRemaining: remaining,
    quotaPeriod: period,
    stripeSubscriptionId: input.stripeSubscriptionId,
    source: 'stripe',
  }
  await saveEntitlement(entitlement)
  return entitlement
}

export async function revokeEntitlement(customerId: string): Promise<void> {
  const key = entitlementKey(customerId)
  MEMORY.delete(key)
  await redisDel(key)
}

/** Dev / preview: BILLING_BYPASS=1 unlocks App Packs without Stripe. */
export function bypassEntitlement(): Entitlement | null {
  if (process.env.BILLING_BYPASS === '1' || process.env.BILLING_BYPASS === 'true') {
    return {
      plan: 'pro',
      status: 'active',
      appPacksRemaining: BILLING.appPacksPerMonth,
      quotaPeriod: currentQuotaPeriod(),
      source: 'bypass',
    }
  }
  return null
}

async function resolveFromSession(
  customerId: string,
  email?: string,
  exp?: number
): Promise<Entitlement> {
  const stored = await getEntitlementByCustomerId(customerId)
  if (stored && isProEntitlement(stored)) {
    const period = currentQuotaPeriod()
    if (stored.quotaPeriod !== period) {
      const refreshed: Entitlement = {
        ...stored,
        quotaPeriod: period,
        appPacksRemaining: BILLING.appPacksPerMonth,
      }
      await saveEntitlement(refreshed)
      return refreshed
    }
    return stored
  }

  return {
    plan: 'pro',
    customerId,
    email,
    status: 'active',
    periodEnd: exp,
    appPacksRemaining: BILLING.appPacksPerMonth,
    quotaPeriod: currentQuotaPeriod(),
    source: 'stripe',
  }
}

export async function getRequestEntitlement(): Promise<Entitlement | null> {
  const bypass = bypassEntitlement()
  if (bypass) return bypass

  const jar = await cookies()
  const token = jar.get(COOKIE_NAME)?.value
  const session = verifySession(token)
  if (!session) return null
  return resolveFromSession(session.customerId, session.email, session.exp)
}

/** Same as getRequestEntitlement but works from Route Handler request cookies. */
export async function getEntitlementFromRequest(
  request: NextRequest
): Promise<(Entitlement & { stripeCustomerId?: string }) | null> {
  const bypass = bypassEntitlement()
  if (bypass) return bypass

  const token = request.cookies.get(COOKIE_NAME)?.value
  const session = verifySession(token)
  if (!session) return null
  const entitlement = await resolveFromSession(
    session.customerId,
    session.email,
    session.exp
  )
  return { ...entitlement, stripeCustomerId: entitlement.customerId }
}

export async function assertCanCreateAppPack(): Promise<
  | { ok: true; entitlement: Entitlement }
  | {
      ok: false
      status: number
      error: string
      code: 'payment_required' | 'quota_exceeded'
      upgradePath: string
    }
> {
  // Local / preview without Stripe: allow vision iteration
  if (
    !process.env.STRIPE_SECRET_KEY &&
    (process.env.NODE_ENV === 'development' ||
      process.env.VERCEL_ENV === 'preview' ||
      bypassEntitlement())
  ) {
    return {
      ok: true,
      entitlement: bypassEntitlement() || {
        plan: 'pro',
        status: 'active',
        appPacksRemaining: BILLING.appPacksPerMonth,
        quotaPeriod: currentQuotaPeriod(),
        source: 'bypass',
      },
    }
  }

  if (bypassEntitlement()) {
    return { ok: true, entitlement: bypassEntitlement()! }
  }

  const entitlement = await getRequestEntitlement()
  if (!isProEntitlement(entitlement)) {
    return {
      ok: false,
      status: 402,
      code: 'payment_required',
      upgradePath: '/pricing',
      error: `App Packs need Pro ($${BILLING.proPriceUsd}/mo). Attach at least ${BILLING.minAppPackImages} product UI screenshots — ${BILLING.appPacksPerMonth} packs included each month.`,
    }
  }

  const remaining = entitlement!.appPacksRemaining
  if (typeof remaining === 'number' && remaining <= 0) {
    return {
      ok: false,
      status: 402,
      code: 'quota_exceeded',
      upgradePath: '/pricing',
      error: `You've used all ${BILLING.appPacksPerMonth} App Packs this month. Quota resets next month — manage billing from Pricing.`,
    }
  }

  return { ok: true, entitlement: entitlement! }
}

export async function consumeAppPackCredit(entitlement: Entitlement): Promise<Entitlement> {
  if (!entitlement.customerId || entitlement.source === 'bypass') return entitlement
  const next: Entitlement = {
    ...entitlement,
    appPacksRemaining: Math.max(
      0,
      (entitlement.appPacksRemaining ?? BILLING.appPacksPerMonth) - 1
    ),
    quotaPeriod: entitlement.quotaPeriod || currentQuotaPeriod(),
  }
  await saveEntitlement(next)
  return next
}

export function setEntitlementCookie(
  response: NextResponse,
  entitlement: Entitlement
): void {
  if (!entitlement.customerId) return
  const exp = entitlement.periodEnd || Date.now() + 32 * 24 * 60 * 60 * 1000
  const token = signSession({
    customerId: entitlement.customerId,
    email: entitlement.email,
    plan: 'pro',
    exp,
  })
  const maxAge = Math.max(60, Math.floor((exp - Date.now()) / 1000))
  response.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge,
  })
}

export function publicEntitlementView(entitlement: Entitlement | null) {
  const pro = isProEntitlement(entitlement)
  return {
    isPro: pro,
    plan: pro ? ('pro' as const) : ('free' as const),
    status: entitlement?.status ?? null,
    email: entitlement?.email ?? null,
    appPacksRemaining: pro ? (entitlement?.appPacksRemaining ?? BILLING.appPacksPerMonth) : 0,
    appPacksPerMonth: BILLING.appPacksPerMonth,
    minAppPackImages: BILLING.minAppPackImages,
    maxAppPackImages: BILLING.maxAppPackImages,
    periodEnd: entitlement?.periodEnd ?? null,
    source: entitlement?.source ?? null,
  }
}

export function entitlementCookieOptions(maxAgeSeconds: number) {
  return {
    name: COOKIE_NAME,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: maxAgeSeconds,
  }
}

export { COOKIE_NAME }
