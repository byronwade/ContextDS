import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  boolean,
  jsonb,
  varchar,
  decimal,
  pgEnum
} from 'drizzle-orm/pg-core'
import { createInsertSchema, createSelectSchema } from 'drizzle-zod'

// Enums
export const scanStatusEnum = pgEnum('scan_status', ['queued', 'scanning', 'completed', 'failed'])
export const scanMethodEnum = pgEnum('scan_method', ['static', 'computed'])
export const cssSourceKindEnum = pgEnum('css_source_kind', ['link', 'inline', 'computed'])
export const submissionStatusEnum = pgEnum('submission_status', ['queued', 'scanning', 'done', 'rejected'])
export const voteTypeEnum = pgEnum('vote_type', ['correct', 'alias', 'duplicate', 'low_contrast', 'rename'])
export const robotsStatusEnum = pgEnum('robots_status', ['allowed', 'disallowed', 'unknown'])

// Sites table - tracks domains and their scanning status
export const sites = pgTable('sites', {
  id: uuid('id').primaryKey().defaultRandom(),
  domain: varchar('domain', { length: 255 }).notNull().unique(),
  status: scanStatusEnum('status').notNull().default('queued'),
  robotsStatus: robotsStatusEnum('robots_status').notNull().default('unknown'),
  ownerOptout: boolean('owner_optout').notNull().default(false),
  firstSeen: timestamp('first_seen').notNull().defaultNow(),
  lastScanned: timestamp('last_scanned'),
  popularity: integer('popularity').notNull().default(0),
  favicon: text('favicon'),
  title: text('title'),
  description: text('description'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

// Scans table - individual scanning jobs
export const scans = pgTable('scans', {
  id: uuid('id').primaryKey().defaultRandom(),
  siteId: uuid('site_id').notNull().references(() => sites.id, { onDelete: 'cascade' }),
  method: scanMethodEnum('method').notNull().default('computed'),
  cssSourceCount: integer('css_source_count').notNull().default(0),
  sha: varchar('sha', { length: 64 }), // CSS content hash
  startedAt: timestamp('started_at').notNull().defaultNow(),
  finishedAt: timestamp('finished_at'),
  error: text('error'),
  prettify: boolean('prettify').notNull().default(false),
  metricsJson: jsonb('metrics_json'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

// Pages table - individual pages within a scan
export const pages = pgTable('pages', {
  id: uuid('id').primaryKey().defaultRandom(),
  scanId: uuid('scan_id').notNull().references(() => scans.id, { onDelete: 'cascade' }),
  url: text('url').notNull(),
  viewport: varchar('viewport', { length: 50 }), // e.g., '1280x720'
  status: scanStatusEnum('status').notNull().default('queued'),
  screenshotUrl: text('screenshot_url'),
  htmlSize: integer('html_size'),
  loadTime: integer('load_time'), // milliseconds
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

// CSS Sources table - tracks individual CSS files/sources
export const cssSources = pgTable('css_sources', {
  id: uuid('id').primaryKey().defaultRandom(),
  scanId: uuid('scan_id').notNull().references(() => scans.id, { onDelete: 'cascade' }),
  url: text('url'),
  kind: cssSourceKindEnum('kind').notNull(),
  bytes: integer('bytes').notNull().default(0),
  sha: varchar('sha', { length: 64 }).notNull(), // Content hash
  content: text('content'), // Raw CSS content
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

// Token Sets table - W3C design tokens with metadata
export const tokenSets = pgTable('token_sets', {
  id: uuid('id').primaryKey().defaultRandom(),
  siteId: uuid('site_id').references(() => sites.id, { onDelete: 'cascade' }), // Nullable for remixes
  scanId: uuid('scan_id').references(() => scans.id, { onDelete: 'cascade' }),
  version: varchar('version', { length: 50 }).notNull().default('1.0.0'),
  tokensJson: jsonb('tokens_json').notNull(), // W3C design tokens format
  packJson: jsonb('pack_json'), // AI prompt pack
  consensusScore: decimal('consensus_score', { precision: 3, scale: 2 }).default('0.00'),
  isPublic: boolean('is_public').notNull().default(true),
  createdBy: uuid('created_by').references(() => users.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

// Layout Profiles table - layout DNA analysis
export const layoutProfiles = pgTable('layout_profiles', {
  id: uuid('id').primaryKey().defaultRandom(),
  siteId: uuid('site_id').references(() => sites.id, { onDelete: 'cascade' }),
  scanId: uuid('scan_id').references(() => scans.id, { onDelete: 'cascade' }),
  profileJson: jsonb('profile_json').notNull(), // Layout DNA data
  archetypes: jsonb('archetypes'), // Page archetypes detected
  containers: jsonb('containers'), // Container width analysis
  gridFlex: jsonb('grid_flex'), // Grid/flex usage patterns
  spacingScale: jsonb('spacing_scale'), // Spacing scale analysis
  radiiTaxonomy: jsonb('radii_taxonomy'), // Border radius patterns
  shadowsTaxonomy: jsonb('shadows_taxonomy'), // Shadow patterns
  motion: jsonb('motion'), // Animation/transition patterns
  accessibility: jsonb('accessibility'), // A11y analysis
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

// Organization Artifacts table - company design system discovery
export const orgArtifacts = pgTable('org_artifacts', {
  id: uuid('id').primaryKey().defaultRandom(),
  siteId: uuid('site_id').notNull().references(() => sites.id, { onDelete: 'cascade' }),
  docsUrls: jsonb('docs_urls'), // Array of documentation URLs
  storybookUrl: text('storybook_url'),
  figmaUrl: text('figma_url'),
  githubOrg: varchar('github_org', { length: 255 }),
  reposJson: jsonb('repos_json'), // GitHub repos analysis
  lastChecked: timestamp('last_checked').notNull().defaultNow(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

// Submissions table - user-submitted URLs for scanning
export const submissions = pgTable('submissions', {
  id: uuid('id').primaryKey().defaultRandom(),
  url: text('url').notNull(),
  submittedBy: uuid('submitted_by').references(() => users.id),
  status: submissionStatusEnum('status').notNull().default('queued'),
  reason: text('reason'), // Rejection reason if applicable
  estimatedQueue: integer('estimated_queue'), // Queue position estimate
  notifyEmail: varchar('notify_email', { length: 255 }),
  priority: integer('priority').notNull().default(0), // Higher for paid users
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

// Token Votes table - community voting on token accuracy
export const tokenVotes = pgTable('token_votes', {
  id: uuid('id').primaryKey().defaultRandom(),
  tokenSetId: uuid('token_set_id').notNull().references(() => tokenSets.id, { onDelete: 'cascade' }),
  tokenKey: varchar('token_key', { length: 255 }).notNull(), // e.g., 'color.primary'
  voteType: voteTypeEnum('vote_type').notNull(),
  note: text('note'),
  userId: uuid('user_id').notNull().references(() => users.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

// Remixes table - combined token sets
export const remixes = pgTable('remixes', {
  id: uuid('id').primaryKey().defaultRandom(),
  sourceTokenSetIds: jsonb('source_token_set_ids').notNull(), // Array of source IDs
  constraintsJson: jsonb('constraints_json'), // Remix constraints
  outputTokenSetId: uuid('output_token_set_id').references(() => tokenSets.id),
  name: varchar('name', { length: 255 }),
  description: text('description'),
  isPublic: boolean('is_public').notNull().default(false),
  createdBy: uuid('created_by').notNull().references(() => users.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

// Users table - authentication and user management
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  name: varchar('name', { length: 255 }),
  avatarUrl: text('avatar_url'),
  role: varchar('role', { length: 50 }).notNull().default('user'), // user, moderator, admin
  emailVerified: boolean('email_verified').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

// Subscriptions table - billing and plan management
export const subscriptions = pgTable('subscriptions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  plan: varchar('plan', { length: 50 }).notNull().default('free'), // free, pro
  status: varchar('status', { length: 50 }).notNull(), // active, cancelled, past_due
  stripeCustomerId: varchar('stripe_customer_id', { length: 255 }),
  stripeSubscriptionId: varchar('stripe_subscription_id', { length: 255 }),
  currentPeriodStart: timestamp('current_period_start'),
  currentPeriodEnd: timestamp('current_period_end'),
  cancelAtPeriodEnd: boolean('cancel_at_period_end').notNull().default(false),
  scansQuota: integer('scans_quota').notNull().default(3), // Monthly scan limit
  remixesQuota: integer('remixes_quota').notNull().default(0), // Monthly remix limit
  privatePacksQuota: integer('private_packs_quota').notNull().default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

// API Keys table - authentication for MCP and API access
export const apiKeys = pgTable('api_keys', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  keyHash: varchar('key_hash', { length: 255 }).notNull().unique(), // Hashed API key
  prefix: varchar('prefix', { length: 10 }).notNull(), // First few chars for display
  permissions: jsonb('permissions'), // Scoped permissions array
  lastUsed: timestamp('last_used'),
  expiresAt: timestamp('expires_at'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

// MCP Usage table - tracking API and tool usage
export const mcpUsage = pgTable('mcp_usage', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id),
  apiKeyId: uuid('api_key_id').references(() => apiKeys.id),
  tool: varchar('tool', { length: 100 }).notNull(), // scan_tokens, get_tokens, etc.
  parameters: jsonb('parameters'), // Tool parameters (no PII)
  responseSize: integer('response_size'), // Response size in bytes
  latency: integer('latency'), // Response time in ms
  success: boolean('success').notNull(),
  errorType: varchar('error_type', { length: 100 }),
  rateLimited: boolean('rate_limited').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

// Audit Log table - system events and changes
export const auditLog = pgTable('audit_log', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id),
  action: varchar('action', { length: 100 }).notNull(),
  resourceType: varchar('resource_type', { length: 100 }).notNull(),
  resourceId: uuid('resource_id'),
  details: jsonb('details'),
  ipAddress: varchar('ip_address', { length: 45 }),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

// Zod schemas for validation
export const insertSiteSchema = createInsertSchema(sites)
export const selectSiteSchema = createSelectSchema(sites)

export const insertScanSchema = createInsertSchema(scans)
export const selectScanSchema = createSelectSchema(scans)

export const insertTokenSetSchema = createInsertSchema(tokenSets)
export const selectTokenSetSchema = createSelectSchema(tokenSets)

export const insertLayoutProfileSchema = createInsertSchema(layoutProfiles)
export const selectLayoutProfileSchema = createSelectSchema(layoutProfiles)

export const insertUserSchema = createInsertSchema(users)
export const selectUserSchema = createSelectSchema(users)

export const insertSubmissionSchema = createInsertSchema(submissions)
export const selectSubmissionSchema = createSelectSchema(submissions)

// Type exports
export type Site = typeof sites.$inferSelect
export type NewSite = typeof sites.$inferInsert

export type Scan = typeof scans.$inferSelect
export type NewScan = typeof scans.$inferInsert

export type TokenSet = typeof tokenSets.$inferSelect
export type NewTokenSet = typeof tokenSets.$inferInsert

export type LayoutProfile = typeof layoutProfiles.$inferSelect
export type NewLayoutProfile = typeof layoutProfiles.$inferInsert

export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert

export type Submission = typeof submissions.$inferSelect
export type NewSubmission = typeof submissions.$inferInsert
