import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          request.cookies.set({
            name,
            value,
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name: string, options: any) {
          request.cookies.set({
            name,
            value: '',
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value: '',
            ...options,
          })
        },
      },
    }
  )

  // Get user session
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Protect dashboard routes
  if (request.nextUrl.pathname.startsWith('/dashboard') && !user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Redirect authenticated users away from auth pages
  if ((request.nextUrl.pathname === '/login' || request.nextUrl.pathname === '/signup') && user) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return response
}

// API key authentication for MCP endpoints
export async function authenticateApiKey(request: NextRequest): Promise<string | null> {
  const authHeader = request.headers.get('Authorization')

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null
  }

  const apiKey = authHeader.substring(7)

  // Validate API key format
  if (!apiKey.startsWith('ctx_') || apiKey.length < 32) {
    return null
  }

  try {
    // Import here to avoid circular dependencies
    const { db } = await import('@/lib/db')
    const { apiKeys } = await import('@/lib/db/schema')
    const { eq, and, gt } = await import('drizzle-orm')

    // Query database for API key
    const [keyRecord] = await db
      .select({
        id: apiKeys.id,
        userId: apiKeys.userId,
        isActive: apiKeys.isActive,
        expiresAt: apiKeys.expiresAt,
      })
      .from(apiKeys)
      .where(
        and(
          eq(apiKeys.key, apiKey),
          eq(apiKeys.isActive, true),
          gt(apiKeys.expiresAt, new Date())
        )
      )
      .limit(1)

    if (!keyRecord) {
      console.warn('[Auth] Invalid or expired API key attempt')
      return null
    }

    // Update last used timestamp asynchronously (don't block)
    db.update(apiKeys)
      .set({ lastUsedAt: new Date() })
      .where(eq(apiKeys.id, keyRecord.id))
      .catch((error) => {
        console.error('[Auth] Failed to update API key lastUsedAt:', error)
      })

    return keyRecord.userId
  } catch (error) {
    console.error('[Auth] API key validation error:', error)
    return null
  }
}

// Rate limiting helper
export function createRateLimiter(windowMs: number, maxRequests: number) {
  const requests = new Map<string, number[]>()

  return (identifier: string): boolean => {
    const now = Date.now()
    const windowStart = now - windowMs

    // Get existing requests for this identifier
    const userRequests = requests.get(identifier) || []

    // Filter out requests outside the window
    const validRequests = userRequests.filter(timestamp => timestamp > windowStart)

    // Check if we're at the limit
    if (validRequests.length >= maxRequests) {
      return false
    }

    // Add this request
    validRequests.push(now)
    requests.set(identifier, validRequests)

    return true
  }
}