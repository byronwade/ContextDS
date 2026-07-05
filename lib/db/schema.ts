import { sql } from 'drizzle-orm'
import {
  sqliteTable,
  text,
  integer,
  real,
  uniqueIndex,
  index,
} from 'drizzle-orm/sqlite-core'
import { createInsertSchema, createSelectSchema } from 'drizzle-zod'

const id = () => text('id').primaryKey().$defaultFn(() => crypto.randomUUID())
const timestamp = () =>
  integer('created_at', { mode: 'timestamp' })
    .notNull()
    .$defaultFn(() => new Date())
const updatedAt = () =>
  integer('updated_at', { mode: 'timestamp' })
    .notNull()
    .$defaultFn(() => new Date())

export const users = sqliteTable('users', {
  id: id(),
  email: text('email').notNull().unique(),
  name: text('name'),
  avatarUrl: text('avatar_url'),
  passwordHash: text('password_hash'),
  role: text('role').notNull().default('user'),
  emailVerified: integer('email_verified', { mode: 'boolean' }).notNull().default(false),
  createdAt: timestamp(),
  updatedAt: updatedAt(),
})

export const sites = sqliteTable(
  'sites',
  {
    id: id(),
    domain: text('domain').notNull().unique(),
    status: text('status').notNull().default('queued'),
    robotsStatus: text('robots_status').notNull().default('unknown'),
    ownerOptout: integer('owner_optout', { mode: 'boolean' }).notNull().default(false),
    firstSeen: integer('first_seen', { mode: 'timestamp' })
      .notNull()
      .$defaultFn(() => new Date()),
    lastScanned: integer('last_scanned', { mode: 'timestamp' }),
    popularity: integer('popularity').notNull().default(0),
    favicon: text('favicon'),
    title: text('title'),
    description: text('description'),
    createdAt: timestamp(),
    updatedAt: updatedAt(),
  },
  (table) => ({
    domainIdx: index('sites_domain_idx').on(table.domain),
    statusIdx: index('sites_status_idx').on(table.status),
  })
)

export const scans = sqliteTable(
  'scans',
  {
    id: id(),
    siteId: text('site_id')
      .notNull()
      .references(() => sites.id, { onDelete: 'cascade' }),
    method: text('method').notNull().default('computed'),
    cssSourceCount: integer('css_source_count').notNull().default(0),
    sha: text('sha'),
    startedAt: integer('started_at', { mode: 'timestamp' })
      .notNull()
      .$defaultFn(() => new Date()),
    finishedAt: integer('finished_at', { mode: 'timestamp' }),
    error: text('error'),
    prettify: integer('prettify', { mode: 'boolean' }).notNull().default(false),
    metricsJson: text('metrics_json', { mode: 'json' }).$type<Record<string, unknown>>(),
    createdAt: timestamp(),
  },
  (table) => ({
    siteIdx: index('scans_site_id_idx').on(table.siteId),
  })
)

export const pages = sqliteTable('pages', {
  id: id(),
  scanId: text('scan_id')
    .notNull()
    .references(() => scans.id, { onDelete: 'cascade' }),
  url: text('url').notNull(),
  viewport: text('viewport'),
  status: text('status').notNull().default('queued'),
  screenshotUrl: text('screenshot_url'),
  htmlSize: integer('html_size'),
  loadTime: integer('load_time'),
  createdAt: timestamp(),
})

export const cssContent = sqliteTable('css_content', {
  sha: text('sha').primaryKey(),
  content: text('content').notNull(),
  contentCompressed: integer('content_compressed', { mode: 'boolean' }).notNull().default(true),
  bytes: integer('bytes').notNull().default(0),
  compressedBytes: integer('compressed_bytes').notNull().default(0),
  referenceCount: integer('reference_count').notNull().default(0),
  ttlDays: integer('ttl_days').notNull().default(30),
  firstSeen: integer('first_seen', { mode: 'timestamp' })
    .notNull()
    .$defaultFn(() => new Date()),
  lastAccessed: integer('last_accessed', { mode: 'timestamp' })
    .notNull()
    .$defaultFn(() => new Date()),
})

export const cssSources = sqliteTable('css_sources', {
  id: id(),
  scanId: text('scan_id')
    .notNull()
    .references(() => scans.id, { onDelete: 'cascade' }),
  url: text('url'),
  kind: text('kind').notNull(),
  bytes: integer('bytes').notNull().default(0),
  sha: text('sha').references(() => cssContent.sha, { onDelete: 'set null' }),
  createdAt: timestamp(),
})

export const screenshotContent = sqliteTable('screenshot_content', {
  sha: text('sha').primaryKey(),
  url: text('url').notNull(),
  width: integer('width').notNull(),
  height: integer('height').notNull(),
  fileSize: integer('file_size').notNull(),
  referenceCount: integer('reference_count').notNull().default(0),
  ttlDays: integer('ttl_days').notNull().default(90),
  firstSeen: integer('first_seen', { mode: 'timestamp' })
    .notNull()
    .$defaultFn(() => new Date()),
  lastAccessed: integer('last_accessed', { mode: 'timestamp' })
    .notNull()
    .$defaultFn(() => new Date()),
})

export const screenshots = sqliteTable(
  'screenshots',
  {
    id: id(),
    siteId: text('site_id')
      .notNull()
      .references(() => sites.id, { onDelete: 'cascade' }),
    scanId: text('scan_id')
      .notNull()
      .references(() => scans.id, { onDelete: 'cascade' }),
    sha: text('sha')
      .notNull()
      .references(() => screenshotContent.sha, { onDelete: 'cascade' }),
    viewport: text('viewport').notNull(),
    capturedAt: integer('captured_at', { mode: 'timestamp' })
      .notNull()
      .$defaultFn(() => new Date()),
    selector: text('selector'),
    label: text('label'),
  },
  (table) => ({
    siteViewportUnique: uniqueIndex('screenshots_site_viewport_unique').on(
      table.siteId,
      table.viewport
    ),
  })
)

export const tokenSets = sqliteTable(
  'token_sets',
  {
    id: id(),
    siteId: text('site_id').references(() => sites.id, { onDelete: 'cascade' }),
    scanId: text('scan_id').references(() => scans.id, { onDelete: 'cascade' }),
    version: text('version').notNull().default('1.0.0'),
    versionNumber: integer('version_number').notNull().default(1),
    tokensJson: text('tokens_json', { mode: 'json' }).notNull().$type<Record<string, unknown>>(),
    packJson: text('pack_json', { mode: 'json' }).$type<Record<string, unknown>>(),
    consensusScore: real('consensus_score').default(0),
    isPublic: integer('is_public', { mode: 'boolean' }).notNull().default(true),
    createdBy: text('created_by').references(() => users.id),
    createdAt: timestamp(),
    updatedAt: updatedAt(),
  },
  (table) => ({
    siteIdx: index('token_sets_site_id_idx').on(table.siteId),
  })
)

export const tokenVersions = sqliteTable('token_versions', {
  id: id(),
  siteId: text('site_id')
    .notNull()
    .references(() => sites.id, { onDelete: 'cascade' }),
  tokenSetId: text('token_set_id')
    .notNull()
    .references(() => tokenSets.id, { onDelete: 'cascade' }),
  versionNumber: integer('version_number').notNull(),
  previousVersionId: text('previous_version_id'),
  changelogJson: text('changelog_json', { mode: 'json' }).$type<Record<string, unknown>>(),
  diffSummary: text('diff_summary', { mode: 'json' }).$type<Record<string, unknown>>(),
  createdAt: timestamp(),
})

export const tokenChanges = sqliteTable('token_changes', {
  id: id(),
  versionId: text('version_id')
    .notNull()
    .references(() => tokenVersions.id, { onDelete: 'cascade' }),
  tokenPath: text('token_path').notNull(),
  changeType: text('change_type').notNull(),
  oldValue: text('old_value', { mode: 'json' }).$type<unknown>(),
  newValue: text('new_value', { mode: 'json' }).$type<unknown>(),
  category: text('category'),
  createdAt: timestamp(),
})

export const layoutProfiles = sqliteTable('layout_profiles', {
  id: id(),
  siteId: text('site_id').references(() => sites.id, { onDelete: 'cascade' }),
  scanId: text('scan_id').references(() => scans.id, { onDelete: 'cascade' }),
  profileJson: text('profile_json', { mode: 'json' }).notNull().$type<Record<string, unknown>>(),
  archetypes: text('archetypes', { mode: 'json' }).$type<unknown>(),
  containers: text('containers', { mode: 'json' }).$type<unknown>(),
  gridFlex: text('grid_flex', { mode: 'json' }).$type<unknown>(),
  spacingScale: text('spacing_scale', { mode: 'json' }).$type<unknown>(),
  radiiTaxonomy: text('radii_taxonomy', { mode: 'json' }).$type<unknown>(),
  shadowsTaxonomy: text('shadows_taxonomy', { mode: 'json' }).$type<unknown>(),
  motion: text('motion', { mode: 'json' }).$type<unknown>(),
  accessibility: text('accessibility', { mode: 'json' }).$type<unknown>(),
  createdAt: timestamp(),
})

export const orgArtifacts = sqliteTable('org_artifacts', {
  id: id(),
  siteId: text('site_id')
    .notNull()
    .references(() => sites.id, { onDelete: 'cascade' }),
  docsUrls: text('docs_urls', { mode: 'json' }).$type<string[]>(),
  storybookUrl: text('storybook_url'),
  figmaUrl: text('figma_url'),
  githubOrg: text('github_org'),
  reposJson: text('repos_json', { mode: 'json' }).$type<unknown>(),
  lastChecked: integer('last_checked', { mode: 'timestamp' })
    .notNull()
    .$defaultFn(() => new Date()),
  createdAt: timestamp(),
})

export const submissions = sqliteTable('submissions', {
  id: id(),
  url: text('url').notNull(),
  submittedBy: text('submitted_by').references(() => users.id),
  status: text('status').notNull().default('queued'),
  reason: text('reason'),
  estimatedQueue: integer('estimated_queue'),
  notifyEmail: text('notify_email'),
  priority: integer('priority').notNull().default(0),
  createdAt: timestamp(),
  updatedAt: updatedAt(),
})

export const tokenVotes = sqliteTable('token_votes', {
  id: id(),
  tokenSetId: text('token_set_id')
    .notNull()
    .references(() => tokenSets.id, { onDelete: 'cascade' }),
  tokenKey: text('token_key').notNull(),
  voteType: text('vote_type').notNull(),
  note: text('note'),
  userId: text('user_id')
    .notNull()
    .references(() => users.id),
  createdAt: timestamp(),
})

export const remixes = sqliteTable('remixes', {
  id: id(),
  sourceTokenSetIds: text('source_token_set_ids', { mode: 'json' })
    .notNull()
    .$type<string[]>(),
  constraintsJson: text('constraints_json', { mode: 'json' }).$type<Record<string, unknown>>(),
  outputTokenSetId: text('output_token_set_id').references(() => tokenSets.id),
  name: text('name'),
  description: text('description'),
  isPublic: integer('is_public', { mode: 'boolean' }).notNull().default(false),
  createdBy: text('created_by')
    .notNull()
    .references(() => users.id),
  createdAt: timestamp(),
  updatedAt: updatedAt(),
})

export const subscriptions = sqliteTable('subscriptions', {
  id: id(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  plan: text('plan').notNull().default('free'),
  status: text('status').notNull(),
  stripeCustomerId: text('stripe_customer_id'),
  stripeSubscriptionId: text('stripe_subscription_id'),
  currentPeriodStart: integer('current_period_start', { mode: 'timestamp' }),
  currentPeriodEnd: integer('current_period_end', { mode: 'timestamp' }),
  cancelAtPeriodEnd: integer('cancel_at_period_end', { mode: 'boolean' }).notNull().default(false),
  scansQuota: integer('scans_quota').notNull().default(3),
  remixesQuota: integer('remixes_quota').notNull().default(0),
  privatePacksQuota: integer('private_packs_quota').notNull().default(0),
  createdAt: timestamp(),
  updatedAt: updatedAt(),
})

export const apiKeys = sqliteTable('api_keys', {
  id: id(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  keyHash: text('key_hash').notNull().unique(),
  prefix: text('prefix').notNull(),
  permissions: text('permissions', { mode: 'json' }).$type<string[]>(),
  lastUsed: integer('last_used', { mode: 'timestamp' }),
  expiresAt: integer('expires_at', { mode: 'timestamp' }),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  createdAt: timestamp(),
})

export const mcpUsage = sqliteTable('mcp_usage', {
  id: id(),
  userId: text('user_id').references(() => users.id),
  apiKeyId: text('api_key_id').references(() => apiKeys.id),
  tool: text('tool').notNull(),
  parameters: text('parameters', { mode: 'json' }).$type<Record<string, unknown>>(),
  responseSize: integer('response_size'),
  latency: integer('latency'),
  success: integer('success', { mode: 'boolean' }).notNull(),
  errorType: text('error_type'),
  rateLimited: integer('rate_limited', { mode: 'boolean' }).notNull().default(false),
  createdAt: timestamp(),
})

export const auditLog = sqliteTable('audit_log', {
  id: id(),
  userId: text('user_id').references(() => users.id),
  action: text('action').notNull(),
  resourceType: text('resource_type').notNull(),
  resourceId: text('resource_id'),
  details: text('details', { mode: 'json' }).$type<Record<string, unknown>>(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  createdAt: timestamp(),
})

export const statsCache = sqliteTable('stats_cache', {
  id: id(),
  key: text('key').notNull().unique(),
  data: text('data', { mode: 'json' }).notNull().$type<Record<string, unknown>>(),
  expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
  createdAt: timestamp(),
  updatedAt: updatedAt(),
})

export const popularSitesCache = sqliteTable('popular_sites_cache', {
  id: id(),
  siteId: text('site_id')
    .notNull()
    .references(() => sites.id, { onDelete: 'cascade' }),
  domain: text('domain').notNull(),
  popularity: integer('popularity').notNull().default(0),
  tokens: integer('tokens').notNull().default(0),
  lastScanned: integer('last_scanned', { mode: 'timestamp' }),
  rank: integer('rank').notNull(),
  cacheDate: integer('cache_date', { mode: 'timestamp' })
    .notNull()
    .$defaultFn(() => new Date()),
})

export const recentActivityCache = sqliteTable('recent_activity_cache', {
  id: id(),
  domain: text('domain').notNull(),
  scanId: text('scan_id')
    .notNull()
    .references(() => scans.id, { onDelete: 'cascade' }),
  tokens: integer('tokens').notNull().default(0),
  scannedAt: integer('scanned_at', { mode: 'timestamp' }).notNull(),
  rank: integer('rank').notNull(),
  cacheDate: integer('cache_date', { mode: 'timestamp' })
    .notNull()
    .$defaultFn(() => new Date()),
})

export const sessions = sqliteTable(
  'sessions',
  {
    id: id(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    tokenHash: text('token_hash').notNull().unique(),
    expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
    createdAt: timestamp(),
  },
  (table) => ({
    userIdx: index('sessions_user_id_idx').on(table.userId),
  })
)

export const insertSiteSchema = createInsertSchema(sites)
export const selectSiteSchema = createSelectSchema(sites)
export const insertScanSchema = createInsertSchema(scans)
export const selectScanSchema = createSelectSchema(scans)
export const insertTokenSetSchema = createInsertSchema(tokenSets)
export const selectTokenSetSchema = createSelectSchema(tokenSets)
export const insertUserSchema = createInsertSchema(users)
export const selectUserSchema = createSelectSchema(users)

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
export type Screenshot = typeof screenshots.$inferSelect
export type NewScreenshot = typeof screenshots.$inferInsert
export type Session = typeof sessions.$inferSelect
export type NewSession = typeof sessions.$inferInsert

export { sql }
