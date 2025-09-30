import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { promises as dns } from 'dns'
import { runScanJob } from '@/lib/workers/scan-orchestrator'
import { scanRatelimit } from '@/lib/ratelimit'

const scanRequestSchema = z.object({
  url: z.string().url(),
  depth: z.enum(['1', '2', '3']).default('1'),
  prettify: z.boolean().default(false),
  quality: z.enum(['basic', 'standard', 'premium']).default('standard'),
  budget: z.number().min(0.01).max(1.0).default(0.15),
  mode: z.enum(['fast', 'accurate']).default('accurate')  // fast = static only, accurate = full scan
})

/**
 * Check if an IP address is in a private range
 */
function isPrivateIP(ip: string): boolean {
  const parts = ip.split('.').map(Number)
  if (parts.length !== 4 || parts.some(p => isNaN(p) || p < 0 || p > 255)) {
    return true // Invalid IP, treat as private
  }

  return (
    parts[0] === 10 ||
    parts[0] === 127 ||
    (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) ||
    (parts[0] === 192 && parts[1] === 168) ||
    parts[0] === 0 ||
    (parts[0] === 169 && parts[1] === 254) || // Link-local
    parts[0] === 255 // Broadcast
  )
}

/**
 * Check if an IPv6 address is in a private range
 */
function isPrivateIPv6(ip: string): boolean {
  const lower = ip.toLowerCase()
  return (
    lower === '::1' ||
    lower.startsWith('::1') || // Loopback
    lower.startsWith('fe80:') || // Link-local
    lower.startsWith('fc00:') || // Unique local
    lower.startsWith('fd00:') // Unique local
  )
}

/**
 * Validate URL is not targeting private/internal resources
 */
async function validateSSRF(url: URL): Promise<string | null> {
  const hostname = url.hostname
  const port = url.port || (url.protocol === 'https:' ? '443' : '80')

  // Block localhost and loopback
  if (hostname === 'localhost' || hostname === '::1' || hostname.startsWith('127.')) {
    return 'Cannot scan localhost or loopback addresses'
  }

  // Check if hostname is an IP address (not a domain name)
  // Only validate IP format if it looks like an IP address
  const isIPv4Format = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname)
  const isIPv6Format = hostname.includes(':')

  // Block private IP ranges if hostname is an IP address
  if (isIPv4Format && isPrivateIP(hostname)) {
    return 'Cannot scan private IP addresses'
  }

  if (isIPv6Format && isPrivateIPv6(hostname)) {
    return 'Cannot scan private IPv6 addresses'
  }

  // Block non-standard ports (only allow 80, 443, 8080)
  const allowedPorts = ['80', '443', '8080']
  if (!allowedPorts.includes(port)) {
    return 'Only standard HTTP/HTTPS ports (80, 443, 8080) are allowed'
  }

  // Block cloud metadata endpoints
  const blockedHosts = [
    '169.254.169.254', // AWS metadata
    'metadata.google.internal', // GCP
    'metadata.azure.com', // Azure
  ]
  if (blockedHosts.some(blocked => hostname.includes(blocked))) {
    return 'Cannot scan cloud metadata endpoints'
  }

  // Resolve DNS for both IPv4 and IPv6
  try {
    const [ipv4Result, ipv6Result] = await Promise.allSettled([
      dns.resolve4(hostname),
      dns.resolve6(hostname)
    ])

    // Check IPv4 addresses
    if (ipv4Result.status === 'fulfilled') {
      console.log('🔍 DNS resolved IPv4 for', hostname, ':', ipv4Result.value)
      for (const ip of ipv4Result.value) {
        const isPrivate = isPrivateIP(ip)
        console.log('  IPv4:', ip, '- Private?', isPrivate)
        if (isPrivate) {
          return 'Domain resolves to private IP address'
        }
      }
    }

    // Check IPv6 addresses
    if (ipv6Result.status === 'fulfilled') {
      console.log('🔍 DNS resolved IPv6 for', hostname, ':', ipv6Result.value)
      for (const ip of ipv6Result.value) {
        const isPrivate = isPrivateIPv6(ip)
        console.log('  IPv6:', ip, '- Private?', isPrivate)
        if (isPrivate) {
          return 'Domain resolves to private IPv6 address'
        }
      }
    }

    // If both DNS resolutions failed, reject
    if (ipv4Result.status === 'rejected' && ipv6Result.status === 'rejected') {
      console.warn('⚠️ Both IPv4 and IPv6 DNS resolution failed for', hostname)
      return 'DNS resolution failed - domain may be invalid'
    }
  } catch (error) {
    console.warn('⚠️ DNS resolution error for', hostname, error)
    return 'DNS resolution failed - domain may be invalid'
  }

  return null // Valid
}

export async function POST(request: NextRequest) {
  try {
    // 1. Verify Content-Type
    const contentType = request.headers.get('content-type')
    if (!contentType || !contentType.includes('application/json')) {
      return NextResponse.json(
        { status: 'failed', error: 'Content-Type must be application/json' },
        { status: 415 }
      )
    }

    // 2. Check body size
    const contentLength = request.headers.get('content-length')
    if (contentLength && parseInt(contentLength) > 10 * 1024) { // 10KB limit
      return NextResponse.json(
        { status: 'failed', error: 'Request body too large' },
        { status: 413 }
      )
    }

    // 3. Rate limiting for scan endpoint
    const identifier =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') ||
      '127.0.0.1'
    const { success } = await scanRatelimit.limit(identifier)

    if (!success) {
      return NextResponse.json(
        { status: 'failed', error: 'Rate limit exceeded. Please wait before scanning again.' },
        { status: 429 }
      )
    }

    const payload = await request.json()
    console.log('📥 Scan request payload:', JSON.stringify(payload, null, 2))
    const params = scanRequestSchema.parse(payload)
    console.log('✅ Validated params:', JSON.stringify(params, null, 2))

    // 4. URL length validation
    if (params.url.length > 2048) {
      return NextResponse.json(
        { status: 'failed', error: 'URL too long' },
        { status: 400 }
      )
    }

    // URL validation to prevent SSRF
    const url = new URL(params.url)
    const allowedProtocols = ['http:', 'https:']
    if (!allowedProtocols.includes(url.protocol)) {
      return NextResponse.json(
        { status: 'failed', error: 'Invalid URL protocol' },
        { status: 400 }
      )
    }

    // Comprehensive SSRF protection with DNS resolution
    console.log('🔍 Validating SSRF for URL:', url.href)
    const ssrfError = await validateSSRF(url)
    if (ssrfError) {
      console.error('❌ SSRF validation failed:', ssrfError)
      return NextResponse.json(
        { status: 'failed', error: ssrfError },
        { status: 400 }
      )
    }
    console.log('✅ SSRF validation passed')

    // Fast mode skips browser automation (computed CSS + coverage API)
    // Saves ~1,200ms but reduces accuracy from 95% to 90%
    const includeComputed = params.mode === 'fast'
      ? false  // Skip browser automation in fast mode
      : process.env.DISABLE_COMPUTED_CSS === '1' ? false : true

    const normalizedUrl = params.url.startsWith('http') ? params.url : `https://${params.url}`

    const result = await runScanJob({
      url: normalizedUrl,
      prettify: params.prettify,
      includeComputed,
      mode: params.mode  // Pass mode to orchestrator
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('❌ Scan error:', error)

    if (error instanceof z.ZodError) {
      console.error('❌ Zod validation error:', JSON.stringify(error.issues, null, 2))
      return NextResponse.json(
        {
          status: 'failed',
          error: 'Invalid request parameters',
          details: error.issues
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      {
        status: 'failed',
        error: error instanceof Error ? error.message : 'Scan failed'
      },
      { status: 500 }
    )
  }
}
