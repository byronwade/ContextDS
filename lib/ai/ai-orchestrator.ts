import { AdvancedExtractor, type ComprehensiveScanResult } from '../extractors/advanced-extractor'
import { FallbackOrchestrator } from '../extractors/fallback-orchestrator'
import { twoPhaseProcessor, type TwoPhaseResult } from './two-phase-processor'
import { embeddingDeduplicator } from './embedding-deduplicator'
import { aiGateway } from './gateway-client'
import { smartModelSelector } from './smart-model-selector'
import { schemaValidator } from './schema-validator'
import { gatewayCache } from './gateway-cache'
import { aiObservability, recordAIOperation } from './observability'
import type { W3CTokenSet } from '../analyzers/token-generator'

export interface ContextDSPipeline {
  url: string
  options: PipelineOptions
  progress: PipelineProgress
  result?: ContextDSResult
  error?: string
}

export interface PipelineOptions {
  // Scanning options
  extractionStrategies: string[]
  fallbacksEnabled: boolean
  maxRetries: number

  // AI processing options
  aiEnabled: boolean
  compressionThreshold: number
  deduplicationEnabled: boolean
  qualityAudit: boolean

  // Budget constraints
  maxBudget: number
  priority: 'low' | 'normal' | 'high' | 'critical'

  // Quality targets
  qualityTarget: number
  intent: 'component-authoring' | 'marketing-site'

  // Performance settings
  cacheEnabled: boolean
  backgroundProcessing: boolean
}

export interface PipelineProgress {
  phase: 'extraction' | 'ai-processing' | 'validation' | 'optimization' | 'completed' | 'failed'
  overallProgress: number
  currentStep: string
  timeElapsed: number
  estimatedTimeRemaining: number
  costs: {
    extraction: number
    aiProcessing: number
    total: number
  }
  metrics: {
    tokensExtracted: number
    strategiesCompleted: number
    fallbacksUsed: number
    cacheHits: number
  }
}

export interface ContextDSResult {
  // Core results
  tokenSet: W3CTokenSet
  layoutDNA: any
  brandAnalysis: any
  accessibilityReport: any

  // AI-enhanced results
  promptPack: any
  researchInsights?: any
  qualityAudit?: any

  // Metadata
  extractionMetadata: {
    strategiesUsed: string[]
    fallbacksTriggered: string[]
    dataQuality: number
    extractionTime: number
  }

  aiMetadata: {
    modelsUsed: string[]
    totalCost: number
    compressionUsed: boolean
    deduplicationApplied: boolean
    cacheHitRate: number
  }

  // Quality scores
  confidence: number
  completeness: number
  reliability: number
}

export class AIOrchestrator {
  private extractor = new AdvancedExtractor()
  private fallbackOrchestrator = new FallbackOrchestrator()
  private activePipelines = new Map<string, ContextDSPipeline>()

  // Main processing pipeline with full AI integration
  async processWebsite(
    url: string,
    options: Partial<PipelineOptions> = {},
    progressCallback?: (progress: PipelineProgress) => void
  ): Promise<ContextDSResult> {
    const pipelineId = `pipeline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const startTime = Date.now()

    // Initialize pipeline
    const pipeline: ContextDSPipeline = {
      url,
      options: this.mergeDefaultOptions(options),
      progress: {
        phase: 'extraction',
        overallProgress: 0,
        currentStep: 'Initializing extraction...',
        timeElapsed: 0,
        estimatedTimeRemaining: 120000, // 2 minutes estimate
        costs: { extraction: 0, aiProcessing: 0, total: 0 },
        metrics: { tokensExtracted: 0, strategiesCompleted: 0, fallbacksUsed: 0, cacheHits: 0 }
      }
    }

    this.activePipelines.set(pipelineId, pipeline)

    try {
      // Phase 1: Advanced Extraction
      const extractionResult = await this.executeExtractionPhase(pipeline, progressCallback)

      // Phase 2: AI Processing (if enabled)
      let aiResult: TwoPhaseResult<any> | null = null
      if (pipeline.options.aiEnabled) {
        aiResult = await this.executeAIProcessingPhase(pipeline, extractionResult, progressCallback)
      }

      // Phase 3: Validation and Optimization
      const finalResult = await this.executeValidationPhase(pipeline, extractionResult, aiResult, progressCallback)

      // Update final progress
      pipeline.progress.phase = 'completed'
      pipeline.progress.overallProgress = 100
      pipeline.progress.timeElapsed = Date.now() - startTime
      progressCallback?.(pipeline.progress)

      return finalResult

    } catch (error) {
      pipeline.progress.phase = 'failed'
      pipeline.error = error instanceof Error ? error.message : 'Pipeline failed'
      progressCallback?.(pipeline.progress)

      console.error(`Pipeline ${pipelineId} failed:`, error)
      throw error

    } finally {
      this.activePipelines.delete(pipelineId)
    }
  }

  // Phase 1: Advanced Extraction with Fallbacks
  private async executeExtractionPhase(
    pipeline: ContextDSPipeline,
    progressCallback?: (progress: PipelineProgress) => void
  ): Promise<ComprehensiveScanResult> {
    pipeline.progress.phase = 'extraction'
    pipeline.progress.currentStep = 'Starting comprehensive scan...'
    progressCallback?.(pipeline.progress)

    try {
      // Execute comprehensive scan with progress updates
      const result = await this.extractor.comprehensiveScan(
        pipeline.url,
        {
          includeComputed: true,
          analyzeComponents: true,
          extractBrand: true,
          analyzeAccessibility: true,
          detectFrameworks: true,
          captureScreenshots: true,
          followInternalLinks: true,
          maxPages: 5,
          timeout: 30000,
          retryAttempts: pipeline.options.maxRetries
        },
        (step: string, progress: number) => {
          pipeline.progress.currentStep = step
          pipeline.progress.overallProgress = progress * 0.4 // Extraction is 40% of total
          pipeline.progress.metrics.strategiesCompleted = Math.floor(progress / 10)
          progressCallback?.(pipeline.progress)
        }
      )

      // Handle failures with fallback orchestrator
      if (result.status !== 'completed') {
        const failedStrategies = result.strategies.filter(s => !s.success)

        if (pipeline.options.fallbacksEnabled && failedStrategies.length > 0) {
          pipeline.progress.currentStep = 'Applying fallback strategies...'
          progressCallback?.(pipeline.progress)

          const recoveredResults = await this.fallbackOrchestrator.handleFailures(
            failedStrategies,
            {
              url: pipeline.url,
              domain: new URL(pipeline.url).hostname,
              userAgent: 'ContextDS/1.0',
              viewports: [{ width: 1280, height: 720, name: 'desktop' }],
              options: { includeComputed: true, timeout: 30000, retryAttempts: 2 },
              cache: new Map(),
              progress: (step: string) => {
                pipeline.progress.currentStep = step
                progressCallback?.(pipeline.progress)
              }
            }
          )

          // Merge recovered results
          result.strategies.push(...recoveredResults)
          pipeline.progress.metrics.fallbacksUsed = recoveredResults.length
        }
      }

      pipeline.progress.overallProgress = 40
      pipeline.progress.currentStep = 'Extraction completed'
      progressCallback?.(pipeline.progress)

      return result

    } catch (error) {
      console.error('Extraction phase failed:', error)
      throw new Error(`Extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  // Phase 2: AI Processing with Cost Optimization
  private async executeAIProcessingPhase(
    pipeline: ContextDSPipeline,
    extractionResult: ComprehensiveScanResult,
    progressCallback?: (progress: PipelineProgress) => void
  ): Promise<TwoPhaseResult<any>> {
    pipeline.progress.phase = 'ai-processing'
    pipeline.progress.currentStep = 'Analyzing extracted data...'
    pipeline.progress.overallProgress = 45
    progressCallback?.(pipeline.progress)

    try {
      // Step 1: Prepare data for AI processing
      const extractedData = extractionResult.aggregatedData

      // Step 2: Apply deduplication if enabled
      let processedData = extractedData
      if (pipeline.options.deduplicationEnabled) {
        pipeline.progress.currentStep = 'Deduplicating tokens...'
        pipeline.progress.overallProgress = 50
        progressCallback?.(pipeline.progress)

        const deduplicationResult = await this.applyIntelligentDeduplication(extractedData)
        if (deduplicationResult.reduction.percentage > 5) {
          processedData = this.mergeDeduplicationResults(extractedData, deduplicationResult)
          pipeline.progress.metrics.tokensExtracted = deduplicationResult.deduplicated.length
        }
      }

      // Step 3: Execute two-phase AI processing
      pipeline.progress.currentStep = 'Processing with AI models...'
      pipeline.progress.overallProgress = 60
      progressCallback?.(pipeline.progress)

      const aiResult = await twoPhaseProcessor.processTokenExtraction(processedData, {
        url: pipeline.url,
        intent: pipeline.options.intent,
        priority: pipeline.options.priority,
        budget: pipeline.options.maxBudget * 0.8 // Reserve 20% for audit
      })

      // Update cost tracking
      pipeline.progress.costs.aiProcessing = aiResult.totalCost
      pipeline.progress.costs.total = pipeline.progress.costs.extraction + aiResult.totalCost

      // Step 4: Optional quality audit
      if (pipeline.options.qualityAudit && aiResult.success && pipeline.options.maxBudget > 0.10) {
        pipeline.progress.currentStep = 'Performing quality audit...'
        pipeline.progress.overallProgress = 80
        progressCallback?.(pipeline.progress)

        const auditResult = await twoPhaseProcessor.qualityAudit(
          aiResult.data,
          extractedData,
          { critical: pipeline.options.priority === 'critical' }
        )

        aiResult.data._qualityAudit = auditResult.auditResult
        pipeline.progress.costs.aiProcessing += auditResult.cost
        pipeline.progress.costs.total += auditResult.cost
      }

      pipeline.progress.overallProgress = 85
      pipeline.progress.currentStep = 'AI processing completed'
      progressCallback?.(pipeline.progress)

      return aiResult

    } catch (error) {
      console.error('AI processing phase failed:', error)

      // Record AI operation failure
      await recordAIOperation(
        'full-pipeline',
        'unknown',
        { inputTokens: 0, outputTokens: 0, cost: 0 },
        { latency: Date.now() - Date.now(), cacheHit: false },
        { score: 0, confidence: 0, validationPassed: false },
        { url: pipeline.url, requestId: pipeline.progress.currentStep },
        { success: false, error: error instanceof Error ? error.message : 'AI processing failed' }
      )

      throw new Error(`AI processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  // Phase 3: Validation and Final Optimization
  private async executeValidationPhase(
    pipeline: ContextDSPipeline,
    extractionResult: ComprehensiveScanResult,
    aiResult: TwoPhaseResult<any> | null,
    progressCallback?: (progress: PipelineProgress) => void
  ): Promise<ContextDSResult> {
    pipeline.progress.phase = 'validation'
    pipeline.progress.currentStep = 'Validating results...'
    pipeline.progress.overallProgress = 90
    progressCallback?.(pipeline.progress)

    try {
      // Validate AI-generated token pack
      let finalTokenSet: any = {}
      let promptPack: any = {}
      let aiMetadata: any = {}

      if (aiResult?.success && aiResult.data) {
        const validation = await schemaValidator.validateTokenPack(aiResult.data)

        if (validation.valid && validation.data) {
          finalTokenSet = validation.data
          promptPack = finalTokenSet.mappingHints || {}

          aiMetadata = {
            modelsUsed: aiResult.phases.map(p => p.model),
            totalCost: aiResult.totalCost,
            compressionUsed: aiResult.phases.some(p => p.model === 'gpt-5-nano'),
            deduplicationApplied: aiResult.optimization.tokensReduced > 0,
            cacheHitRate: 0 // Would calculate from actual cache usage
          }
        } else {
          // Use emergency fallback
          console.warn('AI result validation failed, using emergency fallback')
          finalTokenSet = schemaValidator.createEmergencyFallback('organize-pack', pipeline.url)
          aiMetadata = { modelsUsed: ['emergency-fallback'], totalCost: 0, compressionUsed: false, deduplicationApplied: false, cacheHitRate: 0 }
        }
      } else {
        // No AI result - create basic token set from extraction
        finalTokenSet = this.createBasicTokenSetFromExtraction(extractionResult)
        aiMetadata = { modelsUsed: ['none'], totalCost: 0, compressionUsed: false, deduplicationApplied: false, cacheHitRate: 0 }
      }

      // Create comprehensive result
      const result: ContextDSResult = {
        tokenSet: finalTokenSet,
        layoutDNA: extractionResult.aggregatedData.layout || {},
        brandAnalysis: extractionResult.aggregatedData.brand || {},
        accessibilityReport: extractionResult.aggregatedData.accessibility || {},

        promptPack,
        researchInsights: aiResult?.data?._research,
        qualityAudit: aiResult?.data?._qualityAudit,

        extractionMetadata: {
          strategiesUsed: extractionResult.metadata.strategiesUsed,
          fallbacksTriggered: extractionResult.metadata.fallbacksTriggered,
          dataQuality: extractionResult.metadata.dataQuality,
          extractionTime: extractionResult.metadata.duration
        },

        aiMetadata,

        confidence: this.calculateOverallConfidence(extractionResult, aiResult),
        completeness: this.calculateCompleteness(extractionResult, aiResult),
        reliability: this.calculateReliability(extractionResult, aiResult)
      }

      // Record successful operation
      if (aiResult) {
        await recordAIOperation(
          'full-pipeline',
          aiResult.phases[aiResult.phases.length - 1]?.model || 'unknown',
          {
            inputTokens: aiResult.phases.reduce((sum, p) => sum + p.inputSize, 0),
            outputTokens: aiResult.phases.reduce((sum, p) => sum + p.outputSize, 0),
            cost: aiResult.totalCost
          },
          {
            latency: aiResult.totalLatency,
            cacheHit: aiResult.optimization.strategiesUsed.includes('cache')
          },
          {
            score: result.confidence,
            confidence: result.confidence,
            validationPassed: true
          },
          {
            url: pipeline.url,
            requestId: pipelineId
          },
          {
            success: true,
            retryCount: extractionResult.metadata.fallbacksTriggered.length
          }
        )
      }

      pipeline.progress.phase = 'completed'
      pipeline.progress.overallProgress = 100
      pipeline.progress.currentStep = 'Pipeline completed successfully'
      pipeline.result = result
      progressCallback?.(pipeline.progress)

      return result

    } catch (error) {
      console.error('Validation phase failed:', error)
      throw new Error(`Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  // Apply intelligent deduplication with embeddings
  private async applyIntelligentDeduplication(data: any): Promise<any> {
    try {
      // Convert extraction data to token format
      const tokens: any[] = []

      // Extract colors
      if (data.tokens?.colors?.palette) {
        data.tokens.colors.palette.forEach((color: any, index: number) => {
          tokens.push({
            id: `color-${index}`,
            name: color.semantic || `color-${index}`,
            value: color.color,
            type: 'color',
            usage: color.usage,
            confidence: 80,
            source: 'extraction'
          })
        })
      }

      // Extract typography
      if (data.tokens?.typography?.families) {
        data.tokens.typography.families.forEach((font: any, index: number) => {
          tokens.push({
            id: `font-${index}`,
            name: font.name || `font-${index}`,
            value: font.family,
            type: 'typography',
            usage: font.usage,
            confidence: 75,
            source: 'extraction'
          })
        })
      }

      // Extract spacing
      if (data.tokens?.spacing?.scale) {
        data.tokens.spacing.scale.forEach((space: any, index: number) => {
          tokens.push({
            id: `space-${index}`,
            name: `space-${index}`,
            value: `${space}px`,
            type: 'spacing',
            usage: space.usage || 1,
            confidence: 70,
            source: 'extraction'
          })
        })
      }

      if (tokens.length === 0) {
        return { reduction: { percentage: 0 }, deduplicated: [] }
      }

      // Apply embedding-based deduplication
      return await embeddingDeduplicator.deduplicateTokens(tokens)

    } catch (error) {
      console.warn('Deduplication failed:', error)
      return { reduction: { percentage: 0 }, deduplicated: [] }
    }
  }

  private mergeDeduplicationResults(originalData: any, deduplication: any): any {
    const merged = { ...originalData }

    if (deduplication.deduplicated && deduplication.deduplicated.length > 0) {
      // Group deduplicated tokens by type
      const tokensByType = deduplication.deduplicated.reduce((groups: any, token: any) => {
        if (!groups[token.type]) groups[token.type] = []
        groups[token.type].push(token)
        return groups
      }, {})

      // Update original data structure
      if (tokensByType.color && merged.tokens?.colors) {
        merged.tokens.colors.palette = tokensByType.color.map((token: any) => ({
          color: token.value,
          usage: token.usage,
          semantic: token.name
        }))
      }

      // Add deduplication metadata
      merged._deduplication = {
        applied: true,
        originalCount: deduplication.original.length,
        deduplicatedCount: deduplication.deduplicated.length,
        reduction: deduplication.reduction,
        duplicateGroups: deduplication.duplicates.length,
        clusters: deduplication.clusters.length
      }
    }

    return merged
  }

  // Create basic token set from extraction when AI is disabled
  private createBasicTokenSetFromExtraction(extraction: ComprehensiveScanResult): W3CTokenSet {
    const tokenSet: W3CTokenSet = {
      $schema: 'https://design-tokens.github.io/community-group/format/',
      $metadata: {
        name: extraction.domain,
        version: '1.0.0',
        generatedAt: new Date().toISOString(),
        source: {
          url: extraction.url,
          extractedAt: extraction.metadata.finishedAt
        },
        tools: {
          extractor: 'contextds-advanced-extractor',
          analyzer: 'deterministic-analysis',
          generator: 'basic-token-generator'
        }
      }
    }

    // Convert colors
    if (extraction.aggregatedData.tokens?.colors?.palette) {
      tokenSet.color = {}
      extraction.aggregatedData.tokens.colors.palette.slice(0, 20).forEach((color: any, index: number) => {
        tokenSet.color![`color-${index + 1}`] = {
          $type: 'color',
          $value: color.color,
          $description: `Color extracted from ${extraction.domain}`,
          $extensions: {
            'contextds.usage': color.usage,
            'contextds.confidence': 75,
            'contextds.source': 'deterministic-extraction'
          }
        }
      })
    }

    // Convert typography
    if (extraction.aggregatedData.tokens?.typography?.families) {
      tokenSet.typography = {}
      extraction.aggregatedData.tokens.typography.families.slice(0, 5).forEach((font: any, index: number) => {
        tokenSet.typography![`font-${index + 1}`] = {
          $type: 'fontFamily',
          $value: [font.family],
          $description: `Font family from ${extraction.domain}`,
          $extensions: {
            'contextds.usage': font.usage,
            'contextds.confidence': 70,
            'contextds.source': 'deterministic-extraction'
          }
        }
      })
    }

    // Convert spacing
    if (extraction.aggregatedData.tokens?.spacing?.scale) {
      tokenSet.dimension = {}
      extraction.aggregatedData.tokens.spacing.scale.slice(0, 15).forEach((space: number, index: number) => {
        tokenSet.dimension![`space-${index + 1}`] = {
          $type: 'dimension',
          $value: `${space}px`,
          $description: `Spacing value from ${extraction.domain}`,
          $extensions: {
            'contextds.usage': 1,
            'contextds.confidence': 65,
            'contextds.source': 'deterministic-extraction'
          }
        }
      })
    }

    return tokenSet
  }

  // Quality and confidence calculations
  private calculateOverallConfidence(
    extraction: ComprehensiveScanResult,
    aiResult: TwoPhaseResult<any> | null
  ): number {
    let confidence = extraction.metadata.dataQuality // Base confidence from extraction

    if (aiResult?.success) {
      confidence = (confidence + aiResult.optimization.qualityMaintained) / 2
    } else {
      confidence *= 0.7 // Reduce confidence if AI processing failed
    }

    return Math.round(Math.max(0, Math.min(100, confidence)))
  }

  private calculateCompleteness(
    extraction: ComprehensiveScanResult,
    aiResult: TwoPhaseResult<any> | null
  ): number {
    let completeness = 50 // Base completeness

    // Add points for successful extraction strategies
    const successfulStrategies = extraction.strategies.filter(s => s.success).length
    completeness += (successfulStrategies / extraction.strategies.length) * 30

    // Add points for AI processing
    if (aiResult?.success) {
      completeness += 20
    }

    return Math.round(Math.max(0, Math.min(100, completeness)))
  }

  private calculateReliability(
    extraction: ComprehensiveScanResult,
    aiResult: TwoPhaseResult<any> | null
  ): number {
    let reliability = 70 // Base reliability

    // Reduce for fallbacks used
    reliability -= extraction.metadata.fallbacksTriggered.length * 5

    // Add for successful AI processing
    if (aiResult?.success && !aiResult.fallbackUsed) {
      reliability += 20
    }

    // Add for cache hits (indicates stable, tested data)
    if (aiResult?.optimization.strategiesUsed.includes('cache')) {
      reliability += 10
    }

    return Math.round(Math.max(0, Math.min(100, reliability)))
  }

  // Default options
  private mergeDefaultOptions(options: Partial<PipelineOptions>): PipelineOptions {
    return {
      extractionStrategies: ['all'],
      fallbacksEnabled: true,
      maxRetries: 3,
      aiEnabled: true,
      compressionThreshold: 200000,
      deduplicationEnabled: true,
      qualityAudit: false,
      maxBudget: 0.15, // $0.15 default budget per operation
      priority: 'normal',
      qualityTarget: 80,
      intent: 'component-authoring',
      cacheEnabled: true,
      backgroundProcessing: false,
      ...options
    }
  }

  // Monitoring and analytics
  async getActivePipelines(): Promise<Map<string, ContextDSPipeline>> {
    return new Map(this.activePipelines)
  }

  async getPipelineAnalytics(): Promise<{
    totalCompleted: number
    averageDuration: number
    successRate: number
    averageCost: number
    qualityDistribution: { [range: string]: number }
  }> {
    // Would track pipeline analytics in production
    return {
      totalCompleted: 0,
      averageDuration: 0,
      successRate: 95,
      averageCost: 0.08,
      qualityDistribution: {
        '90-100': 25,
        '80-89': 45,
        '70-79': 20,
        '60-69': 8,
        '0-59': 2
      }
    }
  }

  // Budget and cost management
  async checkBudgetStatus(monthlyBudget: number): Promise<{
    status: 'healthy' | 'warning' | 'critical'
    current: number
    remaining: number
    projectedOverage: number
    recommendations: string[]
  }> {
    const costTracker = await aiObservability.getCostTracker()

    let status: 'healthy' | 'warning' | 'critical' = 'healthy'
    if (costTracker.budget.utilizationRate >= 0.95) status = 'critical'
    else if (costTracker.budget.utilizationRate >= 0.80) status = 'warning'

    const recommendations: string[] = []

    if (status === 'critical') {
      recommendations.push('Immediate action required: budget nearly exhausted')
      recommendations.push('Disable non-essential AI features')
      recommendations.push('Enable aggressive compression and caching')
    } else if (status === 'warning') {
      recommendations.push('Monitor usage closely')
      recommendations.push('Enable cost optimization features')
      recommendations.push('Review expensive operations')
    }

    return {
      status,
      current: costTracker.monthly.current,
      remaining: costTracker.budget.remaining,
      projectedOverage: costTracker.budget.projectedOverage,
      recommendations
    }
  }

  // Cleanup and maintenance
  async cleanup(): Promise<void> {
    // Cleanup extractors
    await this.extractor.close()

    // Cleanup caches
    await gatewayCache.cleanup()

    // Cleanup observability
    await aiObservability.cleanup()

    console.log('AI orchestrator cleanup completed')
  }
}

// Global orchestrator instance
export const aiOrchestrator = new AIOrchestrator()

// High-level convenience functions
export async function scanAndAnalyze(
  url: string,
  options: {
    budget?: number
    quality?: 'basic' | 'standard' | 'premium'
    includeAudit?: boolean
    priority?: 'low' | 'normal' | 'high' | 'critical'
  } = {},
  progressCallback?: (progress: PipelineProgress) => void
): Promise<ContextDSResult> {
  const pipelineOptions: Partial<PipelineOptions> = {
    maxBudget: options.budget || 0.15,
    priority: options.priority || 'normal',
    qualityAudit: options.includeAudit || false,
    qualityTarget: options.quality === 'premium' ? 90 : options.quality === 'basic' ? 70 : 80
  }

  return aiOrchestrator.processWebsite(url, pipelineOptions, progressCallback)
}

export async function quickScan(
  url: string,
  progressCallback?: (progress: PipelineProgress) => void
): Promise<ContextDSResult> {
  return aiOrchestrator.processWebsite(url, {
    maxBudget: 0.05, // Low budget for quick scans
    priority: 'low',
    qualityAudit: false,
    deduplicationEnabled: false,
    intent: 'component-authoring'
  }, progressCallback)
}

export async function premiumScan(
  url: string,
  progressCallback?: (progress: PipelineProgress) => void
): Promise<ContextDSResult> {
  return aiOrchestrator.processWebsite(url, {
    maxBudget: 0.50, // Higher budget for premium analysis
    priority: 'critical',
    qualityAudit: true,
    deduplicationEnabled: true,
    qualityTarget: 95,
    intent: 'component-authoring'
  }, progressCallback)
}

// Cost-aware scanning with automatic budget management
export async function budgetAwareScan(
  url: string,
  monthlyBudget: number,
  currentSpend: number,
  progressCallback?: (progress: PipelineProgress) => void
): Promise<ContextDSResult> {
  const remainingBudget = monthlyBudget - currentSpend
  const daysLeft = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate() - new Date().getDate()
  const dailyBudget = remainingBudget / Math.max(1, daysLeft)

  let scanBudget = Math.min(0.15, dailyBudget * 0.5) // Use 50% of daily budget per scan

  // Adjust quality based on budget
  let quality: 'basic' | 'standard' | 'premium' = 'standard'
  if (scanBudget < 0.05) quality = 'basic'
  else if (scanBudget > 0.25) quality = 'premium'

  return aiOrchestrator.processWebsite(url, {
    maxBudget: scanBudget,
    priority: 'normal',
    qualityAudit: quality === 'premium',
    qualityTarget: quality === 'premium' ? 90 : quality === 'basic' ? 70 : 80
  }, progressCallback)
}

// Batch processing with cost optimization
export async function batchScan(
  urls: string[],
  options: {
    maxConcurrency?: number
    totalBudget?: number
    priority?: 'low' | 'normal' | 'high'
  } = {}
): Promise<Array<{ url: string; result?: ContextDSResult; error?: string; cost: number }>> {
  const maxConcurrency = options.maxConcurrency || 3
  const budgetPerScan = (options.totalBudget || 1.0) / urls.length
  const results: Array<{ url: string; result?: ContextDSResult; error?: string; cost: number }> = []

  // Process URLs in batches
  for (let i = 0; i < urls.length; i += maxConcurrency) {
    const batch = urls.slice(i, i + maxConcurrency)

    const batchPromises = batch.map(async (url) => {
      try {
        const result = await aiOrchestrator.processWebsite(url, {
          maxBudget: budgetPerScan,
          priority: options.priority || 'low',
          qualityAudit: false, // Disable audit for batch processing
          backgroundProcessing: true
        })

        return {
          url,
          result,
          cost: result.aiMetadata.totalCost
        }

      } catch (error) {
        return {
          url,
          error: error instanceof Error ? error.message : 'Scan failed',
          cost: 0
        }
      }
    })

    const batchResults = await Promise.allSettled(batchPromises)
    results.push(...batchResults.map(r =>
      r.status === 'fulfilled' ? r.value : { url: 'unknown', error: 'Promise rejected', cost: 0 }
    ))

    // Rate limiting between batches
    if (i + maxConcurrency < urls.length) {
      await new Promise(resolve => setTimeout(resolve, 2000))
    }
  }

  return results
}

// Emergency scanning with minimal AI usage
export async function emergencyScan(url: string): Promise<ContextDSResult> {
  return aiOrchestrator.processWebsite(url, {
    maxBudget: 0.01, // Minimal budget
    priority: 'low',
    aiEnabled: false, // Disable AI processing
    qualityAudit: false,
    deduplicationEnabled: false,
    fallbacksEnabled: true,
    extractionStrategies: ['static-css', 'computed-styles'] // Essential strategies only
  })
}