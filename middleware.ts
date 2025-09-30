import { NextRequest, NextResponse } from 'next/server'
import { ratelimit } from '@/lib/ratelimit'

// Pre-compute static security headers (performance optimization)
const SECURITY_HEADERS = {
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-XSS-Protection': '1; mode=block',
  'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https:;"
} as const

export async function middleware(request: NextRequest) {
  const response = NextResponse.next()

  // Apply pre-computed security headers (faster than individual sets)
  Object.entries(SECURITY_HEADERS).forEach(([key, value]) => {
    response.headers.set(key, value)
  })

  // Rate limiting for API routes
  if (request.nextUrl.pathname.startsWith('/api/')) {
    try {
      const identifier = request.ip ?? '127.0.0.1'
      const { success, limit, reset, remaining } = await ratelimit.limit(identifier)

      response.headers.set('X-RateLimit-Limit', limit.toString())
      response.headers.set('X-RateLimit-Remaining', remaining.toString())
      response.headers.set('X-RateLimit-Reset', new Date(reset).toISOString())

      if (!success) {
        return new NextResponse('Too Many Requests', {
          status: 429,
          headers: response.headers,
        })
      }
    } catch (error) {
      console.error('Rate limiting error:', error)
    }
  }

  // API key validation for MCP endpoints
  if (request.nextUrl.pathname.startsWith('/api/mcp/')) {
    const apiKey = request.headers.get('Authorization')?.replace('Bearer ', '')

    if (!apiKey) {
      return new NextResponse('API key required', { status: 401 })
    }

    // Validate API key format (basic validation)
    if (!apiKey.startsWith('ctx_') || apiKey.length < 32) {
      return new NextResponse('Invalid API key', { status: 401 })
    }
  }

  // Request size limits
  const contentLength = request.headers.get('content-length')
  if (contentLength && parseInt(contentLength) > 10 * 1024 * 1024) { // 10MB limit
    return new NextResponse('Request too large', { status: 413 })
  }

  // Metrics tracking moved to client-side (non-blocking)
  // See: components/atoms/web-vitals-reporter.tsx

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}