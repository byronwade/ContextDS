/**
 * App type detection — classifies a scanned site into an engine profile + app type.
 *
 * Maps scan evidence (layout archetypes, app shell, density, flows, domain) onto the
 * Design engine's COMPOSITION template app types:
 *   'saas-workbench' | 'admin-console' | 'content-studio' | 'marketing-site'
 * and the matching engine profiles: 'web-app' | 'web-marketing'.
 *
 * Pure and dependency-free. Archetype matching is case-insensitive substring
 * matching against the strings produced by lib/analyzers/layout-dna.ts
 * (e.g. 'hero', 'marketing-hero', 'pricing', 'pricing-table', 'features',
 * 'feature-grid', 'blog', 'blog-index', 'doc-page', 'navigation', 'footer').
 */

export type EngineAppType = 'saas-workbench' | 'admin-console' | 'content-studio' | 'marketing-site'
export type EngineProfile = 'web-app' | 'web-marketing'

export type AppTypeDetection = {
  appType: EngineAppType
  profile: EngineProfile
  confidence: number
  reasons: string[]
}

export interface AppTypeInput {
  archetypes?: Array<{ type: string; confidence: number }> | null
  shell?: {
    header?: { height: number; sticky: boolean } | null
    sidebar?: { width: number; fixed: boolean } | null
    footer?: { height: number } | null
  } | null
  density?: { elementsInViewport: number; imageAreaRatio: number; textChars: number } | null
  flow?: Array<{ from: string; to: string }> | null
  domain?: string
}

const PROFILE_FOR: Record<EngineAppType, EngineProfile> = {
  'saas-workbench': 'web-app',
  'admin-console': 'web-app',
  'content-studio': 'web-app',
  'marketing-site': 'web-marketing'
}

const ADMIN_KEYWORDS = ['dashboard', 'table', 'settings', 'admin']
const CONTENT_KEYWORDS = ['article', 'blog', 'doc', 'content', 'post']
const MARKETING_KEYWORDS = ['hero', 'landing', 'pricing', 'feature', 'marketing', 'cta']

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function normalizeConfidence(raw: number): number {
  if (!Number.isFinite(raw) || raw <= 0) return 0
  // layout-dna emits 0-100 confidences; other callers may pass 0-1
  return clamp(raw > 1 ? raw / 100 : raw, 0, 1)
}

interface ArchetypeMatch {
  weight: number
  matched: string[]
}

function matchArchetypes(
  archetypes: Array<{ type: string; confidence: number }>,
  keywords: string[]
): ArchetypeMatch {
  let weight = 0
  const matched: string[] = []
  for (const archetype of archetypes) {
    const type = String(archetype.type || '').toLowerCase()
    if (!type) continue
    for (const keyword of keywords) {
      if (!type.includes(keyword)) continue
      // 'pricing-table' is a marketing archetype, not an admin data table
      if (keyword === 'table' && type.includes('pricing')) continue
      weight += Math.max(0.25, normalizeConfidence(archetype.confidence))
      matched.push(archetype.type)
      break
    }
  }
  return { weight: clamp(weight, 0, 1.5), matched }
}

/**
 * Classify scan evidence into an engine app type + profile.
 * Scores each app type, picks the max; confidence is the normalized margin
 * between the top two scores; reasons list the evidence that drove the pick.
 */
export function detectAppType(input: AppTypeInput): AppTypeDetection {
  const archetypes = Array.isArray(input?.archetypes) ? input.archetypes.filter(Boolean) : []
  const shell = input?.shell ?? null
  const density = input?.density ?? null
  const flow = Array.isArray(input?.flow) ? input.flow.filter(Boolean) : []
  const domain = typeof input?.domain === 'string' ? input.domain.toLowerCase() : ''

  const hasEvidence = archetypes.length > 0 || shell !== null || density !== null || flow.length > 0 || domain.length > 0
  if (!hasEvidence) {
    return {
      appType: 'marketing-site',
      profile: 'web-marketing',
      confidence: 0.4,
      reasons: ['insufficient evidence']
    }
  }

  const scores: Record<EngineAppType, number> = {
    'saas-workbench': 0,
    'admin-console': 0,
    'content-studio': 0,
    'marketing-site': 0.5 // default bias: an unremarkable public page is a marketing site
  }
  const reasons: string[] = []

  const sidebar = shell?.sidebar ?? null
  const header = shell?.header ?? null
  const hasAppSidebar = Boolean(sidebar && sidebar.width >= 180 && sidebar.fixed)
  const hasAnySidebar = Boolean(sidebar && sidebar.width > 0)
  const denseViewport = Boolean(density && density.elementsInViewport > 300)
  const heavyText = Boolean(density && density.textChars > 3500)
  const imageRatio = density?.imageAreaRatio ?? 0
  const lowImagery = density !== null && imageRatio < 0.15
  const richImagery = density !== null && imageRatio > 0.25
  const stickyHeader = Boolean(header && header.sticky)

  const adminMatch = matchArchetypes(archetypes, ADMIN_KEYWORDS)
  const contentMatch = matchArchetypes(archetypes, CONTENT_KEYWORDS)
  const marketingMatch = matchArchetypes(archetypes, MARKETING_KEYWORDS)

  // --- saas-workbench: fixed wide sidebar + dense first viewport ---
  if (hasAppSidebar) {
    scores['saas-workbench'] += 1.5
    scores['admin-console'] += 1.25
    scores['marketing-site'] -= 1.5
    reasons.push(`fixed app sidebar (${sidebar!.width}px wide)`)
  }
  if (denseViewport) {
    scores['saas-workbench'] += 1.25
    scores['admin-console'] += 0.75
    reasons.push(`dense first viewport (${density!.elementsInViewport} elements)`)
  }
  if (hasAppSidebar && denseViewport) {
    scores['saas-workbench'] += 1
    reasons.push('sidebar + dense viewport suggests a workbench UI')
  }

  // --- admin-console: sidebar + dashboard/table/settings/admin archetypes ---
  if (adminMatch.weight > 0) {
    scores['admin-console'] += (hasAnySidebar ? 2.5 : 1) * adminMatch.weight
    reasons.push(`admin archetypes detected (${adminMatch.matched.join(', ')})`)
  }

  // --- content-studio: heavy text or editorial archetypes with low imagery ---
  const contentSignal = heavyText || (contentMatch.weight > 0 && lowImagery)
  if (heavyText) {
    scores['content-studio'] += 1.25
    reasons.push(`heavy text content (${density!.textChars} chars)`)
  }
  if (contentMatch.weight > 0 && lowImagery) {
    scores['content-studio'] += 1.5 * contentMatch.weight
    reasons.push(`editorial archetypes with low imagery (${contentMatch.matched.join(', ')})`)
  }
  // ...unless it reads as blog/marketing editorial: no app sidebar, sticky marketing header
  if (contentSignal && !hasAnySidebar && stickyHeader) {
    scores['marketing-site'] += 1.75
    scores['content-studio'] -= 1
    reasons.push('editorial content with sticky marketing header and no sidebar reads as a marketing blog')
  }

  // --- marketing-site: hero/landing/pricing/features, no app sidebar, rich imagery ---
  if (marketingMatch.weight > 0) {
    scores['marketing-site'] += 1.5 * marketingMatch.weight
    reasons.push(`marketing archetypes detected (${marketingMatch.matched.join(', ')})`)
  }
  if (!hasAnySidebar && shell !== null) {
    scores['marketing-site'] += 0.5
    reasons.push('no app sidebar')
  }
  if (richImagery) {
    scores['marketing-site'] += 1
    reasons.push(`image-rich layout (${Math.round(imageRatio * 100)}% of viewport)`)
  }

  // --- domain hints (weak signals) ---
  if (/^(app|my|portal|studio)\./.test(domain)) {
    scores['saas-workbench'] += 0.75
    reasons.push(`app-style subdomain (${domain})`)
  } else if (domain.startsWith('admin.') || domain.startsWith('console.') || domain.startsWith('dashboard.')) {
    scores['admin-console'] += 1
    reasons.push(`admin-style subdomain (${domain})`)
  } else if (domain.startsWith('docs.') || domain.startsWith('blog.') || domain.startsWith('cms.')) {
    scores['content-studio'] += 0.75
    reasons.push(`content-style subdomain (${domain})`)
  }

  // --- flow hints: auth/settings flows suggest an app, signup/pricing suggests marketing ---
  const flowText = flow.map(step => `${step.from} ${step.to}`.toLowerCase()).join(' ')
  if (/login|signin|sign-in|auth|settings|account/.test(flowText)) {
    scores['saas-workbench'] += 0.5
    scores['admin-console'] += 0.5
    reasons.push('authenticated app flow detected')
  }
  if (/pricing|signup|sign-up|demo|contact/.test(flowText)) {
    scores['marketing-site'] += 0.5
    reasons.push('marketing conversion flow detected')
  }

  const ranked = (Object.entries(scores) as Array<[EngineAppType, number]>).sort((a, b) => b[1] - a[1])
  const [topType, topScore] = ranked[0]
  const secondScore = ranked[1][1]

  const margin = topScore - secondScore
  const denom = Math.max(Math.abs(topScore) + Math.abs(secondScore), 1)
  const confidence = clamp(0.4 + 0.55 * (margin / denom), 0.4, 0.95)

  if (reasons.length === 0) {
    reasons.push('insufficient evidence')
  }

  return {
    appType: topType,
    profile: PROFILE_FOR[topType],
    confidence: Number(confidence.toFixed(2)),
    reasons
  }
}
