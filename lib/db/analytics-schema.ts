/**
 * Analytics Schema - TypeScript Types and Drizzle ORM Integration
 * Comprehensive analytics for extracting any metric from the database
 */

import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  jsonb,
  varchar,
  decimal,
  inet,
  bigint
} from 'drizzle-orm/pg-core'
import { sites, users, scans, tokenSets } from './schema'

// ============================================================================
// ANALYTICS EVENTS TABLE
// ============================================================================

export const analyticsEvents = pgTable('analytics_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  eventType: varchar('event_type', { length: 100 }).notNull(),
  eventName: varchar('event_name', { length: 255 }).notNull(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  sessionId: varchar('session_id', { length: 255 }),

  // Context
  url: text('url'),
  referrer: text('referrer'),
  userAgent: text('user_agent'),
  ipAddress: inet('ip_address'),
  countryCode: varchar('country_code', { length: 2 }),

  // Data
  properties: jsonb('properties'),
  vercelAnalyticsId: varchar('vercel_analytics_id', { length: 255 }),
  vercelSpeedInsight: jsonb('vercel_speed_insight'),

  // Timing
  durationMs: integer('duration_ms'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

// ============================================================================
// TOKEN ANALYTICS TABLE
// ============================================================================

export const tokenAnalytics = pgTable('token_analytics', {
  id: uuid('id').primaryKey().defaultRandom(),
  siteId: uuid('site_id').notNull().references(() => sites.id, { onDelete: 'cascade' }),
  tokenSetId: uuid('token_set_id').notNull().references(() => tokenSets.id, { onDelete: 'cascade' }),

  // Color analytics
  totalColors: integer('total_colors').default(0),
  neutralColors: integer('neutral_colors').default(0),
  brandColors: integer('brand_colors').default(0),
  blueColors: integer('blue_colors').default(0),
  redColors: integer('red_colors').default(0),
  greenColors: integer('green_colors').default(0),
  uniqueHues: integer('unique_hues').default(0),
  colorHarmonyScore: decimal('color_harmony_score', { precision: 5, scale: 2 }),

  // Typography analytics
  totalFonts: integer('total_fonts').default(0),
  sansSerifFonts: integer('sans_serif_fonts').default(0),
  serifFonts: integer('serif_fonts').default(0),
  monospaceFonts: integer('monospace_fonts').default(0),
  fontWeightsCount: integer('font_weights_count').default(0),
  fontSizesCount: integer('font_sizes_count').default(0),

  // Spacing analytics
  totalSpacingValues: integer('total_spacing_values').default(0),
  minSpacing: decimal('min_spacing', { precision: 10, scale: 2 }),
  maxSpacing: decimal('max_spacing', { precision: 10, scale: 2 }),
  spacingScaleType: varchar('spacing_scale_type', { length: 50 }),
  spacingConsistencyScore: decimal('spacing_consistency_score', { precision: 5, scale: 2 }),

  // Border radius analytics
  totalRadiusValues: integer('total_radius_values').default(0),
  sharpCorners: integer('sharp_corners').default(0),
  roundedCorners: integer('rounded_corners').default(0),
  pillCorners: integer('pill_corners').default(0),

  // Shadow analytics
  totalShadows: integer('total_shadows').default(0),
  subtleShadows: integer('subtle_shadows').default(0),
  mediumShadows: integer('medium_shadows').default(0),
  strongShadows: integer('strong_shadows').default(0),

  // Overall scores
  maturityScore: decimal('maturity_score', { precision: 5, scale: 2 }),
  consistencyScore: decimal('consistency_score', { precision: 5, scale: 2 }),

  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

// ============================================================================
// DOMAIN ANALYTICS TABLE
// ============================================================================

export const domainAnalytics = pgTable('domain_analytics', {
  id: uuid('id').primaryKey().defaultRandom(),
  domain: varchar('domain', { length: 255 }).notNull().unique(),
  tld: varchar('tld', { length: 50 }),

  // Scan statistics
  totalScans: integer('total_scans').default(0),
  successfulScans: integer('successful_scans').default(0),
  failedScans: integer('failed_scans').default(0),
  avgScanDurationMs: decimal('avg_scan_duration_ms', { precision: 10, scale: 2 }),

  // Token statistics
  avgTokensExtracted: integer('avg_tokens_extracted').default(0),
  avgConfidenceScore: decimal('avg_confidence_score', { precision: 5, scale: 2 }),

  // Popularity metrics
  searchCount: integer('search_count').default(0),
  viewCount: integer('view_count').default(0),
  voteCount: integer('vote_count').default(0),

  // Traffic sources
  organicTraffic: integer('organic_traffic').default(0),
  directTraffic: integer('direct_traffic').default(0),
  referralTraffic: integer('referral_traffic').default(0),

  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

// ============================================================================
// SEARCH ANALYTICS TABLE
// ============================================================================

export const searchAnalytics = pgTable('search_analytics', {
  id: uuid('id').primaryKey().defaultRandom(),
  query: text('query').notNull(),
  queryNormalized: text('query_normalized'),

  // Context
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  sessionId: varchar('session_id', { length: 255 }),

  // Results
  resultsCount: integer('results_count').default(0),
  clickedResultPosition: integer('clicked_result_position'),
  clickedSiteId: uuid('clicked_site_id').references(() => sites.id, { onDelete: 'set null' }),

  // Metadata
  searchFilters: jsonb('search_filters'),
  searchDurationMs: integer('search_duration_ms'),

  createdAt: timestamp('created_at').notNull().defaultNow(),
})

// ============================================================================
// VERCEL ANALYTICS TABLE
// ============================================================================

export const vercelAnalytics = pgTable('vercel_analytics', {
  id: uuid('id').primaryKey().defaultRandom(),

  // Web Analytics
  pageUrl: text('page_url').notNull(),
  referrer: text('referrer'),
  visitorId: varchar('visitor_id', { length: 255 }),
  sessionId: varchar('session_id', { length: 255 }),

  // Speed Insights (Core Web Vitals)
  cls: decimal('cls', { precision: 5, scale: 3 }), // Cumulative Layout Shift
  fcp: integer('fcp'), // First Contentful Paint (ms)
  fid: integer('fid'), // First Input Delay (ms)
  lcp: integer('lcp'), // Largest Contentful Paint (ms)
  ttfb: integer('ttfb'), // Time to First Byte (ms)
  inp: integer('inp'), // Interaction to Next Paint (ms)

  // Device & Browser
  deviceType: varchar('device_type', { length: 50 }),
  browser: varchar('browser', { length: 100 }),
  os: varchar('os', { length: 100 }),

  // Geographic
  country: varchar('country', { length: 100 }),
  city: varchar('city', { length: 100 }),
  region: varchar('region', { length: 100 }),

  createdAt: timestamp('created_at').notNull().defaultNow(),
})

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type AnalyticsEvent = typeof analyticsEvents.$inferSelect
export type NewAnalyticsEvent = typeof analyticsEvents.$inferInsert

export type TokenAnalytic = typeof tokenAnalytics.$inferSelect
export type NewTokenAnalytic = typeof tokenAnalytics.$inferInsert

export type DomainAnalytic = typeof domainAnalytics.$inferSelect
export type NewDomainAnalytic = typeof domainAnalytics.$inferInsert

export type SearchAnalytic = typeof searchAnalytics.$inferSelect
export type NewSearchAnalytic = typeof searchAnalytics.$inferInsert

export type VercelAnalytic = typeof vercelAnalytics.$inferSelect
export type NewVercelAnalytic = typeof vercelAnalytics.$inferInsert