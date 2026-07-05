import { NextRequest, NextResponse } from 'next/server'
import {
  getUserFromSessionToken,
  SESSION_COOKIE,
} from '@/lib/auth/session'

export async function updateSession(request: NextRequest) {
  const sessionToken = request.cookies.get(SESSION_COOKIE)?.value
  const user = await getUserFromSessionToken(sessionToken)

  if (request.nextUrl.pathname.startsWith('/dashboard') && !user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (
    (request.nextUrl.pathname === '/login' || request.nextUrl.pathname === '/signup') &&
    user
  ) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return NextResponse.next()
}

export async function authenticateApiKey(request: NextRequest): Promise<string | null> {
  const authHeader = request.headers.get('Authorization')

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null
  }

  const apiKey = authHeader.substring(7)
  if (!apiKey.startsWith('ctx_')) {
    return null
  }

  const { getDb } = await import('@/lib/db')
  const { apiKeys } = await import('@/lib/db/schema')
  const { eq } = await import('drizzle-orm')
  const { createHash } = await import('crypto')

  const keyHash = createHash('sha256').update(apiKey).digest('hex')
  const db = await getDb()

  const [key] = await db
    .select()
    .from(apiKeys)
    .where(eq(apiKeys.keyHash, keyHash))
    .limit(1)

  if (!key?.isActive) {
    return null
  }

  await db
    .update(apiKeys)
    .set({ lastUsed: new Date() })
    .where(eq(apiKeys.id, key.id))

  return key.userId
}

export function createRateLimiter(windowMs: number, maxRequests: number) {
  const requests = new Map<string, number[]>()

  return (identifier: string): boolean => {
    const now = Date.now()
    const windowStart = now - windowMs
    const userRequests = requests.get(identifier) || []
    const validRequests = userRequests.filter((timestamp) => timestamp > windowStart)

    if (validRequests.length >= maxRequests) {
      return false
    }

    validRequests.push(now)
    requests.set(identifier, validRequests)
    return true
  }
}
