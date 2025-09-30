# Real-time Metrics System Setup

## Overview
A grep.app-inspired real-time metrics dashboard that tracks all user activity and system performance across the ContextDS platform.

## What's Been Created

### 1. Neon Database (Metrics Storage)
- **Project ID**: `spring-mountain-09849889`
- **Database**: `neondb`
- **Connection String**: Added to `.env.example`

### 2. Database Schema
Five tables created for comprehensive tracking:
- `page_views` - User navigation and page performance
- `api_requests` - API endpoint usage and performance
- `scan_events` - Design token scan activity
- `search_queries` - Search behavior and results
- `system_metrics` - Custom system-level metrics

All tables indexed for fast real-time queries.

### 3. Metrics Client (`lib/metrics/client.ts`)
TypeScript client with methods for:
- `trackPageView()` - Page navigation tracking
- `trackApiRequest()` - API performance tracking
- `trackScanEvent()` - Scan lifecycle tracking
- `trackSearchQuery()` - Search analytics
- `trackSystemMetric()` - Custom metrics
- `getRealtimeStats()` - Live dashboard data
- `getTimeSeriesData()` - Historical charts
- `getTopEndpoints()` - Most-used APIs
- `getTopSearchQueries()` - Popular searches
- `getRecentScans()` - Latest scan activity

### 4. API Endpoints

#### `/api/metrics` (GET)
Query parameters:
- `type=summary` - Real-time stats (last 5 minutes)
- `type=timeseries&metric=page_views&hours=24` - Historical data
- `type=endpoints` - Top 10 API endpoints
- `type=searches` - Top 10 search queries
- `type=scans` - Recent 20 scans

#### `/api/metrics/stream` (GET)
Server-Sent Events stream for live updates every 2 seconds.

#### `/api/metrics/track` (POST)
Internal endpoint for middleware to send metrics data.

### 5. Metrics Dashboard (`/metrics`)
Grep.app-style UI featuring:
- **Live Stats Cards**: Page views, API requests, scans, searches (updates every 5s)
- **Interactive Timeline Chart**: Switchable between metrics (page_views, api_requests, scans)
- **Time Range Selector**: 1h, 12h, 24h views
- **Top Endpoints**: Most-called APIs with error counts
- **Top Searches**: Popular queries with avg results
- **Recent Scans**: Live scan activity feed with status indicators
- **Real-time Badge**: Animated pulse indicator

### 6. Middleware Integration
Automatic tracking in `middleware.ts`:
- Captures all page views (except static assets)
- Tracks request duration
- Extracts user agent, referer
- Non-blocking fire-and-forget approach

### 7. Header Navigation
Added "Metrics" link to main header with TrendingUp icon.

## Environment Setup

Add to your `.env.local`:

```bash
METRICS_DATABASE_URL="postgresql://neondb_owner:npg_uIw95rVjPlMs@ep-delicate-dream-afs86j9h-pooler.c-2.us-west-2.aws.neon.tech/neondb?channel_binding=require&sslmode=require"
```

## Usage

### Access the Dashboard
Navigate to `/metrics` to view real-time analytics.

### Manual Event Tracking
```typescript
import { metricsClient } from '@/lib/metrics/client'

// Track custom scan event
await metricsClient.trackScanEvent({
  domain: 'example.com',
  status: 'completed',
  tokensExtracted: 150,
  confidence: 95,
  processingTimeMs: 2500
})

// Track API request
await metricsClient.trackApiRequest({
  endpoint: '/api/scan',
  method: 'POST',
  statusCode: 200,
  responseTimeMs: 450
})
```

### Query Metrics
```typescript
// Get live stats
const stats = await metricsClient.getRealtimeStats(5) // last 5 minutes

// Get historical data
const timeSeries = await metricsClient.getTimeSeriesData('page_views', 24) // last 24 hours

// Get top endpoints
const endpoints = await metricsClient.getTopEndpoints(10)
```

## Architecture Highlights

### Real-time Updates
- Dashboard auto-refreshes every 5-10 seconds
- Middleware tracks every request asynchronously
- Edge runtime for fast API responses

### Performance
- Indexed queries for sub-100ms response times
- Time-bucketed aggregations for efficient charting
- Background tracking doesn't impact user experience

### Data Quality
- IP hashing for privacy
- Session tracking for user journeys
- Error tracking for debugging
- Response time tracking for performance monitoring

## Design Philosophy
Inspired by grep.app's minimalist aesthetic:
- Monospace fonts
- Terminal-style borders and colors
- Clean grep color variables (grep-0 through grep-12)
- No unnecessary visual noise
- Focus on data density and clarity

## Future Enhancements
- Geographic heat maps
- User session replays
- Anomaly detection alerts
- Custom metric dashboards
- Export to CSV/JSON
- Webhook integrations
- Retention/cohort analysis