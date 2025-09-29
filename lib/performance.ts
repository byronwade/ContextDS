// Performance monitoring and metrics collection
import { NextRequest } from 'next/server'

export interface PerformanceMetrics {
  timestamp: number
  route: string
  method: string
  duration: number
  statusCode: number
  userAgent?: string
  ip?: string
}

// Simple in-memory metrics store (in production, use Redis or external service)
const metricsStore: PerformanceMetrics[] = []
const MAX_METRICS = 1000 // Keep last 1000 requests

export function recordMetrics(metrics: PerformanceMetrics) {
  metricsStore.push(metrics)

  // Keep only recent metrics
  if (metricsStore.length > MAX_METRICS) {
    metricsStore.splice(0, metricsStore.length - MAX_METRICS)
  }
}

export function getPerformanceStats() {
  const now = Date.now()
  const oneHourAgo = now - 60 * 60 * 1000
  const recentMetrics = metricsStore.filter(m => m.timestamp > oneHourAgo)

  if (recentMetrics.length === 0) {
    return {
      totalRequests: 0,
      averageResponseTime: 0,
      errorRate: 0,
      p95ResponseTime: 0
    }
  }

  const durations = recentMetrics.map(m => m.duration).sort((a, b) => a - b)
  const errors = recentMetrics.filter(m => m.statusCode >= 400)

  return {
    totalRequests: recentMetrics.length,
    averageResponseTime: Math.round(durations.reduce((a, b) => a + b, 0) / durations.length),
    errorRate: Math.round((errors.length / recentMetrics.length) * 100),
    p95ResponseTime: Math.round(durations[Math.floor(durations.length * 0.95)] || 0)
  }
}

// Performance monitoring wrapper for API routes
export function withPerformanceMonitoring<T>(
  handler: (req: NextRequest) => Promise<T>,
  route: string
) {
  return async (req: NextRequest): Promise<T> => {
    const start = Date.now()
    let statusCode = 200

    try {
      const result = await handler(req)
      return result
    } catch (error) {
      statusCode = 500
      throw error
    } finally {
      const duration = Date.now() - start

      recordMetrics({
        timestamp: start,
        route,
        method: req.method,
        duration,
        statusCode,
        userAgent: req.headers.get('user-agent') || undefined,
        ip: req.ip
      })

      // Log slow requests
      if (duration > 1000) {
        console.warn(`🐌 Slow request: ${req.method} ${route} took ${duration}ms`)
      }
    }
  }
}

// Cache implementation for frequently accessed data
class SimpleCache<T> {
  private cache = new Map<string, { value: T; expires: number }>()

  set(key: string, value: T, ttlMs: number = 5 * 60 * 1000) {
    const expires = Date.now() + ttlMs
    this.cache.set(key, { value, expires })
  }

  get(key: string): T | null {
    const item = this.cache.get(key)
    if (!item) return null

    if (Date.now() > item.expires) {
      this.cache.delete(key)
      return null
    }

    return item.value
  }

  clear() {
    this.cache.clear()
  }

  size() {
    return this.cache.size
  }
}

// Global cache instances
export const statsCache = new SimpleCache<Record<string, unknown>>()
export const searchCache = new SimpleCache<Record<string, unknown>>()

// Cache keys
export const CACHE_KEYS = {
  STATS: 'database:stats',
  POPULAR_SITES: 'sites:popular',
  RECENT_ACTIVITY: 'activity:recent'
} as const