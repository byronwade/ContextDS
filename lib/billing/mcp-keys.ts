/**
 * Personal MCP API keys for Pro subscribers.
 * Keys are hashed at rest; plaintext is shown once at creation.
 */

import { createHash, randomBytes } from 'node:crypto'
import type { Entitlement } from '@/lib/billing/config'
import { getEntitlementByCustomerId, saveEntitlement } from '@/lib/billing/entitlements'

function redis() {
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN
  if (!url || !token) return null
  return { url: url.replace(/\/$/, ''), token }
}

const MEMORY_KEYS = new Map<string, string>() // fingerprint → customerId

function fingerprint(key: string): string {
  return createHash('sha256').update(key).digest('hex').slice(0, 32)
}

function keyRedisPath(fp: string): string {
  return `mcpkey:${fp}`
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

async function redisSet(key: string, value: string, ttlSeconds: number): Promise<void> {
  const client = redis()
  if (!client) return
  await fetch(
    `${client.url}/set/${encodeURIComponent(key)}/${encodeURIComponent(value)}/EX/${ttlSeconds}`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${client.token}` },
    }
  ).catch(() => undefined)
}

async function redisDel(key: string): Promise<void> {
  const client = redis()
  if (!client) return
  await fetch(`${client.url}/del/${encodeURIComponent(key)}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${client.token}` },
  }).catch(() => undefined)
}

export function generateMcpApiKey(): string {
  return `dc_live_${randomBytes(24).toString('base64url')}`
}

export async function issueMcpKeyForCustomer(
  entitlement: Entitlement
): Promise<{ apiKey: string; fingerprint: string }> {
  if (!entitlement.customerId) {
    throw new Error('Customer id required to issue MCP key')
  }

  // Revoke previous fingerprint if present
  if (entitlement.mcpKeyFingerprint) {
    MEMORY_KEYS.delete(entitlement.mcpKeyFingerprint)
    await redisDel(keyRedisPath(entitlement.mcpKeyFingerprint))
  }

  const apiKey = generateMcpApiKey()
  const fp = fingerprint(apiKey)
  MEMORY_KEYS.set(fp, entitlement.customerId)
  // ~2 years; rotate via regenerate
  await redisSet(keyRedisPath(fp), entitlement.customerId, 60 * 60 * 24 * 800)

  const next: Entitlement = {
    ...entitlement,
    mcpKeyFingerprint: fp,
  }
  await saveEntitlement(next)

  return { apiKey, fingerprint: fp }
}

export async function resolveMcpKey(
  bearer: string | null | undefined
): Promise<{ customerId: string } | null> {
  if (!bearer) return null
  const key = bearer.trim()
  if (!key.startsWith('dc_live_')) return null
  const fp = fingerprint(key)
  const mem = MEMORY_KEYS.get(fp)
  if (mem) return { customerId: mem }
  const customerId = await redisGet(keyRedisPath(fp))
  if (!customerId) return null
  MEMORY_KEYS.set(fp, customerId)
  return { customerId }
}

export async function customerHasValidProForMcp(customerId: string): Promise<boolean> {
  const entitlement = await getEntitlementByCustomerId(customerId)
  if (!entitlement) return false
  const { isProEntitlement } = await import('@/lib/billing/config')
  return isProEntitlement(entitlement)
}
