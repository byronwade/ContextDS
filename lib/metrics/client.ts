import { Pool } from '@neondatabase/serverless'

const metricsPool = new Pool({
  connectionString: process.env.METRICS_DATABASE_URL
})

export interface PageViewEvent {
  path: string
  userAgent?: string
  referer?: string
  country?: string
  city?: string
  ipHash?: string
  sessionId?: string
  durationMs?: number
}

export interface ApiRequestEvent {
  endpoint: string
  method: string
  statusCode: number
  responseTimeMs: number
  userId?: string
  apiKeyId?: string
  errorMessage?: string
  requestSize?: number
  responseSize?: number
}

export interface ScanEvent {
  domain: string
  status: 'queued' | 'scanning' | 'completed' | 'failed'
  tokensExtracted?: number
  confidence?: number
  processingTimeMs?: number
  errorMessage?: string
  userId?: string
}

export interface SearchQueryEvent {
  query: string
  resultsCount: number
  responseTimeMs: number
  filters?: Record<string, unknown>
  userId?: string
}

export interface SystemMetricEvent {
  metricType: string
  metricName: string
  metricValue: number
  tags?: Record<string, unknown>
}

export class MetricsClient {
  async trackPageView(event: PageViewEvent): Promise<void> {
    try {
      await metricsPool.query(
        `INSERT INTO page_views (path, user_agent, referer, country, city, ip_hash, session_id, duration_ms)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          event.path,
          event.userAgent,
          event.referer,
          event.country,
          event.city,
          event.ipHash,
          event.sessionId,
          event.durationMs
        ]
      )
    } catch (error) {
      console.error('Failed to track page view:', error)
    }
  }

  async trackApiRequest(event: ApiRequestEvent): Promise<void> {
    try {
      await metricsPool.query(
        `INSERT INTO api_requests (endpoint, method, status_code, response_time_ms, user_id, api_key_id, error_message, request_size, response_size)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          event.endpoint,
          event.method,
          event.statusCode,
          event.responseTimeMs,
          event.userId,
          event.apiKeyId,
          event.errorMessage,
          event.requestSize,
          event.responseSize
        ]
      )
    } catch (error) {
      console.error('Failed to track API request:', error)
    }
  }

  async trackScanEvent(event: ScanEvent): Promise<void> {
    try {
      await metricsPool.query(
        `INSERT INTO scan_events (domain, status, tokens_extracted, confidence, processing_time_ms, error_message, user_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          event.domain,
          event.status,
          event.tokensExtracted,
          event.confidence,
          event.processingTimeMs,
          event.errorMessage,
          event.userId
        ]
      )
    } catch (error) {
      console.error('Failed to track scan event:', error)
    }
  }

  async trackSearchQuery(event: SearchQueryEvent): Promise<void> {
    try {
      await metricsPool.query(
        `INSERT INTO search_queries (query, results_count, response_time_ms, filters, user_id)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          event.query,
          event.resultsCount,
          event.responseTimeMs,
          event.filters ? JSON.stringify(event.filters) : null,
          event.userId
        ]
      )
    } catch (error) {
      console.error('Failed to track search query:', error)
    }
  }

  async trackSystemMetric(event: SystemMetricEvent): Promise<void> {
    try {
      await metricsPool.query(
        `INSERT INTO system_metrics (metric_type, metric_name, metric_value, tags)
         VALUES ($1, $2, $3, $4)`,
        [
          event.metricType,
          event.metricName,
          event.metricValue,
          event.tags ? JSON.stringify(event.tags) : null
        ]
      )
    } catch (error) {
      console.error('Failed to track system metric:', error)
    }
  }

  async getRealtimeStats(minutesAgo: number = 5) {
    try {
      const result = await metricsPool.query(
        `SELECT
          (SELECT COUNT(*) FROM page_views WHERE created_at > NOW() - INTERVAL '${minutesAgo} minutes') as page_views,
          (SELECT COUNT(*) FROM api_requests WHERE created_at > NOW() - INTERVAL '${minutesAgo} minutes') as api_requests,
          (SELECT COUNT(*) FROM scan_events WHERE created_at > NOW() - INTERVAL '${minutesAgo} minutes') as scans,
          (SELECT COUNT(*) FROM search_queries WHERE created_at > NOW() - INTERVAL '${minutesAgo} minutes') as searches,
          (SELECT AVG(response_time_ms)::integer FROM api_requests WHERE created_at > NOW() - INTERVAL '${minutesAgo} minutes') as avg_response_time,
          (SELECT COUNT(*) FROM scan_events WHERE status = 'completed' AND created_at > NOW() - INTERVAL '${minutesAgo} minutes') as successful_scans,
          (SELECT COUNT(*) FROM scan_events WHERE status = 'failed' AND created_at > NOW() - INTERVAL '${minutesAgo} minutes') as failed_scans`
      )
      return result.rows[0]
    } catch (error) {
      console.error('Failed to get realtime stats:', error)
      return null
    }
  }

  async getTimeSeriesData(metricType: string, hours: number = 24) {
    try {
      const query = this.buildTimeSeriesQuery(metricType, hours)
      const result = await metricsPool.query(query)
      return result.rows
    } catch (error) {
      console.error('Failed to get time series data:', error)
      return []
    }
  }

  private buildTimeSeriesQuery(metricType: string, hours: number): string {
    const interval = hours <= 1 ? '1 minute' : hours <= 12 ? '5 minutes' : '1 hour'

    switch (metricType) {
      case 'page_views':
        return `
          SELECT
            time_bucket('${interval}', created_at) as time,
            COUNT(*) as value
          FROM page_views
          WHERE created_at > NOW() - INTERVAL '${hours} hours'
          GROUP BY time
          ORDER BY time ASC
        `
      case 'api_requests':
        return `
          SELECT
            time_bucket('${interval}', created_at) as time,
            COUNT(*) as value,
            AVG(response_time_ms)::integer as avg_response_time
          FROM api_requests
          WHERE created_at > NOW() - INTERVAL '${hours} hours'
          GROUP BY time
          ORDER BY time ASC
        `
      case 'scans':
        return `
          SELECT
            time_bucket('${interval}', created_at) as time,
            COUNT(*) as value,
            COUNT(*) FILTER (WHERE status = 'completed') as successful,
            COUNT(*) FILTER (WHERE status = 'failed') as failed
          FROM scan_events
          WHERE created_at > NOW() - INTERVAL '${hours} hours'
          GROUP BY time
          ORDER BY time ASC
        `
      default:
        return `SELECT NOW() as time, 0 as value`
    }
  }

  async getTopEndpoints(limit: number = 10) {
    try {
      const result = await metricsPool.query(
        `SELECT
          endpoint,
          COUNT(*) as request_count,
          AVG(response_time_ms)::integer as avg_response_time,
          COUNT(*) FILTER (WHERE status_code >= 400) as error_count
        FROM api_requests
        WHERE created_at > NOW() - INTERVAL '24 hours'
        GROUP BY endpoint
        ORDER BY request_count DESC
        LIMIT $1`,
        [limit]
      )
      return result.rows
    } catch (error) {
      console.error('Failed to get top endpoints:', error)
      return []
    }
  }

  async getTopSearchQueries(limit: number = 10) {
    try {
      const result = await metricsPool.query(
        `SELECT
          query,
          COUNT(*) as search_count,
          AVG(results_count)::integer as avg_results,
          AVG(response_time_ms)::integer as avg_response_time
        FROM search_queries
        WHERE created_at > NOW() - INTERVAL '24 hours'
        GROUP BY query
        ORDER BY search_count DESC
        LIMIT $1`,
        [limit]
      )
      return result.rows
    } catch (error) {
      console.error('Failed to get top search queries:', error)
      return []
    }
  }

  async getRecentScans(limit: number = 20) {
    try {
      const result = await metricsPool.query(
        `SELECT
          domain,
          status,
          tokens_extracted,
          confidence,
          processing_time_ms,
          created_at
        FROM scan_events
        ORDER BY created_at DESC
        LIMIT $1`,
        [limit]
      )
      return result.rows
    } catch (error) {
      console.error('Failed to get recent scans:', error)
      return []
    }
  }
}

export const metricsClient = new MetricsClient()