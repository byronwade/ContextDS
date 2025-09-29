import { aiGateway, type AIRequest, type AIResponse } from './gateway-client'
import { costOptimizer } from './cost-optimizer'
import { embeddingDeduplicator } from './embedding-deduplicator'
import { schemaValidator, TokenPackSchema } from './schema-validator'
import { smartModelSelector } from './smart-model-selector'
import { z } from 'zod'

export interface TwoPhaseConfig {
  compressionThreshold: number // Token count threshold for compression
  maxPhase1Cost: number // Maximum cost for compression phase
  maxPhase2Cost: number // Maximum cost for organization phase
  qualityTarget: number // Minimum quality score target
  fallbackStrategy: 'skip-compression' | 'aggressive-compression' | 'emergency-fallback'
}

export interface PhaseResult {
  phase: 1 | 2
  model: string
  inputSize: number
  outputSize: number
  cost: number
  latency: number
  quality: number
  success: boolean
  error?: string
}

export interface TwoPhaseResult<T> {
  success: boolean
  data?: T
  phases: PhaseResult[]
  totalCost: number
  totalLatency: number
  optimization: {
    tokensReduced: number
    costSaved: number
    qualityMaintained: number
    strategiesUsed: string[]
  }
  fallbackUsed?: boolean
}

const CompressionSchema = z.object({
  summary: z.object({
    totalTokens: z.number(),
    uniqueColors: z.number(),
    typographyFamilies: z.number(),
    spacingValues: z.number(),
    frameworksDetected: z.array(z.string()),
    components: z.array(z.string()),
    confidence: z.number().min(0).max(100)
  }),
  essentials: z.object({
    colors: z.array(z.object({
      value: z.string(),
      usage: z.number(),
      semantic: z.string().optional()
    })).max(20), // Limit to top 20 colors
    typography: z.object({
      families: z.array(z.string()).max(5),
      sizes: z.array(z.string()).max(10),
      weights: z.array(z.number()).max(8)
    }),
    spacing: z.object({
      scale: z.array(z.number()).max(15),
      base: z.number(),
      patterns: z.array(z.string()).max(5)
    }),
    frameworks: z.array(z.object({
      name: z.string(),
      confidence: z.number(),
      evidence: z.array(z.string()).max(3)
    })).max(3)
  }),
  patterns: z.object({
    repeated: z.array(z.string()).max(10),
    outliers: z.array(z.string()).max(5),
    clusters: z.array(z.object({
      theme: z.string(),
      count: z.number(),
      examples: z.array(z.string()).max(3)
    })).max(5)
  }),
  accessibility: z.object({
    contrastIssues: z.number(),
    wcagLevel: z.enum(['A', 'AA', 'AAA', 'fail']).optional(),
    criticalIssues: z.array(z.string()).max(5)
  }).optional(),
  metadata: z.object({
    originalSize: z.number(),
    compressionRatio: z.number(),
    dataQuality: z.number(),
    preservedCritical: z.boolean()
  })
})

export class TwoPhaseProcessor {
  private config: TwoPhaseConfig = {
    compressionThreshold: 200000, // 200K tokens
    maxPhase1Cost: 0.02, // $0.02 max for compression
    maxPhase2Cost: 0.08, // $0.08 max for organization
    qualityTarget: 80, // 80% quality target
    fallbackStrategy: 'skip-compression'
  }

  private processingStats = {
    totalProcessed: 0,
    compressionUsed: 0,
    costSaved: 0,
    qualityMaintained: 0
  }

  // Main two-phase processing method
  async processTokenExtraction(
    extractedData: any,
    options: {
      url: string
      intent?: 'component-authoring' | 'marketing-site'
      priority?: 'low' | 'normal' | 'high' | 'critical'
      budget?: number
      quality?: 'basic' | 'standard' | 'premium'
    }
  ): Promise<TwoPhaseResult<any>> {
    const startTime = Date.now()
    const phases: PhaseResult[] = []

    try {
      // Analyze input size and complexity
      const inputAnalysis = await this.analyzeInput(extractedData)
      const needsCompression = inputAnalysis.tokens > this.config.compressionThreshold

      let processedData = extractedData
      let totalCost = 0

      // Phase 1: Compression (if needed)
      if (needsCompression) {
        const compressionResult = await this.executeCompressionPhase(extractedData, options)
        phases.push(compressionResult)
        totalCost += compressionResult.cost

        if (compressionResult.success && compressionResult.data) {
          processedData = compressionResult.data
        } else if (this.config.fallbackStrategy === 'skip-compression') {
          // Continue with original data
          console.warn('Compression failed, proceeding with original data')
        } else {
          return this.handleCompressionFailure(extractedData, options, phases)
        }
      }

      // Pre-phase optimization: Embedding-based deduplication
      const deduplicationResult = await this.applyDeduplication(processedData)
      if (deduplicationResult.reduction.percentage > 10) {
        processedData = this.applyDeduplicationResults(processedData, deduplicationResult)
      }

      // Phase 2: Organization
      const organizationResult = await this.executeOrganizationPhase(processedData, options)
      phases.push(organizationResult)
      totalCost += organizationResult.cost

      if (!organizationResult.success) {
        return this.handleOrganizationFailure(processedData, options, phases)
      }

      // Validate final result
      const validation = await schemaValidator.validateTokenPack(organizationResult.data)

      if (!validation.valid) {
        // Attempt repair or fallback
        if (validation.repaired && validation.data) {
          organizationResult.data = validation.data
          organizationResult.quality = Math.max(50, organizationResult.quality - 15) // Reduce quality for repairs
        } else {
          return this.handleValidationFailure(extractedData, options, phases, validation.errors)
        }
      }

      const totalLatency = Date.now() - startTime

      // Calculate optimization metrics
      const optimization = this.calculateOptimization(
        extractedData,
        organizationResult.data,
        phases,
        totalCost,
        needsCompression
      )

      // Update processing stats
      this.updateProcessingStats(needsCompression, totalCost, organizationResult.quality)

      return {
        success: true,
        data: organizationResult.data,
        phases,
        totalCost,
        totalLatency,
        optimization,
        fallbackUsed: false
      }

    } catch (error) {
      console.error('Two-phase processing failed:', error)

      // Emergency fallback
      const emergencyData = schemaValidator.createEmergencyFallback('organize-pack', options.url)

      return {
        success: false,
        data: emergencyData,
        phases,
        totalCost: totalCost || 0,
        totalLatency: Date.now() - startTime,
        optimization: {
          tokensReduced: 0,
          costSaved: 0,
          qualityMaintained: 0,
          strategiesUsed: ['emergency-fallback']
        },
        fallbackUsed: true
      }
    }
  }

  // Phase 1: Compression execution
  private async executeCompressionPhase(
    data: any,
    options: any
  ): Promise<PhaseResult & { data?: any }> {
    const startTime = Date.now()

    try {
      // Build compression prompt
      const compressionPrompt = this.buildCompressionPrompt(data, options)

      // Select model for compression (always use cheap model)
      const model = 'gpt-5-nano'

      // Execute compression
      const response = await aiGateway.request({
        prompt: compressionPrompt,
        model,
        schema: CompressionSchema,
        maxTokens: 4096,
        temperature: 0.1,
        metadata: {
          operation: 'compress',
          url: options.url,
          priority: 'normal'
        }
      })

      const latency = Date.now() - startTime

      return {
        phase: 1,
        model,
        inputSize: response.usage.inputTokens,
        outputSize: response.usage.outputTokens,
        cost: response.usage.estimatedCost,
        latency,
        quality: response.metadata.quality,
        success: true,
        data: response.data
      }

    } catch (error) {
      console.error('Compression phase failed:', error)

      return {
        phase: 1,
        model: 'gpt-5-nano',
        inputSize: 0,
        outputSize: 0,
        cost: 0,
        latency: Date.now() - startTime,
        quality: 0,
        success: false,
        error: error instanceof Error ? error.message : 'Compression failed'
      }
    }
  }

  // Phase 2: Organization execution
  private async executeOrganizationPhase(
    data: any,
    options: any
  ): Promise<PhaseResult & { data?: any }> {
    const startTime = Date.now()

    try {
      // Analyze compressed data size
      const dataSize = await costOptimizer.countTokens(JSON.stringify(data))

      // Select optimal model for organization
      const modelRecommendation = await smartModelSelector.selectModel({
        inputSize: dataSize.tokens,
        operation: 'organize-pack',
        priority: options.priority || 'normal',
        budget: options.budget,
        quality: options.quality || 'standard',
        speed: 'normal'
      })

      // Build organization prompt
      const organizationPrompt = this.buildOrganizationPrompt(data, options)

      // Execute organization
      const response = await aiGateway.request({
        prompt: organizationPrompt,
        model: modelRecommendation.model,
        schema: TokenPackSchema,
        maxTokens: 8192,
        temperature: 0.3,
        metadata: {
          operation: 'organize-pack',
          url: options.url,
          priority: options.priority || 'normal'
        }
      })

      const latency = Date.now() - startTime

      return {
        phase: 2,
        model: modelRecommendation.model,
        inputSize: response.usage.inputTokens,
        outputSize: response.usage.outputTokens,
        cost: response.usage.estimatedCost,
        latency,
        quality: response.metadata.quality,
        success: true,
        data: response.data
      }

    } catch (error) {
      console.error('Organization phase failed:', error)

      return {
        phase: 2,
        model: 'unknown',
        inputSize: 0,
        outputSize: 0,
        cost: 0,
        latency: Date.now() - startTime,
        quality: 0,
        success: false,
        error: error instanceof Error ? error.message : 'Organization failed'
      }
    }
  }

  // Input analysis for determining processing strategy
  private async analyzeInput(data: any): Promise<{
    tokens: number
    complexity: 'simple' | 'moderate' | 'complex' | 'extreme'
    compressibility: number
    criticalElements: string[]
  }> {
    const jsonString = JSON.stringify(data, null, 2)
    const tokenCount = await costOptimizer.countTokens(jsonString)

    // Analyze data structure complexity
    const complexity = this.assessDataComplexity(data)

    // Estimate compressibility
    const compressibility = this.estimateCompressibility(data)

    // Identify critical elements
    const criticalElements = this.identifyCriticalElements(data)

    return {
      tokens: tokenCount.tokens,
      complexity,
      compressibility,
      criticalElements
    }
  }

  private assessDataComplexity(data: any): 'simple' | 'moderate' | 'complex' | 'extreme' {
    let complexityScore = 0

    // Count nested levels
    const maxDepth = this.getObjectDepth(data)
    complexityScore += Math.min(20, maxDepth * 3)

    // Count array sizes
    const arrayInfo = this.analyzeArraySizes(data)
    complexityScore += Math.min(30, arrayInfo.totalItems / 100)

    // Check for framework mixing
    if (data.frameworks?.detected?.length > 2) {
      complexityScore += 15
    }

    // Check for accessibility complexity
    if (data.accessibility?.violations?.length > 20) {
      complexityScore += 15
    }

    // Check for brand/component variety
    if (data.components && Object.keys(data.components).length > 10) {
      complexityScore += 10
    }

    if (complexityScore >= 70) return 'extreme'
    if (complexityScore >= 50) return 'complex'
    if (complexityScore >= 25) return 'moderate'
    return 'simple'
  }

  private estimateCompressibility(data: any): number {
    let compressibilityScore = 50 // Base compressibility

    // High repetition = high compressibility
    const stringifiedData = JSON.stringify(data)
    const uniqueSubstrings = new Set()
    const allSubstrings = stringifiedData.match(/.{10}/g) || []

    allSubstrings.forEach(substring => uniqueSubstrings.add(substring))

    const repetitionRatio = 1 - (uniqueSubstrings.size / allSubstrings.length)
    compressibilityScore += repetitionRatio * 40

    // Large arrays = high compressibility
    const arrayInfo = this.analyzeArraySizes(data)
    if (arrayInfo.largestArray > 50) {
      compressibilityScore += 20
    }

    // CSS-heavy data = high compressibility
    if (stringifiedData.includes('css') || stringifiedData.includes('styles')) {
      compressibilityScore += 15
    }

    return Math.min(95, compressibilityScore)
  }

  private identifyCriticalElements(data: any): string[] {
    const critical: string[] = []

    // Always preserve core design tokens
    if (data.colors) critical.push('colors')
    if (data.typography) critical.push('typography')
    if (data.spacing) critical.push('spacing')

    // Preserve high-confidence or high-usage items
    if (data.accessibility?.violations) critical.push('accessibility')
    if (data.frameworks?.detected) critical.push('frameworks')

    // Preserve unique or high-value insights
    if (data.brand?.identity) critical.push('brand')
    if (data.layoutDNA) critical.push('layoutDNA')

    return critical
  }

  // Build compression-specific prompts
  private buildCompressionPrompt(data: any, options: any): string {
    const analysis = this.analyzeDataForCompression(data)

    return `Compress this design analysis data while preserving essential design patterns and tokens:

DATA ANALYSIS:
- Total data size: ${analysis.estimatedSize} tokens
- Key patterns: ${analysis.keyPatterns.join(', ')}
- Critical elements: ${analysis.criticalElements.join(', ')}
- Compressibility: ${analysis.compressibility}%

RAW DATA:
${JSON.stringify(data, null, 2)}

COMPRESSION REQUIREMENTS:
1. Reduce token count by 70-80% while preserving design token accuracy
2. Summarize repetitive CSS data into patterns and ranges
3. Keep top 20 colors by usage, top 10 typography values, top 15 spacing values
4. Preserve framework detection evidence (top 3 frameworks max)
5. Maintain accessibility-critical information (top 5 contrast issues)
6. Compress component analysis to key patterns only
7. Preserve brand identity elements and unique insights

OUTPUT FORMAT:
Return compressed JSON matching the compression schema with:
- summary: High-level statistics and findings
- essentials: Core design tokens and patterns (top items only)
- patterns: Repeated patterns, outliers, and clusters
- accessibility: Critical accessibility information
- metadata: Compression statistics

Focus on preserving design token generation accuracy while maximizing token reduction.`
  }

  private buildOrganizationPrompt(compressedData: any, options: any): string {
    const intent = options.intent || 'component-authoring'
    const url = options.url

    return `Organize these compressed design tokens into a comprehensive, production-ready design system:

COMPRESSED DATA:
${JSON.stringify(compressedData, null, 2)}

CONTEXT:
- Website: ${url}
- Intent: ${intent}
- Target: Developer-friendly design token package

ORGANIZATION REQUIREMENTS:
1. Create semantic token names following best practices (color.primary, spacing.md, etc.)
2. Organize tokens by category with consistent naming conventions
3. Generate Tailwind CSS configuration mappings
4. Provide framework-specific integration guidance
5. Include accessibility recommendations and compliance notes
6. Add usage guidelines and common pitfalls
7. Suggest performance optimizations
8. Maintain W3C design token format compatibility

QUALITY STANDARDS:
- All color tokens must have valid hex/rgb/hsl values
- Typography tokens must specify font families and valid CSS values
- Spacing tokens must use consistent units (px/rem/em)
- Include confidence scores for all tokens
- Provide actionable implementation guidance

Generate a complete, validated design token package ready for developer use.`
  }

  // Data analysis for compression
  private analyzeDataForCompression(data: any): {
    estimatedSize: number
    keyPatterns: string[]
    criticalElements: string[]
    compressibility: number
  } {
    const jsonString = JSON.stringify(data, null, 2)
    const estimatedTokens = Math.ceil(jsonString.length / 4)

    const keyPatterns: string[] = []
    const criticalElements: string[] = []

    // Identify key patterns
    if (data.colors?.length > 10) keyPatterns.push(`${data.colors.length} colors`)
    if (data.typography?.families?.length > 3) keyPatterns.push(`${data.typography.families.length} font families`)
    if (data.spacing?.scale?.length > 10) keyPatterns.push(`${data.spacing.scale.length} spacing values`)
    if (data.components) keyPatterns.push('component patterns detected')
    if (data.frameworks?.detected?.length > 0) keyPatterns.push(`${data.frameworks.detected.length} frameworks`)

    // Identify critical elements
    if (data.colors) criticalElements.push('colors')
    if (data.typography) criticalElements.push('typography')
    if (data.accessibility?.violations?.length > 0) criticalElements.push('accessibility')
    if (data.brand) criticalElements.push('brand')

    const compressibility = this.estimateCompressibility(data)

    return {
      estimatedSize: estimatedTokens,
      keyPatterns,
      criticalElements,
      compressibility
    }
  }

  // Apply embedding deduplication results
  private applyDeduplicationResults(data: any, deduplication: any): any {
    const optimized = { ...data }

    // Replace original tokens with deduplicated versions
    if (deduplication.deduplicated && Array.isArray(deduplication.deduplicated)) {
      // Group deduplicated tokens by type
      const tokensByType = deduplication.deduplicated.reduce((groups: any, token: any) => {
        if (!groups[token.type]) groups[token.type] = []
        groups[token.type].push(token)
        return groups
      }, {})

      // Update data with deduplicated tokens
      Object.entries(tokensByType).forEach(([type, tokens]) => {
        if (optimized[type]) {
          optimized[type] = tokens
        }
      })
    }

    // Add deduplication metadata
    optimized._deduplication = {
      applied: true,
      reduction: deduplication.reduction,
      duplicatesFound: deduplication.duplicates?.length || 0,
      clustersCreated: deduplication.clusters?.length || 0
    }

    return optimized
  }

  // Error handling strategies
  private async handleCompressionFailure(
    originalData: any,
    options: any,
    phases: PhaseResult[]
  ): Promise<TwoPhaseResult<any>> {
    switch (this.config.fallbackStrategy) {
      case 'aggressive-compression':
        // Try deterministic compression
        const compressed = costOptimizer.deterministicCompress(originalData)
        const orgResult = await this.executeOrganizationPhase(compressed, options)
        phases.push(orgResult)

        return {
          success: orgResult.success,
          data: orgResult.data,
          phases,
          totalCost: phases.reduce((sum, p) => sum + p.cost, 0),
          totalLatency: phases.reduce((sum, p) => sum + p.latency, 0),
          optimization: {
            tokensReduced: 0,
            costSaved: 0,
            qualityMaintained: orgResult.quality,
            strategiesUsed: ['deterministic-compression']
          },
          fallbackUsed: true
        }

      case 'emergency-fallback':
        const emergencyData = schemaValidator.createEmergencyFallback('organize-pack', options.url)
        return {
          success: false,
          data: emergencyData,
          phases,
          totalCost: 0,
          totalLatency: 0,
          optimization: {
            tokensReduced: 0,
            costSaved: 0,
            qualityMaintained: 25,
            strategiesUsed: ['emergency-fallback']
          },
          fallbackUsed: true
        }

      default: // skip-compression
        const skipResult = await this.executeOrganizationPhase(originalData, options)
        phases.push(skipResult)

        return {
          success: skipResult.success,
          data: skipResult.data,
          phases,
          totalCost: skipResult.cost,
          totalLatency: skipResult.latency,
          optimization: {
            tokensReduced: 0,
            costSaved: 0,
            qualityMaintained: skipResult.quality,
            strategiesUsed: ['skip-compression']
          },
          fallbackUsed: true
        }
    }
  }

  private async handleOrganizationFailure(
    data: any,
    options: any,
    phases: PhaseResult[]
  ): Promise<TwoPhaseResult<any>> {
    // Try with different model or simplified prompt
    const fallbackResult = await this.executeOrganizationFallback(data, options)
    phases.push(fallbackResult)

    return {
      success: fallbackResult.success,
      data: fallbackResult.data || schemaValidator.createEmergencyFallback('organize-pack', options.url),
      phases,
      totalCost: phases.reduce((sum, p) => sum + p.cost, 0),
      totalLatency: phases.reduce((sum, p) => sum + p.latency, 0),
      optimization: {
        tokensReduced: 0,
        costSaved: 0,
        qualityMaintained: fallbackResult.quality,
        strategiesUsed: ['organization-fallback']
      },
      fallbackUsed: true
    }
  }

  private async handleValidationFailure(
    originalData: any,
    options: any,
    phases: PhaseResult[],
    validationErrors: any[]
  ): Promise<TwoPhaseResult<any>> {
    console.warn('Validation failed with errors:', validationErrors)

    // Create emergency fallback with validation errors logged
    const emergencyData = {
      ...schemaValidator.createEmergencyFallback('organize-pack', options.url),
      _validationErrors: validationErrors,
      _originalDataPreserved: true
    }

    return {
      success: false,
      data: emergencyData,
      phases,
      totalCost: phases.reduce((sum, p) => sum + p.cost, 0),
      totalLatency: phases.reduce((sum, p) => sum + p.latency, 0),
      optimization: {
        tokensReduced: 0,
        costSaved: 0,
        qualityMaintained: 25,
        strategiesUsed: ['validation-fallback']
      },
      fallbackUsed: true
    }
  }

  private async executeOrganizationFallback(data: any, options: any): Promise<PhaseResult & { data?: any }> {
    const startTime = Date.now()

    try {
      // Use simplest model with basic prompt
      const simplifiedPrompt = `Convert to design tokens: ${JSON.stringify(data).substring(0, 5000)}`

      const response = await aiGateway.request({
        prompt: simplifiedPrompt,
        model: 'gpt-5-mini',
        maxTokens: 4096,
        temperature: 0.1,
        metadata: {
          operation: 'fallback-organize',
          url: options.url,
          priority: 'low'
        }
      })

      return {
        phase: 2,
        model: 'gpt-5-mini',
        inputSize: response.usage.inputTokens,
        outputSize: response.usage.outputTokens,
        cost: response.usage.estimatedCost,
        latency: Date.now() - startTime,
        quality: 60, // Reduced quality for fallback
        success: true,
        data: response.data
      }

    } catch (error) {
      return {
        phase: 2,
        model: 'gpt-5-mini',
        inputSize: 0,
        outputSize: 0,
        cost: 0,
        latency: Date.now() - startTime,
        quality: 0,
        success: false,
        error: error instanceof Error ? error.message : 'Fallback failed'
      }
    }
  }

  // Optimization calculation
  private calculateOptimization(
    original: any,
    final: any,
    phases: PhaseResult[],
    totalCost: number,
    compressionUsed: boolean
  ): {
    tokensReduced: number
    costSaved: number
    qualityMaintained: number
    strategiesUsed: string[]
  } {
    const originalSize = JSON.stringify(original).length
    const finalSize = JSON.stringify(final).length

    // Estimate tokens reduced
    const tokensReduced = compressionUsed ? Math.max(0, Math.ceil((originalSize - finalSize) / 4)) : 0

    // Estimate cost saved through compression
    const costSaved = compressionUsed ? tokensReduced * 0.0000025 : 0 // Rough estimate

    // Calculate quality maintained
    const qualityMaintained = phases.length > 0
      ? phases.reduce((sum, p) => sum + p.quality, 0) / phases.length
      : 0

    // List strategies used
    const strategiesUsed = phases.map(p => `phase-${p.phase}-${p.model}`)
    if (compressionUsed) strategiesUsed.unshift('compression')

    return {
      tokensReduced,
      costSaved,
      qualityMaintained,
      strategiesUsed
    }
  }

  // Analytics and utilities
  private updateProcessingStats(compressionUsed: boolean, cost: number, quality: number): void {
    this.processingStats.totalProcessed++
    if (compressionUsed) this.processingStats.compressionUsed++
    this.processingStats.costSaved += compressionUsed ? 0.02 : 0 // Rough estimate
    this.processingStats.qualityMaintained = (this.processingStats.qualityMaintained * (this.processingStats.totalProcessed - 1) + quality) / this.processingStats.totalProcessed
  }

  private getObjectDepth(obj: any, depth: number = 0): number {
    if (obj === null || typeof obj !== 'object') return depth

    const depths = Object.values(obj).map(value => this.getObjectDepth(value, depth + 1))
    return Math.max(depth, ...depths)
  }

  private analyzeArraySizes(obj: any): { totalItems: number; largestArray: number; arrayCount: number } {
    let totalItems = 0
    let largestArray = 0
    let arrayCount = 0

    const traverse = (current: any) => {
      if (Array.isArray(current)) {
        arrayCount++
        totalItems += current.length
        largestArray = Math.max(largestArray, current.length)
        current.forEach(item => traverse(item))
      } else if (typeof current === 'object' && current !== null) {
        Object.values(current).forEach(value => traverse(value))
      }
    }

    traverse(obj)

    return { totalItems, largestArray, arrayCount }
  }

  // Apply deduplication before processing
  private async applyDeduplication(data: any): Promise<any> {
    try {
      if (!data.colors && !data.typography && !data.spacing) {
        return { reduction: { percentage: 0 } } // No tokens to deduplicate
      }

      // Convert data to token format for deduplication
      const tokens: any[] = []

      if (data.colors) {
        data.colors.forEach((color: any, index: number) => {
          tokens.push({
            id: `color-${index}`,
            name: color.name || `color-${index}`,
            value: color.value || color,
            type: 'color',
            usage: color.usage || 1,
            confidence: color.confidence || 50,
            source: 'extraction'
          })
        })
      }

      if (data.typography) {
        if (data.typography.families) {
          data.typography.families.forEach((font: any, index: number) => {
            tokens.push({
              id: `font-${index}`,
              name: font.name || `font-${index}`,
              value: font.family || font,
              type: 'typography',
              usage: font.usage || 1,
              confidence: font.confidence || 50,
              source: 'extraction'
            })
          })
        }
      }

      if (tokens.length === 0) {
        return { reduction: { percentage: 0 } }
      }

      // Apply deduplication
      return await embeddingDeduplicator.deduplicateTokens(tokens)

    } catch (error) {
      console.warn('Deduplication failed:', error)
      return { reduction: { percentage: 0 } }
    }
  }

  // Configuration management
  updateConfig(newConfig: Partial<TwoPhaseConfig>): void {
    this.config = { ...this.config, ...newConfig }
  }

  getProcessingStats(): typeof this.processingStats {
    return { ...this.processingStats }
  }

  // Quality assurance with Claude audit (expensive but thorough)
  async qualityAudit(
    tokenPack: any,
    originalData: any,
    options: { critical?: boolean; budget?: number } = {}
  ): Promise<{ auditResult: any; cost: number; recommendations: string[] }> {
    try {
      // Only use expensive audit for critical operations or when budget allows
      if (!options.critical && options.budget && options.budget < 0.15) {
        return {
          auditResult: { overall: { score: 75, status: 'good', summary: 'Budget audit skipped' } },
          cost: 0,
          recommendations: ['Consider premium audit for critical operations']
        }
      }

      const auditPrompt = `Audit this design token pack for quality, consistency, and accuracy:

TOKEN PACK:
${JSON.stringify(tokenPack, null, 2)}

ORIGINAL DATA SAMPLE:
${JSON.stringify(originalData, null, 2).substring(0, 5000)}

AUDIT FOCUS:
1. Token naming consistency and semantic accuracy
2. Value accuracy and proper formatting
3. Accessibility compliance and contrast ratios
4. Missing tokens or gaps in the system
5. Implementation guidance quality
6. Framework mapping accuracy
7. Overall design system maturity

Provide a comprehensive audit with actionable recommendations.`

      const response = await aiGateway.request({
        prompt: auditPrompt,
        model: 'claude-3.7-sonnet', // Premium model for audits
        schema: AuditSchema,
        metadata: {
          operation: 'audit',
          priority: options.critical ? 'critical' : 'high'
        }
      })

      return {
        auditResult: response.data,
        cost: response.usage.estimatedCost,
        recommendations: response.data.recommendations?.map((r: any) => r.description) || []
      }

    } catch (error) {
      console.error('Quality audit failed:', error)

      return {
        auditResult: {
          overall: { score: 50, status: 'needs-improvement', summary: 'Audit failed - manual review needed' },
          categories: {},
          recommendations: [],
          redFlags: ['Automated audit failed']
        },
        cost: 0,
        recommendations: ['Manual quality review recommended']
      }
    }
  }
}

// Global processor instance
export const twoPhaseProcessor = new TwoPhaseProcessor()

// Convenience functions
export async function processTokens(
  extractedData: any,
  url: string,
  options: {
    intent?: 'component-authoring' | 'marketing-site'
    budget?: number
    quality?: 'basic' | 'standard' | 'premium'
    audit?: boolean
  } = {}
): Promise<TwoPhaseResult<any>> {
  const result = await twoPhaseProcessor.processTokenExtraction(extractedData, {
    url,
    ...options
  })

  // Optional quality audit for premium operations
  if (options.audit && result.success && result.data) {
    const audit = await twoPhaseProcessor.qualityAudit(result.data, extractedData, {
      critical: options.quality === 'premium'
    })

    result.data._audit = audit.auditResult
    result.totalCost += audit.cost
  }

  return result
}

export async function compressOnly(data: any): Promise<any> {
  try {
    const compressed = await costOptimizer.compressExtractedData(data)
    return compressed.compressed
  } catch (error) {
    console.warn('Compression failed, using deterministic fallback:', error)
    return costOptimizer.deterministicCompress(data)
  }
}