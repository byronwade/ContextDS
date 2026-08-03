/**
 * Server-side entitlements — Redis when available, in-memory fallback.
 *
 * Model:
 * - App Pack **credits never expire** (one-time purchases + Pro monthly top-ups).
 * - Pro subscription unlocks MCP key + Studio; it is optional.
 * - Cookie session bridges Stripe Checkout → browser without a full auth stack.
 */

import { createHmac, timingSafeEqual } from 'node:crypto'
import { cookies } from 'next/headers'
import { type NextRequest, type NextResponse } from 'next/server'
import {
  BILLING,
  canSpendAppPack,
  creditBalance,
  currentQuotaPeriod,
  isProEntitlement,
  type Entitlement,
  type PlanId,
} from '@/lib/billing/config'

const COOKIE_NAME = 'dc_pro'
const MEMORY = new Map<string, Entitlement>()
const YEAR_MS = 365 * 24 * 60 * 60 * 1000

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
  plan: 'pro' | 'credits'
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
    if ((payload.plan !== 'pro' && payload.plan !== 'credits') || !payload.customerId) {
      return null
    }
    if (payload.exp < Date.now()) return null
    return payload
  } catch {
    return null
  }
}

function normalizeEntitlement(raw: Entitlement): Entitlement {
  const credits = creditBalance(raw)
  return {
    ...raw,
    appPackCredits: credits,
    appPacksRemaining: credits,
  }
}

export async function saveEntitlement(entitlement: Entitlement): Promise<void> {
  if (!entitlement.customerId) return
  const normalized = normalizeEntitlement(entitlement)
  const key = entitlementKey(entitlement.customerId)
  MEMORY.set(key, normalized)
  // Credits don't expire — keep Redis records for a long time
  const ttl =
    normalized.periodEnd && normalized.periodEnd > Date.now()
      ? Math.max(
          60 * 60 * 24 * 400,
          Math.ceil((normalized.periodEnd - Date.now()) / 1000) + 86_400
        )
      : 60 * 60 * 24 * 400
  await redisSet(key, JSON.stringify(normalized), ttl)
}

export async function getEntitlementByCustomerId(
  customerId: string
): Promise<Entitlement | null> {
  const key = entitlementKey(customerId)
  const cached = MEMORY.get(key)
  if (cached) return normalizeEntitlement(cached)
  const raw = await redisGet(key)
  if (!raw) return null
  try {
    const parsed = normalizeEntitlement(JSON.parse(raw) as Entitlement)
    MEMORY.set(key, parsed)
    return parsed
  } catch {
    return null
  }
}

/** Add never-expiring App Pack credits (one-time purchase). */
export async function grantCreditPack(input: {
  stripeCustomerId: string
  email?: string
  credits: number
}): Promise<Entitlement> {
  const existing = await getEntitlementByCustomerId(input.stripeCustomerId)
  const wasPro = isProEntitlement(existing)
  const plan: PlanId = wasPro ? 'pro' : 'credits'
  const next: Entitlement = {
    ...(existing || { source: 'stripe' as const }),
    plan,
    customerId: input.stripeCustomerId,
    email: input.email || existing?.email,
    status: wasPro ? existing?.status : existing?.status,
    periodEnd: wasPro ? existing?.periodEnd : undefined,
    stripeSubscriptionId: existing?.stripeSubscriptionId,
    appPackCredits: creditBalance(existing) + Math.max(0, input.credits),
    source: 'stripe',
  }
  await saveEntitlement(next)
  return next
}

/**
 * Grant / refresh Pro. Monthly credits **stack** onto unused balance
 * once per calendar month (quotaPeriod).
 */
export async function grantProEntitlement(input: {
  stripeCustomerId: string
  stripeSubscriptionId: string
  email?: string
  status: NonNullable<Entitlement['status']>
  currentPeriodEnd: number
  creditsPerMonth?: number
}): Promise<Entitlement> {
  const existing = await getEntitlementByCustomerId(input.stripeCustomerId)
  const period = currentQuotaPeriod()
  const monthly = input.creditsPerMonth ?? BILLING.proCreditsPerMonth
  let credits = creditBalance(existing)

  if (!existing || existing.quotaPeriod !== period) {
    credits += monthly
  }

  const entitlement: Entitlement = {
    plan: 'pro',
    customerId: input.stripeCustomerId,
    email: input.email || existing?.email,
    status: input.status,
    periodEnd: input.currentPeriodEnd,
    appPackCredits: credits,
    quotaPeriod: period,
    stripeSubscriptionId: input.stripeSubscriptionId,
    mcpKeyFingerprint: existing?.mcpKeyFingerprint,
    source: 'stripe',
  }
  await saveEntitlement(entitlement)
  return entitlement
}

/** Downgrade Pro → keep leftover credits as a credit wallet. */
export async function revokeProKeepCredits(customerId: string): Promise<void> {
  const existing = await getEntitlementByCustomerId(customerId)
  if (!existing) {
    await redisDel(entitlementKey(customerId))
    MEMORY.delete(entitlementKey(customerId))
    return
  }
  const credits = creditBalance(existing)
  if (credits <= 0) {
    MEMORY.delete(entitlementKey(customerId))
    await redisDel(entitlementKey(customerId))
    return
  }
  await saveEntitlement({
    plan: 'credits',
    customerId,
    email: existing.email,
    appPackCredits: credits,
    source: 'stripe',
  })
}

/** @deprecated use revokeProKeepCredits */
export async function revokeEntitlement(customerId: string): Promise<void> {
  await revokeProKeepCredits(customerId)
}

/** Dev / preview: BILLING_BYPASS=1 unlocks App Packs without Stripe. */
export function bypassEntitlement(): Entitlement | null {
  if (process.env.BILLING_BYPASS === '1' || process.env.BILLING_BYPASS === 'true') {
    return {
      plan: 'pro',
      status: 'active',
      appPackCredits: 99,
      quotaPeriod: currentQuotaPeriod(),
      source: 'bypass',
    }
  }
  return null
}

async function applyProMonthlyTopUp(stored: Entitlement): Promise<Entitlement> {
  if (!isProEntitlement(stored)) return stored
  const period = currentQuotaPeriod()
  if (stored.quotaPeriod === period) return stored
  const refreshed: Entitlement = {
    ...stored,
    quotaPeriod: period,
    appPackCredits: creditBalance(stored) + BILLING.proCreditsPerMonth,
  }
  await saveEntitlement(refreshed)
  return refreshed
}

async function resolveFromSession(
  customerId: string,
  email?: string,
  exp?: number
): Promise<Entitlement> {
  const stored = await getEntitlementByCustomerId(customerId)
  if (stored) {
    return applyProMonthlyTopUp(stored)
  }

  // Cookie present but Redis cold — minimal wallet until webhook fills
  return {
    plan: 'credits',
    customerId,
    email,
    periodEnd: exp,
    appPackCredits: 0,
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

/** Studio export + Pro-only MCP write tools. */
export async function assertProAccess(): Promise<
  | { ok: true; entitlement: Entitlement }
  | {
      ok: false
      status: number
      error: string
      code: 'payment_required' | 'pro_required'
      upgradePath: string
    }
> {
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
        appPackCredits: 99,
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
      code: entitlement ? 'pro_required' : 'payment_required',
      upgradePath: '/pricing',
      error: entitlement
        ? `Studio pack export and Pro MCP write tools need an active Pro plan ($${BILLING.proPriceUsd}/mo). See /pricing.`
        : `Pro required — start a trial or subscribe at /pricing.`,
    }
  }

  return { ok: true, entitlement }
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
        appPackCredits: 99,
        source: 'bypass',
      },
    }
  }

  if (bypassEntitlement()) {
    return { ok: true, entitlement: bypassEntitlement()! }
  }

  const entitlement = await getRequestEntitlement()
  if (!canSpendAppPack(entitlement)) {
    return {
      ok: false,
      status: 402,
      code: creditBalance(entitlement) === 0 && entitlement ? 'quota_exceeded' : 'payment_required',
      upgradePath: '/pricing',
      error: entitlement
        ? `You're out of App Pack credits. Buy a one-time pack (credits never expire) or Pro ($${BILLING.proPriceUsd}/mo adds ${BILLING.proCreditsPerMonth}/month) at /pricing.`
        : `App Packs need credits — $${BILLING.packSingleUsd} for 1 or $${BILLING.packBundleUsd} for 5 (never expire). Attach ≥${BILLING.minAppPackImages} product UI screenshots. See /pricing.`,
    }
  }

  return { ok: true, entitlement: entitlement! }
}

export async function consumeAppPackCredit(entitlement: Entitlement): Promise<Entitlement> {
  if (!entitlement.customerId || entitlement.source === 'bypass') return entitlement
  const next: Entitlement = {
    ...entitlement,
    appPackCredits: Math.max(0, creditBalance(entitlement) - 1),
  }
  await saveEntitlement(next)
  return next
}

export function setEntitlementCookie(
  response: NextResponse,
  entitlement: Entitlement
): void {
  if (!entitlement.customerId) return
  const plan: 'pro' | 'credits' = isProEntitlement(entitlement) ? 'pro' : 'credits'
  const exp =
    entitlement.periodEnd && entitlement.periodEnd > Date.now()
      ? entitlement.periodEnd
      : Date.now() + YEAR_MS
  const token = signSession({
    customerId: entitlement.customerId,
    email: entitlement.email,
    plan,
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
  const credits = creditBalance(entitlement)
  return {
    isPro: pro,
    plan: (pro ? 'pro' : credits > 0 ? 'credits' : 'free') as PlanId,
    status: entitlement?.status ?? null,
    email: entitlement?.email ?? null,
    appPackCredits: credits,
    appPacksRemaining: credits,
    appPacksPerMonth: BILLING.proCreditsPerMonth,
    minAppPackImages: BILLING.minAppPackImages,
    maxAppPackImages: BILLING.maxAppPackImages,
    periodEnd: entitlement?.periodEnd ?? null,
    source: entitlement?.source ?? null,
    hasMcpKey: Boolean(entitlement?.mcpKeyFingerprint),
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
