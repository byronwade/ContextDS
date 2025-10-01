/**
 * Compliance Middleware
 * Integrates all compliance monitoring into Next.js middleware
 */

import { NextRequest, NextResponse } from 'next/server'
import { complianceController } from './compliance-controller'

export interface ComplianceMiddlewareConfig {
  enabledPaths: string[]
  excludedPaths: string[]
  monitoringLevel: 'basic' | 'standard' | 'comprehensive'
  logDataAccess: boolean
  enforceApiSecurity: boolean
  enableGdprMonitoring: boolean
}

/**
 * Compliance middleware for monitoring all requests
 */
export async function complianceMiddleware(
  request: NextRequest,
  config: Partial<ComplianceMiddlewareConfig> = {}
): Promise<NextResponse> {
  const defaultConfig: ComplianceMiddlewareConfig = {
    enabledPaths: ['/api/', '/dashboard/'],
    excludedPaths: ['/api/health', '/_next/', '/favicon.ico'],
    monitoringLevel: 'standard',
    logDataAccess: true,
    enforceApiSecurity: true,
    enableGdprMonitoring: true
  }

  const mergedConfig = { ...defaultConfig, ...config }
  const pathname = request.nextUrl.pathname

  // Check if path should be monitored
  if (shouldMonitorPath(pathname, mergedConfig)) {
    const startTime = Date.now()

    try {
      // Extract context from request
      const context = await extractRequestContext(request)

      // Process request through compliance controller
      await complianceController.processRequest(request, context)

      // Continue with the request
      const response = NextResponse.next()

      // Add compliance headers
      addComplianceHeaders(response, mergedConfig)

      // Log response metrics
      const responseTime = Date.now() - startTime
      await logResponseMetrics(request, response, responseTime, context)

      return response

    } catch (error) {
      console.error('Compliance middleware error:', error)

      // Log the error but don't block the request
      await logComplianceError(request, error)

      return NextResponse.next()
    }
  }

  return NextResponse.next()
}

/**
 * Determine if path should be monitored
 */
function shouldMonitorPath(
  pathname: string,
  config: ComplianceMiddlewareConfig
): boolean {
  // Check excluded paths first
  for (const excludedPath of config.excludedPaths) {
    if (pathname.startsWith(excludedPath)) {
      return false
    }
  }

  // Check enabled paths
  for (const enabledPath of config.enabledPaths) {
    if (pathname.startsWith(enabledPath)) {
      return true
    }
  }

  return false
}

/**
 * Extract request context for compliance monitoring
 */
async function extractRequestContext(request: NextRequest): Promise<any> {
  const context: any = {
    method: request.method,
    pathname: request.nextUrl.pathname,
    searchParams: Object.fromEntries(request.nextUrl.searchParams),
    headers: Object.fromEntries(request.headers.entries()),
    timestamp: new Date().toISOString()
  }

  // Extract user context from auth header or session
  const authHeader = request.headers.get('authorization')
  if (authHeader && authHeader.startsWith('Bearer ')) {
    context.hasApiKey = true
    context.apiKeyPrefix = authHeader.substring(7, 15) // First 8 chars for logging
  }

  // Extract API endpoint information
  if (request.nextUrl.pathname.startsWith('/api/')) {
    context.endpoint = request.nextUrl.pathname
    context.isApiRequest = true

    // Determine data access type based on endpoint
    if (request.nextUrl.pathname.includes('/users/') ||
        request.nextUrl.pathname.includes('/profile')) {
      context.dataAccess = {
        operation: request.method === 'GET' ? 'read' :
                  request.method === 'DELETE' ? 'delete' : 'write',
        resourceType: 'user_data',
        gdprApplicable: true
      }
    }

    if (request.nextUrl.pathname.includes('/scans/') ||
        request.nextUrl.pathname.includes('/tokens/')) {
      context.dataAccess = {
        operation: request.method === 'GET' ? 'read' :
                  request.method === 'DELETE' ? 'delete' : 'write',
        resourceType: 'scan_data',
        gdprApplicable: false
      }
    }
  }

  // Extract potential PII indicators
  if (['POST', 'PUT', 'PATCH'].includes(request.method)) {
    try {
      const contentType = request.headers.get('content-type')
      if (contentType?.includes('application/json')) {
        const body = await request.clone().text()
        if (body) {
          // Check for email patterns
          if (/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/.test(body)) {
            context.containsPII = true
            context.piiTypes = ['email']
          }

          // Check for other PII patterns
          if (/\b\d{3}-\d{2}-\d{4}\b/.test(body)) { // SSN pattern
            context.containsPII = true
            context.piiTypes = [...(context.piiTypes || []), 'ssn']
          }
        }
      }
    } catch (error) {
      // Body reading failed, continue without PII detection
    }
  }

  return context
}

/**
 * Add compliance-related headers to response
 */
function addComplianceHeaders(
  response: NextResponse,
  config: ComplianceMiddlewareConfig
): void {
  // Security headers
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-XSS-Protection', '1; mode=block')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')

  // GDPR compliance headers
  if (config.enableGdprMonitoring) {
    response.headers.set('X-Privacy-Policy', '/privacy')
    response.headers.set('X-Data-Rights', '/privacy#data-rights')
  }

  // API security headers
  if (config.enforceApiSecurity) {
    response.headers.set('X-API-Rate-Limit', 'enforced')
    response.headers.set('X-Security-Scan', 'enabled')
  }

  // Compliance monitoring indicator
  response.headers.set('X-Compliance-Monitor', 'active')
  response.headers.set('X-Audit-Level', config.monitoringLevel)
}

/**
 * Log response metrics for compliance reporting
 */
async function logResponseMetrics(
  request: NextRequest,
  response: NextResponse,
  responseTime: number,
  context: any
): Promise<void> {
  const metrics = {
    method: request.method,
    pathname: request.nextUrl.pathname,
    statusCode: response.status,
    responseTime,
    timestamp: new Date().toISOString(),
    containsPII: context.containsPII || false,
    gdprApplicable: context.dataAccess?.gdprApplicable || false,
    hasAuth: context.hasApiKey || false
  }

  // In production, send to metrics collection system
  if (process.env.NODE_ENV === 'development') {
    console.log('📊 Compliance metrics:', metrics)
  }
}

/**
 * Log compliance errors
 */
async function logComplianceError(
  request: NextRequest,
  error: any
): Promise<void> {
  const errorLog = {
    timestamp: new Date().toISOString(),
    path: request.nextUrl.pathname,
    method: request.method,
    error: error.message,
    stack: error.stack
  }

  console.error('🚨 Compliance monitoring error:', errorLog)
}

/**
 * GDPR consent checking middleware
 */
export function gdprConsentMiddleware(request: NextRequest): NextResponse {
  const response = NextResponse.next()

  // Check for consent cookie
  const consent = request.cookies.get('gdpr-consent')

  if (!consent && requiresConsent(request.nextUrl.pathname)) {
    // Add consent banner indicator
    response.headers.set('X-Consent-Required', 'true')
  }

  return response
}

/**
 * Check if path requires GDPR consent
 */
function requiresConsent(pathname: string): boolean {
  const consentRequiredPaths = [
    '/dashboard',
    '/api/user',
    '/api/analytics'
  ]

  return consentRequiredPaths.some(path => pathname.startsWith(path))
}

/**
 * API security enforcement middleware
 */
export async function apiSecurityMiddleware(request: NextRequest): Promise<NextResponse> {
  if (!request.nextUrl.pathname.startsWith('/api/')) {
    return NextResponse.next()
  }

  // Rate limiting headers
  const response = NextResponse.next()

  // Add rate limiting information
  response.headers.set('X-RateLimit-Limit', '60')
  response.headers.set('X-RateLimit-Window', '60s')

  // Security headers for API endpoints
  response.headers.set('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGINS || '*')
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  return response
}

/**
 * Data classification middleware
 */
export function dataClassificationMiddleware(request: NextRequest): NextResponse {
  const response = NextResponse.next()

  // Classify data based on endpoint
  let dataClassification = 'public'

  if (request.nextUrl.pathname.includes('/user') ||
      request.nextUrl.pathname.includes('/profile')) {
    dataClassification = 'confidential'
  } else if (request.nextUrl.pathname.includes('/admin')) {
    dataClassification = 'restricted'
  } else if (request.nextUrl.pathname.includes('/api/')) {
    dataClassification = 'internal'
  }

  response.headers.set('X-Data-Classification', dataClassification)

  return response
}

/**
 * Audit logging middleware
 */
export async function auditLoggingMiddleware(
  request: NextRequest,
  response: NextResponse,
  context: any
): Promise<void> {
  // Log significant events for audit trail
  const auditableEvents = [
    'user authentication',
    'data access',
    'configuration changes',
    'privilege escalation',
    'data export',
    'privacy requests'
  ]

  const pathname = request.nextUrl.pathname
  let shouldAudit = false
  let eventType = 'unknown'

  // Determine if request should be audited
  if (pathname.includes('/auth/') || pathname.includes('/login')) {
    shouldAudit = true
    eventType = 'authentication'
  } else if (pathname.includes('/admin/')) {
    shouldAudit = true
    eventType = 'admin_access'
  } else if (context.dataAccess) {
    shouldAudit = true
    eventType = 'data_access'
  } else if (pathname.includes('/privacy/')) {
    shouldAudit = true
    eventType = 'privacy_request'
  }

  if (shouldAudit) {
    const auditEntry = {
      timestamp: new Date().toISOString(),
      eventType,
      method: request.method,
      pathname,
      statusCode: response.status,
      userAgent: request.headers.get('user-agent'),
      ipAddress: request.headers.get('x-forwarded-for') ||
                request.headers.get('x-real-ip') ||
                'unknown',
      context
    }

    // In production, send to audit logging system
    console.log('📋 Audit log entry:', auditEntry)
  }
}

export default complianceMiddleware