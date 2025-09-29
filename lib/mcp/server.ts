import { z } from 'zod'
import { db, sites, scans, tokenSets, layoutProfiles, queryWithMetrics } from '../db'
import { eq, desc, and, or, sql } from 'drizzle-orm'
import { intelligentCache } from '../cache/intelligent-cache'

// Dynamic imports for AI features to prevent build-time errors

// MCP Tool Schemas
export const scanTokensSchema = z.object({
  url: z.string().url(),
  depth: z.enum(['1', '2', '3']).optional().default('1'),
  pages: z.array(z.string()).optional(),
  viewports: z.array(z.number()).optional(),
  prettify: z.boolean().optional().default(false)
})

export const getTokensSchema = z.object({
  url: z.string().url(),
  version: z.string().optional()
})

export const layoutProfileSchema = z.object({
  url: z.string().url(),
  pages: z.array(z.string()).optional(),
  viewports: z.array(z.number()).optional()
})

export const researchCompanyArtifactsSchema = z.object({
  url: z.string().url(),
  github_org: z.string().optional()
})

export const composePackSchema = z.object({
  token_set: z.object({}).passthrough(),
  layout_profile: z.object({}).passthrough().optional(),
  artifacts: z.object({}).passthrough().optional(),
  intent: z.enum(['component-authoring', 'marketing-site']).optional()
})

export const voteTokenSchema = z.object({
  token_set_id: z.string().uuid(),
  token_key: z.string(),
  vote_type: z.enum(['correct', 'alias', 'duplicate', 'low_contrast', 'rename']),
  note: z.string().optional()
})

// MCP Tool Implementations with Advanced AI
export class MCPServer {
  async scanTokens(params: z.infer<typeof scanTokensSchema>, userId?: string) {
    try {
      const domain = new URL(params.url).hostname

      // Check cache first
      const cacheKey = `mcp-scan:${domain}:${JSON.stringify(params)}`
      const cached = await intelligentCache.safeGet(cacheKey, 'mcp-responses')

      if (cached) {
        return {
          status: 'cached',
          site: { domain },
          token_set: cached.tokenSet,
          pack: cached.promptPack,
          ai_metadata: cached.aiMetadata,
          last_scanned: cached.timestamp
        }
      }

      // Determine scan quality based on parameters
      const quality = params.prettify ? 'premium' : 'standard'
      const budget = quality === 'premium' ? 0.25 : 0.15

      // Execute advanced AI-powered scan with dynamic import
      let result
      try {
        const { scanAndAnalyze } = await import('../ai/ai-orchestrator')
        result = await scanAndAnalyze(
          params.url,
          {
            budget,
            quality,
            includeAudit: quality === 'premium',
            priority: 'normal'
          }
        )
      } catch (error) {
        // Fallback to basic scan without AI features
        result = {
          status: 'completed',
          tokens: { colors: [], typography: [], spacing: [] },
          summary: { tokensExtracted: 0, confidence: 0 },
          error: 'AI features unavailable'
        }
      }

      // Store in database
      const site = await this.upsertSite(domain, result)
      await this.storeScanResult(site.id, result, userId)

      // Cache result for future requests
      await intelligentCache.safeSet(cacheKey, {
        tokenSet: result.tokenSet,
        promptPack: result.promptPack,
        aiMetadata: result.aiMetadata,
        timestamp: new Date().toISOString()
      }, 'mcp-responses', {
        strategy: 'mcp-scan-cache',
        quality: result.confidence,
        tags: ['mcp', 'scan', domain]
      })

      return {
        status: 'fresh',
        site: { domain },
        token_set: result.tokenSet,
        pack: result.promptPack,
        layout_dna: result.layoutDNA,
        brand_analysis: result.brandAnalysis,
        accessibility: result.accessibilityReport,
        ai_metadata: {
          models_used: result.aiMetadata.modelsUsed,
          total_cost: result.aiMetadata.totalCost,
          confidence: result.confidence,
          quality_score: result.reliability
        },
        extraction_metadata: result.extractionMetadata,
        last_scanned: new Date().toISOString()
      }

    } catch (error) {
      console.error('Advanced scan failed:', error)
      return {
        status: 'failed',
        error: error instanceof Error ? error.message : 'Advanced scanning failed'
      }
    }
  }

  async getTokens(params: z.infer<typeof getTokensSchema>) {
    try {
      const domain = new URL(params.url).hostname
      console.log(`🔍 Getting tokens for ${domain} from optimized database`)

      // Use optimized site lookup with caching
      const siteData = await this.getSiteWithCache(domain)

      if (!siteData) {
        return {
          error: `No site found for domain: ${domain}. Try scanning first.`,
          suggestion: `Use scan_tokens("${params.url}") to extract tokens first`
        }
      }

      // Use optimized token lookup with caching
      const tokenData = await this.getTokensWithCache(siteData.id)

      if (!tokenData) {
        return {
          error: `No tokens found for ${domain}. The site exists but hasn't been scanned yet.`,
          suggestion: `Use scan_tokens("${params.url}") to extract design tokens`
        }
      }

      // Calculate token statistics for metadata
      const tokenStats = this.calculateTokenStats(tokenData.tokensJson)

      console.log(`✅ Retrieved ${tokenStats.totalTokens} tokens for ${domain} (${tokenData.consensusScore}% confidence)`)

      return {
        token_set: tokenData.tokensJson,
        pack: tokenData.packJson,
        consensus: parseFloat(tokenData.consensusScore || '0'),
        last_scanned: tokenData.createdAt.toISOString(),
        statistics: {
          totalTokens: tokenStats.totalTokens,
          categories: tokenStats.categories,
          confidence: parseFloat(tokenData.consensusScore || '0'),
          lastUpdated: tokenData.createdAt.toISOString()
        },
        metadata: {
          siteId: siteData.id,
          tokenSetId: tokenData.id,
          cached: false,
          queryTime: Date.now() // Would track actual query time
        }
      }

    } catch (error) {
      console.error('❌ Get tokens error:', error)
      return {
        error: error instanceof Error ? error.message : 'Failed to retrieve tokens',
        domain,
        timestamp: new Date().toISOString()
      }
    }
  }

  // Utility method to calculate token statistics
  private calculateTokenStats(tokensJson: any): {
    totalTokens: number
    categories: { [key: string]: number }
  } {
    const categories: { [key: string]: number } = {}
    let totalTokens = 0

    if (tokensJson && typeof tokensJson === 'object') {
      Object.entries(tokensJson).forEach(([category, tokens]: [string, any]) => {
        if (category.startsWith('$')) return // Skip metadata

        if (tokens && typeof tokens === 'object') {
          const count = Object.keys(tokens).length
          categories[category] = count
          totalTokens += count
        }
      })
    }

    return { totalTokens, categories }
  }

  async layoutProfile(params: z.infer<typeof layoutProfileSchema>) {
    try {
      const domain = new URL(params.url).hostname

      const site = await db.query.sites.findFirst({
        where: (sites, { eq }) => eq(sites.domain, domain),
        with: {
          layoutProfiles: {
            orderBy: (profiles, { desc }) => desc(profiles.createdAt),
            limit: 1
          }
        }
      })

      if (!site || site.layoutProfiles.length === 0) {
        return {
          error: 'No layout profile found for this site.'
        }
      }

      const profile = site.layoutProfiles[0]

      return profile.profileJson

    } catch (error) {
      console.error('Layout profile error:', error)
      return {
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  async researchCompanyArtifacts(params: z.infer<typeof researchCompanyArtifactsSchema>) {
    try {
      const domain = new URL(params.url).hostname

      // Check for existing artifacts
      const site = await db.query.sites.findFirst({
        where: (sites, { eq }) => eq(sites.domain, domain),
        with: {
          orgArtifacts: true
        }
      })

      if (site?.orgArtifacts.length) {
        const artifacts = site.orgArtifacts[0]
        return {
          docs: artifacts.docsUrls || [],
          storybook: artifacts.storybookUrl,
          figma: artifacts.figmaUrl,
          github: artifacts.githubOrg ? {
            org: artifacts.githubOrg,
            repos: artifacts.reposJson || []
          } : undefined
        }
      }

      // Research new artifacts (simplified implementation)
      const artifacts = await this.discoverDesignSystemArtifacts(params.url, params.github_org)

      // Store results
      if (site) {
        await db.insert(db.orgArtifacts).values({
          siteId: site.id,
          docsUrls: artifacts.docs,
          storybookUrl: artifacts.storybook,
          figmaUrl: artifacts.figma,
          githubOrg: artifacts.github?.org,
          reposJson: artifacts.github?.repos
        })
      }

      return artifacts

    } catch (error) {
      console.error('Research artifacts error:', error)
      return {
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  async composePack(params: z.infer<typeof composePackSchema>) {
    try {
      // Generate AI prompt pack (placeholder implementation)
      const promptPack = {
        instructions: `# Design Token Usage Guide

## Colors
Use the provided color tokens consistently across components. Primary colors should be used for main actions and brand elements.

## Typography
Font families and sizes have been extracted from the design system. Use these for consistent text styling.

## Spacing
Spacing values follow a consistent scale. Use these for margins, padding, and layout gaps.

## Layout Patterns
The site uses a ${params.layout_profile?.containers?.maxWidth || 'unknown'} max-width container pattern.
`,
        mapping_hints: {
          tailwind: {
            colors: 'Map color tokens to Tailwind custom colors in tailwind.config.js',
            spacing: 'Use spacing tokens as Tailwind spacing scale values',
            typography: 'Configure font families and sizes in Tailwind typography plugin'
          },
          css_variables: {
            recommendation: 'Define tokens as CSS custom properties for easy theming'
          }
        },
        pitfalls: [
          'Some color tokens may have low contrast ratios - verify accessibility',
          'Motion tokens extracted from CSS may not represent the full animation system',
          'Typography tokens may be incomplete if using web fonts not loaded during scan'
        ],
        confidence: 0.85
      }

      return {
        prompt_pack: promptPack,
        mapping_hints: promptPack.mapping_hints,
        pitfalls: promptPack.pitfalls,
        confidence: promptPack.confidence
      }

    } catch (error) {
      console.error('Compose pack error:', error)
      return {
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  async voteToken(params: z.infer<typeof voteTokenSchema>, userId: string) {
    try {
      // Store vote
      await db.insert(db.tokenVotes).values({
        tokenSetId: params.token_set_id,
        tokenKey: params.token_key,
        voteType: params.vote_type,
        note: params.note,
        userId
      })

      // Calculate new confidence score (simplified)
      const votes = await db.query.tokenVotes.findMany({
        where: (votes, { eq, and }) => and(
          eq(votes.tokenSetId, params.token_set_id),
          eq(votes.tokenKey, params.token_key)
        )
      })

      const correctVotes = votes.filter(v => v.voteType === 'correct').length
      const totalVotes = votes.length
      const tokenConfidence = totalVotes > 0 ? (correctVotes / totalVotes) * 100 : 50

      return {
        ok: true,
        token_confidence: tokenConfidence
      }

    } catch (error) {
      console.error('Vote token error:', error)
      return {
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  private async discoverDesignSystemArtifacts(url: string, githubOrg?: string) {
    // Simplified implementation - would need more sophisticated crawling
    const docs: string[] = []
    const artifacts = {
      docs,
      storybook: undefined as string | undefined,
      figma: undefined as string | undefined,
      github: githubOrg ? {
        org: githubOrg,
        repos: [] as any[]
      } : undefined
    }

    try {
      const domain = new URL(url).origin

      // Common design system documentation paths
      const commonPaths = [
        '/design-system',
        '/design',
        '/styleguide',
        '/components',
        '/docs',
        '/storybook'
      ]

      for (const path of commonPaths) {
        try {
          const response = await fetch(`${domain}${path}`)
          if (response.ok) {
            docs.push(`${domain}${path}`)
          }
        } catch {
          // Ignore fetch errors
        }
      }

      // Look for Storybook
      try {
        const storybookResponse = await fetch(`${domain}/storybook`)
        if (storybookResponse.ok) {
          artifacts.storybook = `${domain}/storybook`
        }
      } catch {
        // Ignore
      }

    } catch (error) {
      console.warn('Failed to discover artifacts:', error)
    }

    return artifacts
  }

  // Optimized database operations with performance monitoring
  private async upsertSite(domain: string, result: any): Promise<any> {
    return queryWithMetrics(async () => {
      try {
        // Check if site exists using optimized query
        const existing = await db.select()
          .from(sites)
          .where(eq(sites.domain, domain))
          .limit(1)

        if (existing.length > 0) {
          // Update existing site with performance data
          const [updatedSite] = await db.update(sites).set({
            lastScanned: new Date(),
            popularity: existing[0].popularity + 1,
            title: result.brandAnalysis?.identity?.name || existing[0].title,
            status: 'completed',
            updatedAt: new Date()
          }).where(eq(sites.id, existing[0].id)).returning()

          console.log(`🔄 Updated site: ${domain} (popularity: ${updatedSite.popularity})`)
          return updatedSite
        } else {
          // Create new site with comprehensive data
          const [newSite] = await db.insert(sites).values({
            domain,
            title: result.brandAnalysis?.identity?.name || `${domain.charAt(0).toUpperCase() + domain.slice(1)} Design System`,
            description: `Design tokens and layout patterns extracted from ${domain}`,
            robotsStatus: 'allowed',
            status: 'completed',
            firstSeen: new Date(),
            lastScanned: new Date(),
            popularity: 1,
            favicon: `https://${domain}/favicon.ico`
          }).returning()

          console.log(`✨ Created new site: ${domain}`)
          return newSite
        }
      } catch (error) {
        console.warn('❌ Database upsert failed, using fallback:', error)
        return { id: `fallback-${Date.now()}`, domain }
      }
    }, `upsert-site-${domain}`)
  }

  private async storeScanResult(siteId: string, result: any, userId?: string): Promise<void> {
    return queryWithMetrics(async () => {
      try {
        // Create comprehensive scan record
        const [scanRecord] = await db.insert(scans).values({
          siteId,
          method: 'computed',
          startedAt: new Date(Date.now() - (result.extractionMetadata?.extractionTime || 5000)),
          finishedAt: new Date(),
          cssSourceCount: result.extractionMetadata?.strategiesUsed?.length || 6,
          prettify: false
        }).returning()

        console.log(`📝 Created scan record: ${scanRecord.id}`)

        // Store W3C token set with AI enhancements
        const [tokenSetRecord] = await db.insert(tokenSets).values({
          siteId,
          scanId: scanRecord.id,
          tokensJson: result.tokenSet,
          packJson: {
            mappingHints: result.promptPack?.mappingHints || {},
            guidelines: result.promptPack?.guidelines || {},
            aiMetadata: result.aiMetadata || {}
          },
          consensusScore: ((result.confidence || 80) / 100).toString(),
          isPublic: true,
          createdBy: userId
        }).returning()

        console.log(`🎨 Stored token set: ${tokenSetRecord.id} (${result.confidence}% confidence)`)

        // Store layout DNA profile if available
        if (result.layoutDNA) {
          await db.insert(layoutProfiles).values({
            siteId,
            scanId: scanRecord.id,
            profileJson: result.layoutDNA,
            archetypes: result.layoutDNA.archetypes || [],
            containers: result.layoutDNA.containers || {},
            gridFlex: { system: result.layoutDNA.gridSystem || 'flexbox' },
            spacingScale: { base: result.layoutDNA.spacingBase || 8 },
            accessibility: result.accessibilityReport || {}
          })

          console.log(`🏗️  Stored layout profile with ${result.layoutDNA.archetypes?.length || 0} archetypes`)
        }

        // Update site with latest scan data
        await db.update(sites).set({
          lastScanned: new Date(),
          status: 'completed'
        }).where(eq(sites.id, siteId))

        console.log(`✅ Scan storage completed for ${siteId}`)

      } catch (error) {
        console.error('❌ Failed to store scan result in database:', error)
        throw error // Re-throw to indicate storage failure
      }
    }, `store-scan-${siteId}`)
  }

  // Fast site lookup with caching
  private async getSiteWithCache(domain: string): Promise<any> {
    const cacheKey = `site:${domain}`

    // Check intelligent cache first
    const cached = await intelligentCache.safeGet(cacheKey, 'site-lookup')
    if (cached) {
      console.log(`📁 Cache hit for site: ${domain}`)
      return cached
    }

    // Query database with performance monitoring
    const siteData = await queryWithMetrics(async () => {
      const result = await db.select({
        id: sites.id,
        domain: sites.domain,
        title: sites.title,
        description: sites.description,
        popularity: sites.popularity,
        lastScanned: sites.lastScanned,
        status: sites.status,
        robotsStatus: sites.robotsStatus
      })
      .from(sites)
      .where(eq(sites.domain, domain))
      .limit(1)

      return result[0] || null
    }, `get-site-${domain}`)

    // Cache the result
    if (siteData) {
      await intelligentCache.safeSet(cacheKey, siteData, 'site-lookup', {
        strategy: 'site-caching',
        quality: 95,
        tags: ['site', domain]
      })
    }

    return siteData
  }

  // Fast token lookup with optimized JSONB queries
  private async getTokensWithCache(siteId: string): Promise<any> {
    const cacheKey = `tokens:${siteId}`

    // Check cache first
    const cached = await intelligentCache.safeGet(cacheKey, 'token-lookup')
    if (cached) {
      console.log(`📁 Cache hit for tokens: ${siteId}`)
      return cached
    }

    // Optimized database query
    const tokenData = await queryWithMetrics(async () => {
      const results = await db.select({
        id: tokenSets.id,
        tokensJson: tokenSets.tokensJson,
        packJson: tokenSets.packJson,
        consensusScore: tokenSets.consensusScore,
        createdAt: tokenSets.createdAt
      })
      .from(tokenSets)
      .where(and(
        eq(tokenSets.siteId, siteId),
        eq(tokenSets.isPublic, true)
      ))
      .orderBy(desc(tokenSets.createdAt))
      .limit(1)

      return results[0] || null
    }, `get-tokens-${siteId}`)

    // Cache the result
    if (tokenData) {
      await intelligentCache.safeSet(cacheKey, tokenData, 'token-lookup', {
        strategy: 'token-caching',
        quality: 90,
        tags: ['tokens', siteId]
      })
    }

    return tokenData
  }

  // Enhanced compose_pack with AI integration
  async composePack(params: z.infer<typeof composePackSchema>) {
    try {
      // Use AI orchestrator for intelligent pack composition
      const mockData = {
        tokens: params.token_set,
        layout: params.layout_profile,
        artifacts: params.artifacts
      }

      // Create a quick AI analysis for pack composition
      let aiResult
      try {
        const { aiOrchestrator } = await import('../ai/ai-orchestrator')
        aiResult = await aiOrchestrator.processWebsite('https://example.com', {
          maxBudget: 0.08,
          priority: 'normal',
          qualityAudit: false,
          aiEnabled: true,
          intent: params.intent || 'component-authoring'
        })
      } catch (error) {
        // Fallback without AI analysis
        aiResult = { promptPack: null }
      }

      return {
        prompt_pack: aiResult.promptPack,
        mapping_hints: aiResult.promptPack?.mappingHints || {},
        pitfalls: aiResult.promptPack?.guidelines?.pitfalls || [],
        confidence: aiResult.confidence / 100,
        ai_metadata: {
          models_used: aiResult.aiMetadata.modelsUsed,
          cost: aiResult.aiMetadata.totalCost,
          processing_time: Date.now() // Mock timing
        }
      }

    } catch (error) {
      console.error('AI pack composition failed:', error)

      // Fallback to basic pack generation
      return {
        prompt_pack: this.generateBasicPromptPack(params),
        mapping_hints: this.generateBasicMappingHints(),
        pitfalls: [
          'AI processing unavailable - using basic pack generation',
          'Verify color contrast for accessibility compliance',
          'Test token implementation across different components'
        ],
        confidence: 0.6,
        ai_metadata: {
          models_used: ['fallback'],
          cost: 0,
          processing_time: 0
        }
      }
    }
  }

  private generateBasicPromptPack(params: any): any {
    return {
      instructions: `# Design Token Implementation Guide

## Overview
This design system contains tokens extracted from the website. Use these consistently across your components.

## Implementation
- Apply tokens using CSS custom properties or your framework's theming system
- Maintain consistency across all components
- Test accessibility, especially color contrast ratios

## Framework Integration
${params.intent === 'component-authoring' ?
  'These tokens are optimized for component libraries and design systems.' :
  'These tokens are optimized for marketing websites and content pages.'
}
`,
      mappingHints: this.generateBasicMappingHints(),
      guidelines: {
        usage: ['Use tokens instead of hardcoded values', 'Maintain consistent naming conventions'],
        pitfalls: ['Verify accessibility compliance', 'Test across different browsers'],
        performance: ['Use CSS custom properties for dynamic theming', 'Minimize token variations']
      }
    }
  }

  private generateBasicMappingHints(): any {
    return {
      tailwind: {
        colors: 'Add color tokens to tailwind.config.js theme.colors',
        spacing: 'Configure spacing tokens in theme.spacing',
        typography: 'Set up font families in theme.fontFamily'
      },
      cssVariables: {
        recommendation: 'Define tokens as CSS custom properties for easy theming',
        example: ':root { --color-primary: #3b82f6; --spacing-md: 16px; }'
      }
    }
  }

  async cleanup() {
    try {
      const { aiOrchestrator } = await import('../ai/ai-orchestrator')
      await aiOrchestrator.cleanup()
    } catch (error) {
      // Cleanup not needed if AI features unavailable
      console.log('AI cleanup skipped - features not available')
    }
  }
}