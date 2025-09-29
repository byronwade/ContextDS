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

  // TODO: Implement API key validation against database
  // For now, return a dummy user ID
  return 'api-user-id'
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