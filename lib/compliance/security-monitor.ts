/**
 * Security Monitoring System
 * SOC 2 Type II Control Implementation
 * GDPR/CCPA Compliance Monitoring
 */

import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { auditLog } from '@/lib/db/schema'
import { eq, and, gte, desc } from 'drizzle-orm'

export interface SecurityEvent {
  event_type: 'auth_failure' | 'data_access' | 'data_modification' | 'api_abuse' | 'privacy_request' | 'security_incident'
  severity: 'low' | 'medium' | 'high' | 'critical'
  source: string
  description: string
  metadata?: Record<string, any>
  user_id?: string
  ip_address?: string
  user_agent?: string
}

export interface SecurityAlertConfig {
  failed_auth_threshold: number
  api_rate_threshold: number
  data_access_anomaly_threshold: number
  alert_webhooks: string[]
  notification_channels: ('email' | 'slack' | 'pagerduty')[]
}

class SecurityMonitor {
  private static instance: SecurityMonitor
  private alertConfig: SecurityAlertConfig

  constructor() {
    this.alertConfig = {
      failed_auth_threshold: 5, // 5 failed attempts in 15 minutes
      api_rate_threshold: 1000, // 1000 requests in 1 hour
      data_access_anomaly_threshold: 100, // 100 data access events in 15 minutes
      alert_webhooks: process.env.SECURITY_ALERT_WEBHOOKS?.split(',') || [],
      notification_channels: ['email'] // Default to email notifications
    }
  }

  static getInstance(): SecurityMonitor {
    if (!SecurityMonitor.instance) {
      SecurityMonitor.instance = new SecurityMonitor()
    }
    return SecurityMonitor.instance
  }

  /**
   * Log security event with audit trail
   */
  async logSecurityEvent(event: SecurityEvent): Promise<void> {
    try {
      // Store in audit log
      await db.insert(auditLog).values({
        userId: event.user_id || null,
        action: event.event_type,
        resourceType: 'security_event',
        details: {
          severity: event.severity,
          source: event.source,
          description: event.description,
          metadata: event.metadata
        },
        ipAddress: event.ip_address,
        userAgent: event.user_agent,
        createdAt: new Date()
      })

      // Check for alert conditions
      await this.checkAlertConditions(event)

      // Log to external SIEM if configured
      await this.logToSIEM(event)

    } catch (error) {
      console.error('Failed to log security event:', error)
      // Fallback logging to ensure security events are captured
      console.error('SECURITY_EVENT:', JSON.stringify(event))
    }
  }

  /**
   * Monitor authentication events
   */
  async monitorAuthEvent(
    request: NextRequest,
    eventType: 'login_success' | 'login_failure' | 'logout' | 'password_reset',
    userId?: string,
    details?: Record<string, any>
  ): Promise<void> {
    const clientIP = this.getClientIP(request)
    const userAgent = request.headers.get('user-agent') || 'unknown'

    await this.logSecurityEvent({
      event_type: eventType === 'login_failure' ? 'auth_failure' : 'data_access',
      severity: eventType === 'login_failure' ? 'medium' : 'low',
      source: 'authentication',
      description: `Authentication event: ${eventType}`,
      metadata: { eventType, ...details },
      user_id: userId,
      ip_address: clientIP,
      user_agent: userAgent
    })
  }

  /**
   * Monitor data access events (GDPR compliance)
   */
  async monitorDataAccess(
    request: NextRequest,
    operation: 'read' | 'write' | 'delete',
    resourceType: string,
    resourceId?: string,
    userId?: string,
    dataSubjects?: string[]
  ): Promise<void> {
    const clientIP = this.getClientIP(request)
    const userAgent = request.headers.get('user-agent') || 'unknown'

    await this.logSecurityEvent({
      event_type: 'data_access',
      severity: operation === 'delete' ? 'medium' : 'low',
      source: 'data_access',
      description: `Data ${operation} on ${resourceType}`,
      metadata: {
        operation,
        resourceType,
        resourceId,
        dataSubjects,
        gdpr_applicable: true
      },
      user_id: userId,
      ip_address: clientIP,
      user_agent: userAgent
    })
  }

  /**
   * Monitor API usage patterns
   */
  async monitorAPIUsage(
    request: NextRequest,
    endpoint: string,
    responseTime: number,
    statusCode: number,
    userId?: string,
    apiKeyId?: string
  ): Promise<void> {
    const clientIP = this.getClientIP(request)
    const userAgent = request.headers.get('user-agent') || 'unknown'

    // Check for suspicious patterns
    const suspiciousPattern = await this.detectSuspiciousAPIPattern(clientIP, endpoint)

    if (suspiciousPattern) {
      await this.logSecurityEvent({
        event_type: 'api_abuse',
        severity: 'high',
        source: 'api_monitoring',
        description: `Suspicious API usage pattern detected`,
        metadata: {
          endpoint,
          responseTime,
          statusCode,
          pattern: suspiciousPattern,
          apiKeyId
        },
        user_id: userId,
        ip_address: clientIP,
        user_agent: userAgent
      })
    }
  }

  /**
   * Monitor privacy-related requests (GDPR/CCPA)
   */
  async monitorPrivacyRequest(
    request: NextRequest,
    requestType: 'access' | 'rectification' | 'erasure' | 'portability' | 'opt_out',
    userId: string,
    details: Record<string, any>
  ): Promise<void> {
    const clientIP = this.getClientIP(request)
    const userAgent = request.headers.get('user-agent') || 'unknown'

    await this.logSecurityEvent({
      event_type: 'privacy_request',
      severity: 'medium',
      source: 'privacy_compliance',
      description: `Privacy request: ${requestType}`,
      metadata: {
        requestType,
        regulation: 'GDPR/CCPA',
        ...details
      },
      user_id: userId,
      ip_address: clientIP,
      user_agent: userAgent
    })
  }

  /**
   * Check for alert conditions and trigger notifications
   */
  private async checkAlertConditions(event: SecurityEvent): Promise<void> {
    const now = new Date()
    const fifteenMinutesAgo = new Date(now.getTime() - 15 * 60 * 1000)

    // Check failed authentication attempts
    if (event.event_type === 'auth_failure' && event.ip_address) {
      const recentFailures = await db
        .select()
        .from(auditLog)
        .where(
          and(
            eq(auditLog.action, 'auth_failure'),
            eq(auditLog.ipAddress, event.ip_address),
            gte(auditLog.createdAt, fifteenMinutesAgo)
          )
        )

      if (recentFailures.length >= this.alertConfig.failed_auth_threshold) {
        await this.triggerAlert('HIGH', `Multiple failed authentication attempts from ${event.ip_address}`, {
          type: 'brute_force_attempt',
          ip_address: event.ip_address,
          attempts: recentFailures.length
        })
      }
    }

    // Check for data access anomalies
    if (event.event_type === 'data_access' && event.user_id) {
      const recentAccess = await db
        .select()
        .from(auditLog)
        .where(
          and(
            eq(auditLog.action, 'data_access'),
            eq(auditLog.userId, event.user_id),
            gte(auditLog.createdAt, fifteenMinutesAgo)
          )
        )

      if (recentAccess.length >= this.alertConfig.data_access_anomaly_threshold) {
        await this.triggerAlert('MEDIUM', `Unusual data access pattern detected for user ${event.user_id}`, {
          type: 'data_access_anomaly',
          user_id: event.user_id,
          access_count: recentAccess.length
        })
      }
    }
  }

  /**
   * Detect suspicious API patterns
   */
  private async detectSuspiciousAPIPattern(ip: string, endpoint: string): Promise<string | null> {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)

    // Check request rate from IP
    const recentRequests = await db
      .select()
      .from(auditLog)
      .where(
        and(
          eq(auditLog.ipAddress, ip),
          gte(auditLog.createdAt, oneHourAgo)
        )
      )

    if (recentRequests.length > this.alertConfig.api_rate_threshold) {
      return 'high_request_rate'
    }

    // Check for scanning patterns (multiple different endpoints)
    const uniqueEndpoints = new Set(
      recentRequests
        .map(r => r.details?.endpoint as string)
        .filter(Boolean)
    )

    if (uniqueEndpoints.size > 50) {
      return 'endpoint_scanning'
    }

    return null
  }

  /**
   * Trigger security alert
   */
  private async triggerAlert(severity: string, message: string, metadata: Record<string, any>): Promise<void> {
    const alert = {
      timestamp: new Date().toISOString(),
      severity,
      message,
      metadata,
      source: 'ContextDS_Security_Monitor'
    }

    // Log the alert
    console.error('SECURITY_ALERT:', JSON.stringify(alert))

    // Send to configured alert channels
    for (const webhook of this.alertConfig.alert_webhooks) {
      try {
        await fetch(webhook, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(alert)
        })
      } catch (error) {
        console.error('Failed to send alert to webhook:', webhook, error)
      }
    }

    // Store alert in audit log
    await db.insert(auditLog).values({
      userId: null,
      action: 'security_alert',
      resourceType: 'alert',
      details: alert,
      createdAt: new Date()
    })
  }

  /**
   * Log to external SIEM system
   */
  private async logToSIEM(event: SecurityEvent): Promise<void> {
    const siemEndpoint = process.env.SIEM_ENDPOINT
    if (!siemEndpoint) return

    try {
      await fetch(siemEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.SIEM_API_KEY}`
        },
        body: JSON.stringify({
          timestamp: new Date().toISOString(),
          source: 'ContextDS',
          ...event
        })
      })
    } catch (error) {
      console.error('Failed to log to SIEM:', error)
    }
  }

  /**
   * Get client IP address from request
   */
  private getClientIP(request: NextRequest): string {
    return (
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') ||
      request.headers.get('cf-connecting-ip') ||
      '127.0.0.1'
    )
  }

  /**
   * Generate security report for compliance audits
   */
  async generateSecurityReport(startDate: Date, endDate: Date): Promise<any> {
    const events = await db
      .select()
      .from(auditLog)
      .where(
        and(
          gte(auditLog.createdAt, startDate),
          gte(endDate, auditLog.createdAt)
        )
      )
      .orderBy(desc(auditLog.createdAt))

    const summary = {
      totalEvents: events.length,
      eventsByType: {} as Record<string, number>,
      eventsBySeverity: {} as Record<string, number>,
      securityIncidents: 0,
      privacyRequests: 0,
      dataBreaches: 0,
      complianceViolations: 0
    }

    events.forEach(event => {
      const action = event.action
      const severity = event.details?.severity as string

      summary.eventsByType[action] = (summary.eventsByType[action] || 0) + 1
      if (severity) {
        summary.eventsBySeverity[severity] = (summary.eventsBySeverity[severity] || 0) + 1
      }

      if (action === 'security_incident') summary.securityIncidents++
      if (action === 'privacy_request') summary.privacyRequests++
      if (action === 'data_breach') summary.dataBreaches++
    })

    return {
      reportPeriod: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString()
      },
      summary,
      events: events.slice(0, 1000), // Limit to most recent 1000 events
      complianceStatus: {
        gdprCompliant: summary.dataBreaches === 0 && summary.complianceViolations === 0,
        ccpaCompliant: summary.dataBreaches === 0 && summary.complianceViolations === 0,
        soc2Compliant: summary.securityIncidents === 0
      }
    }
  }
}

export const securityMonitor = SecurityMonitor.getInstance()