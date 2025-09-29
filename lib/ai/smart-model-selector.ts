import type { ModelConfig } from './gateway-client'

export interface SelectionCriteria {
  inputSize: number
  outputSize?: number
  operation: 'organize-pack' | 'research' | 'audit' | 'compress' | 'embed' | 'classify'
  priority: 'low' | 'normal' | 'high' | 'critical'
  budget?: number
  quality: 'basic' | 'standard' | 'premium'
  speed: 'fast' | 'normal' | 'thorough'
  context?: {
    isRetry?: boolean
    previousModel?: string
    errorType?: string
    dataComplexity?: 'simple' | 'moderate' | 'complex' | 'extreme'
  }
}

export interface ModelRecommendation {
  model: string
  confidence: number
  reasoning: string[]
  estimatedCost: number
  estimatedLatency: number
  alternatives: Array<{
    model: string
    confidence: number
    costDifference: number
    qualityTrade: number
  }>
  optimization: {
    compressionNeeded: boolean
    batchingPossible: boolean
    cachingRecommended: boolean
  }
}

export interface ComplexityAnalysis {
  score: number
  level: 'simple' | 'moderate' | 'complex' | 'extreme'
  factors: {
    dataSize: number
    varietyScore: number
    structureComplexity: number
    semanticAmbiguity: number
    frameworkMixing: number
  }
  reasoning: string[]
}

export class SmartModelSelector {
  private models: Map<string, ModelConfig & { performance: PerformanceProfile }> = new Map()
  private selectionHistory: SelectionHistory[] = []
  private performanceBaseline = new Map<string, ModelPerformance>()

  constructor() {
    this.initializeModelProfiles()
  }

  private initializeModelProfiles() {
    // gpt-5-mini - Primary workhorse
    this.models.set('gpt-5-mini', {
      name: 'gpt-5-mini',
      provider: 'openai',
      maxTokens: 16384,
      costPer1MInput: 0.25,
      costPer1MOutput: 2.00,
      specialization: ['organization', 'json-generation', 'mapping-hints', 'naming'],
      contextWindow: 400000,
      performance: {
        averageLatency: 2500, // ms
        reliability: 0.95,
        jsonAccuracy: 0.92,
        creativityScore: 0.75,
        consistencyScore: 0.88,
        costEfficiency: 0.95,
        sweetSpot: {
          minTokens: 1000,
          maxTokens: 200000,
          operations: ['organize-pack', 'naming', 'mapping']
        }
      }
    })

    // gemini-2.5-flash-lite - Large context specialist
    this.models.set('gemini-2.5-flash-lite', {
      name: 'gemini-2.5-flash-lite',
      provider: 'google',
      maxTokens: 8192,
      costPer1MInput: 0.10,
      costPer1MOutput: 0.40,
      specialization: ['research', 'summarization', 'large-context'],
      contextWindow: 1000000,
      performance: {
        averageLatency: 3500,
        reliability: 0.88,
        jsonAccuracy: 0.85,
        creativityScore: 0.82,
        consistencyScore: 0.78,
        costEfficiency: 0.92,
        sweetSpot: {
          minTokens: 200000,
          maxTokens: 900000,
          operations: ['research', 'large-summarization']
        }
      }
    })

    // claude-3.7-sonnet - High-accuracy judge
    this.models.set('claude-3.7-sonnet', {
      name: 'claude-3.7-sonnet',
      provider: 'anthropic',
      maxTokens: 8192,
      costPer1MInput: 3.00,
      costPer1MOutput: 15.00,
      specialization: ['quality-assurance', 'complex-reasoning', 'audit'],
      contextWindow: 200000,
      performance: {
        averageLatency: 4000,
        reliability: 0.98,
        jsonAccuracy: 0.96,
        creativityScore: 0.90,
        consistencyScore: 0.94,
        costEfficiency: 0.30, // Expensive but high quality
        sweetSpot: {
          minTokens: 5000,
          maxTokens: 150000,
          operations: ['audit', 'quality-check', 'complex-reasoning']
        }
      }
    })

    // gpt-5-nano - Ultra-cheap compressor
    this.models.set('gpt-5-nano', {
      name: 'gpt-5-nano',
      provider: 'openai',
      maxTokens: 4096,
      costPer1MInput: 0.05,
      costPer1MOutput: 0.40,
      specialization: ['compression', 'extraction', 'summarization'],
      contextWindow: 128000,
      performance: {
        averageLatency: 1800,
        reliability: 0.90,
        jsonAccuracy: 0.80,
        creativityScore: 0.60,
        consistencyScore: 0.75,
        costEfficiency: 0.98,
        sweetSpot: {
          minTokens: 100,
          maxTokens: 100000,
          operations: ['compress', 'extract-summary']
        }
      }
    })

    // gpt-4.1-mini - Alternative large context
    this.models.set('gpt-4.1-mini', {
      name: 'gpt-4.1-mini',
      provider: 'openai',
      maxTokens: 16384,
      costPer1MInput: 0.40,
      costPer1MOutput: 1.60,
      specialization: ['organization', 'reasoning'],
      contextWindow: 1000000,
      performance: {
        averageLatency: 3200,
        reliability: 0.93,
        jsonAccuracy: 0.89,
        creativityScore: 0.80,
        consistencyScore: 0.85,
        costEfficiency: 0.80,
        sweetSpot: {
          minTokens: 50000,
          maxTokens: 800000,
          operations: ['organize-pack', 'research']
        }
      }
    })
  }

  // Main model selection method
  async selectModel(criteria: SelectionCriteria): Promise<ModelRecommendation> {
    try {
      // Analyze data complexity first
      const complexity = this.analyzeComplexity(criteria)

      // Get candidate models
      const candidates = this.getCandidateModels(criteria, complexity)

      // Score each candidate
      const scoredCandidates = candidates.map(model => ({
        model: model.name,
        score: this.scoreModel(model, criteria, complexity),
        reasoning: this.generateReasoning(model, criteria, complexity),
        estimatedCost: this.estimateCost(model, criteria),
        estimatedLatency: this.estimateLatency(model, criteria)
      }))

      // Select best candidate
      const best = scoredCandidates.reduce((best, current) =>
        current.score > best.score ? current : best
      )

      // Generate alternatives
      const alternatives = scoredCandidates
        .filter(c => c.model !== best.model)
        .sort((a, b) => b.score - a.score)
        .slice(0, 3)
        .map(alt => ({
          model: alt.model,
          confidence: alt.score,
          costDifference: alt.estimatedCost - best.estimatedCost,
          qualityTrade: this.calculateQualityTrade(best.model, alt.model, criteria.operation)
        }))

      // Generate optimization recommendations
      const optimization = this.generateOptimizations(best.model, criteria)

      const recommendation: ModelRecommendation = {
        model: best.model,
        confidence: best.score,
        reasoning: best.reasoning,
        estimatedCost: best.estimatedCost,
        estimatedLatency: best.estimatedLatency,
        alternatives,
        optimization
      }

      // Record selection for learning
      this.recordSelection(criteria, recommendation)

      return recommendation

    } catch (error) {
      console.error('Model selection failed:', error)

      // Fallback to safe default
      return {
        model: 'gpt-5-mini',
        confidence: 50,
        reasoning: ['Fallback selection due to error'],
        estimatedCost: 0.05,
        estimatedLatency: 3000,
        alternatives: [],
        optimization: {
          compressionNeeded: criteria.inputSize > 200000,
          batchingPossible: false,
          cachingRecommended: true
        }
      }
    }
  }

  // Analyze data complexity to inform model selection
  private analyzeComplexity(criteria: SelectionCriteria): ComplexityAnalysis {
    const factors = {
      dataSize: this.scoreDataSize(criteria.inputSize),
      varietyScore: 50, // Would analyze token variety
      structureComplexity: 50, // Would analyze data structure
      semanticAmbiguity: 50, // Would analyze naming ambiguity
      frameworkMixing: 50 // Would analyze framework mixing
    }

    const score = Object.values(factors).reduce((sum, score) => sum + score, 0) / Object.keys(factors).length

    let level: ComplexityAnalysis['level']
    if (score >= 80) level = 'extreme'
    else if (score >= 65) level = 'complex'
    else if (score >= 45) level = 'moderate'
    else level = 'simple'

    const reasoning = this.generateComplexityReasoning(factors, level)

    return {
      score,
      level,
      factors,
      reasoning
    }
  }

  private scoreDataSize(inputSize: number): number {
    // Score increases with size complexity
    if (inputSize < 10000) return 20 // Simple
    if (inputSize < 50000) return 40 // Moderate
    if (inputSize < 200000) return 60 // Complex
    if (inputSize < 500000) return 80 // Very complex
    return 95 // Extreme
  }

  private generateComplexityReasoning(factors: any, level: string): string[] {
    const reasoning: string[] = []

    if (factors.dataSize > 70) {
      reasoning.push('Large dataset requires models with bigger context windows')
    }

    if (factors.varietyScore > 70) {
      reasoning.push('High token variety needs sophisticated organization capabilities')
    }

    if (factors.semanticAmbiguity > 70) {
      reasoning.push('Ambiguous naming patterns require stronger reasoning models')
    }

    if (level === 'extreme') {
      reasoning.push('Extreme complexity warrants premium model for accuracy')
    }

    return reasoning
  }

  // Get candidate models based on criteria
  private getCandidateModels(criteria: SelectionCriteria, complexity: ComplexityAnalysis): Array<ModelConfig & { performance: PerformanceProfile }> {
    const candidates: Array<ModelConfig & { performance: PerformanceProfile }> = []

    // Filter models by context window requirements
    this.models.forEach(model => {
      if (criteria.inputSize <= model.contextWindow * 0.9) { // 90% safety margin
        candidates.push(model)
      }
    })

    // If no models can handle the size, we need compression
    if (candidates.length === 0) {
      // Return compression-capable models
      candidates.push(
        this.models.get('gpt-5-nano')!,
        this.models.get('gemini-2.5-flash-lite')!
      )
    }

    // Filter by specialization
    const specialized = candidates.filter(model =>
      model.specialization.includes(criteria.operation) ||
      model.specialization.includes(this.getOperationCategory(criteria.operation))
    )

    return specialized.length > 0 ? specialized : candidates
  }

  private getOperationCategory(operation: string): string {
    const categories: { [key: string]: string } = {
      'organize-pack': 'organization',
      'research': 'research',
      'audit': 'quality-assurance',
      'compress': 'compression',
      'embed': 'extraction',
      'classify': 'organization'
    }

    return categories[operation] || 'organization'
  }

  // Score model suitability
  private scoreModel(
    model: ModelConfig & { performance: PerformanceProfile },
    criteria: SelectionCriteria,
    complexity: ComplexityAnalysis
  ): number {
    let score = 50 // Base score

    // Context window fit
    const contextUtilization = criteria.inputSize / model.contextWindow
    if (contextUtilization < 0.5) score += 15 // Comfortable fit
    else if (contextUtilization < 0.8) score += 10 // Good fit
    else if (contextUtilization < 0.95) score += 5 // Tight fit
    else score -= 20 // Too tight

    // Operation specialization
    const isSpecialized = model.specialization.includes(criteria.operation) ||
                         model.specialization.includes(this.getOperationCategory(criteria.operation))
    if (isSpecialized) score += 20

    // Quality requirements
    const qualityMultipliers = { basic: 0.8, standard: 1.0, premium: 1.2 }
    const qualityScore = model.performance.jsonAccuracy * 100 * qualityMultipliers[criteria.quality]
    score += (qualityScore - 80) * 0.3 // Bonus/penalty for quality

    // Priority handling
    if (criteria.priority === 'critical') {
      score += model.performance.reliability * 20 // Reliability is crucial
    } else if (criteria.priority === 'low') {
      score += model.performance.costEfficiency * 15 // Cost efficiency matters more
    }

    // Speed requirements
    if (criteria.speed === 'fast') {
      const latencyScore = Math.max(0, 5000 - model.performance.averageLatency) / 5000 * 20
      score += latencyScore
    }

    // Budget constraints
    if (criteria.budget) {
      const estimatedCost = this.estimateCost(model, criteria)
      if (estimatedCost <= criteria.budget) {
        score += 15 // Within budget
      } else {
        score -= (estimatedCost / criteria.budget - 1) * 30 // Penalty for over budget
      }
    }

    // Complexity handling
    if (complexity.level === 'extreme') {
      // Prefer high-accuracy models for complex data
      score += (model.performance.consistencyScore - 0.8) * 25
    } else if (complexity.level === 'simple') {
      // Prefer cost-efficient models for simple data
      score += model.performance.costEfficiency * 20
    }

    // Previous performance (learning)
    const history = this.getModelHistory(model.name, criteria.operation)
    if (history) {
      score += (history.successRate - 0.5) * 20 // Adjust based on historical performance
    }

    // Retry handling
    if (criteria.context?.isRetry) {
      if (criteria.context.previousModel === model.name) {
        score -= 30 // Avoid same model that failed
      } else {
        score += 10 // Different model for retry
      }
    }

    return Math.max(0, Math.min(100, score))
  }

  private generateReasoning(
    model: ModelConfig & { performance: PerformanceProfile },
    criteria: SelectionCriteria,
    complexity: ComplexityAnalysis
  ): string[] {
    const reasons: string[] = []

    // Context window reasoning
    const utilization = criteria.inputSize / model.contextWindow
    if (utilization < 0.5) {
      reasons.push(`Comfortable context window utilization (${Math.round(utilization * 100)}%)`)
    } else if (utilization > 0.9) {
      reasons.push(`High context utilization (${Math.round(utilization * 100)}%) - near capacity`)
    }

    // Specialization reasoning
    if (model.specialization.includes(criteria.operation)) {
      reasons.push(`Specialized for ${criteria.operation} operations`)
    }

    // Cost reasoning
    const estimatedCost = this.estimateCost(model, criteria)
    if (estimatedCost < 0.02) {
      reasons.push('Very cost-effective for this operation')
    } else if (estimatedCost > 0.10) {
      reasons.push('Higher cost but premium quality')
    }

    // Quality reasoning
    if (model.performance.jsonAccuracy > 0.9) {
      reasons.push('High JSON accuracy for structured output')
    }

    if (model.performance.reliability > 0.95) {
      reasons.push('Excellent reliability for production use')
    }

    // Complexity-specific reasoning
    if (complexity.level === 'extreme' && model.name === 'claude-3.7-sonnet') {
      reasons.push('Premium model recommended for extreme complexity')
    }

    if (complexity.level === 'simple' && model.performance.costEfficiency > 0.9) {
      reasons.push('Cost-efficient model suitable for simple data')
    }

    return reasons
  }

  // Cost and latency estimation
  private estimateCost(model: ModelConfig, criteria: SelectionCriteria): number {
    const inputCost = (criteria.inputSize / 1000000) * model.costPer1MInput
    const outputSize = criteria.outputSize || Math.min(4000, criteria.inputSize * 0.1)
    const outputCost = (outputSize / 1000000) * model.costPer1MOutput

    return inputCost + outputCost
  }

  private estimateLatency(model: ModelConfig & { performance: PerformanceProfile }, criteria: SelectionCriteria): number {
    const baseLatency = model.performance.averageLatency
    const sizeMultiplier = Math.max(1, criteria.inputSize / 50000) // Larger inputs take longer
    const complexityMultiplier = criteria.context?.dataComplexity === 'extreme' ? 1.3 : 1.0

    return Math.round(baseLatency * sizeMultiplier * complexityMultiplier)
  }

  // Quality trade calculation between models
  private calculateQualityTrade(modelA: string, modelB: string, operation: string): number {
    const configA = this.models.get(modelA)
    const configB = this.models.get(modelB)

    if (!configA || !configB) return 0

    // Calculate quality difference based on operation relevance
    let qualityA = configA.performance.jsonAccuracy
    let qualityB = configB.performance.jsonAccuracy

    // Adjust for specialization
    if (configA.specialization.includes(operation)) qualityA += 0.1
    if (configB.specialization.includes(operation)) qualityB += 0.1

    return (qualityA - qualityB) * 100
  }

  // Advanced selection strategies
  async selectWithBudgetOptimization(
    criteria: SelectionCriteria,
    monthlyBudget: number,
    currentSpend: number
  ): Promise<ModelRecommendation> {
    const remainingBudget = monthlyBudget - currentSpend
    const requestsRemaining = this.estimateRemainingRequests()

    // Calculate per-request budget
    const perRequestBudget = remainingBudget / Math.max(1, requestsRemaining)

    const optimizedCriteria = {
      ...criteria,
      budget: Math.min(criteria.budget || Infinity, perRequestBudget),
      quality: remainingBudget < monthlyBudget * 0.1 ? 'basic' : criteria.quality // Reduce quality if budget low
    }

    return this.selectModel(optimizedCriteria)
  }

  async selectWithPerformanceOptimization(
    criteria: SelectionCriteria,
    performanceTarget: { maxLatency: number; minAccuracy: number }
  ): Promise<ModelRecommendation> {
    const candidates = Array.from(this.models.values())
      .filter(model => {
        const estimatedLatency = this.estimateLatency(model, criteria)
        return estimatedLatency <= performanceTarget.maxLatency &&
               model.performance.jsonAccuracy >= performanceTarget.minAccuracy
      })

    if (candidates.length === 0) {
      // Relax constraints
      return this.selectModel({
        ...criteria,
        quality: 'basic',
        speed: 'fast'
      })
    }

    // Select fastest among qualified candidates
    const fastest = candidates.reduce((best, current) =>
      current.performance.averageLatency < best.performance.averageLatency ? current : best
    )

    return {
      model: fastest.name,
      confidence: 85,
      reasoning: [`Selected for performance: ${fastest.performance.averageLatency}ms average latency`],
      estimatedCost: this.estimateCost(fastest, criteria),
      estimatedLatency: this.estimateLatency(fastest, criteria),
      alternatives: [],
      optimization: this.generateOptimizations(fastest.name, criteria)
    }
  }

  // Smart fallback selection when primary model fails
  async selectFallback(
    originalCriteria: SelectionCriteria,
    failedModel: string,
    errorType: string
  ): Promise<ModelRecommendation> {
    const fallbackCriteria = {
      ...originalCriteria,
      context: {
        isRetry: true,
        previousModel: failedModel,
        errorType,
        dataComplexity: originalCriteria.context?.dataComplexity || 'moderate'
      }
    }

    // Adjust strategy based on error type
    if (errorType.includes('context') || errorType.includes('too large')) {
      // Need compression or larger context model
      fallbackCriteria.operation = 'compress'
    } else if (errorType.includes('timeout')) {
      // Need faster model
      fallbackCriteria.speed = 'fast'
      fallbackCriteria.quality = 'basic'
    } else if (errorType.includes('format') || errorType.includes('json')) {
      // Need model with better JSON accuracy
      fallbackCriteria.quality = 'premium'
    }

    return this.selectModel(fallbackCriteria)
  }

  // Generate optimization recommendations
  private generateOptimizations(model: string, criteria: SelectionCriteria): {
    compressionNeeded: boolean
    batchingPossible: boolean
    cachingRecommended: boolean
  } {
    const modelConfig = this.models.get(model)!

    return {
      compressionNeeded: criteria.inputSize > modelConfig.contextWindow * 0.8,
      batchingPossible: criteria.operation === 'embed' || criteria.operation === 'classify',
      cachingRecommended: criteria.operation === 'organize-pack' && criteria.inputSize < 100000
    }
  }

  // Learning and adaptation
  private recordSelection(criteria: SelectionCriteria, recommendation: ModelRecommendation): void {
    this.selectionHistory.push({
      timestamp: Date.now(),
      criteria,
      selectedModel: recommendation.model,
      confidence: recommendation.confidence,
      estimatedCost: recommendation.estimatedCost,
      success: null // Will be updated when we get results
    })

    // Keep history manageable
    if (this.selectionHistory.length > 1000) {
      this.selectionHistory = this.selectionHistory.slice(-1000)
    }
  }

  recordSelectionOutcome(
    selectionTimestamp: number,
    actualCost: number,
    actualLatency: number,
    success: boolean,
    qualityScore?: number
  ): void {
    const selection = this.selectionHistory.find(s => s.timestamp === selectionTimestamp)
    if (selection) {
      selection.success = success
      selection.actualCost = actualCost
      selection.actualLatency = actualLatency
      selection.qualityScore = qualityScore

      // Update model performance baselines
      this.updatePerformanceBaseline(selection)
    }
  }

  private updatePerformanceBaseline(selection: SelectionHistory): void {
    const model = selection.selectedModel
    const existing = this.performanceBaseline.get(model) || {
      requests: 0,
      successes: 0,
      totalCost: 0,
      totalLatency: 0,
      averageQuality: 0
    }

    existing.requests++
    if (selection.success) existing.successes++
    if (selection.actualCost) existing.totalCost += selection.actualCost
    if (selection.actualLatency) existing.totalLatency += selection.actualLatency
    if (selection.qualityScore) {
      existing.averageQuality = (existing.averageQuality * (existing.requests - 1) + selection.qualityScore) / existing.requests
    }

    this.performanceBaseline.set(model, existing)
  }

  private getModelHistory(model: string, operation: string): { successRate: number; avgCost: number; avgLatency: number } | null {
    const baseline = this.performanceBaseline.get(model)
    if (!baseline || baseline.requests < 5) return null

    return {
      successRate: baseline.successes / baseline.requests,
      avgCost: baseline.totalCost / baseline.requests,
      avgLatency: baseline.totalLatency / baseline.requests
    }
  }

  private estimateRemainingRequests(): number {
    // Estimate based on historical usage patterns
    const recentSelections = this.selectionHistory.filter(s => s.timestamp > Date.now() - 24 * 60 * 60 * 1000)
    const dailyRate = recentSelections.length
    const daysInMonth = 30

    return Math.max(10, dailyRate * daysInMonth * 0.8) // Conservative estimate
  }

  // Cost-aware selection for budget management
  async selectForBudgetTier(
    criteria: SelectionCriteria,
    tier: 'free' | 'basic' | 'pro' | 'enterprise'
  ): Promise<ModelRecommendation> {
    const budgetLimits = {
      free: 0.01,
      basic: 0.05,
      pro: 0.15,
      enterprise: 0.50
    }

    const adjustedCriteria = {
      ...criteria,
      budget: budgetLimits[tier],
      quality: tier === 'free' ? 'basic' : tier === 'enterprise' ? 'premium' : 'standard'
    }

    return this.selectModel(adjustedCriteria)
  }

  // Batch optimization for multiple requests
  async optimizeBatch(
    requests: SelectionCriteria[]
  ): Promise<{
    groupings: Array<{ model: string; requests: SelectionCriteria[]; totalCost: number }>
    totalSavings: number
    recommendations: string[]
  }> {
    const groupings: { [model: string]: SelectionCriteria[] } = {}

    // Group requests by optimal model
    for (const request of requests) {
      const recommendation = await this.selectModel(request)
      const model = recommendation.model

      if (!groupings[model]) {
        groupings[model] = []
      }
      groupings[model].push(request)
    }

    // Calculate batching benefits
    const batchGroups = Object.entries(groupings).map(([model, reqs]) => ({
      model,
      requests: reqs,
      totalCost: reqs.reduce((sum, req) => sum + this.estimateCost(this.models.get(model)!, req), 0)
    }))

    // Estimate savings from batching
    const totalIndividualCost = requests.reduce((sum, req) => {
      const rec = this.selectModel(req)
      return sum + rec.estimatedCost
    }, 0)

    const totalBatchCost = batchGroups.reduce((sum, group) => sum + group.totalCost, 0)
    const totalSavings = totalIndividualCost - totalBatchCost

    const recommendations = [
      `Batch ${requests.length} requests across ${batchGroups.length} models`,
      `Estimated savings: $${totalSavings.toFixed(4)}`,
      `Primary model: ${batchGroups.sort((a, b) => b.requests.length - a.requests.length)[0]?.model}`
    ]

    return {
      groupings: batchGroups,
      totalSavings,
      recommendations
    }
  }

  // Analytics and insights
  getSelectionAnalytics(): {
    totalSelections: number
    modelUsage: Map<string, number>
    averageCost: number
    successRate: number
    costTrends: Array<{ date: string; cost: number }>
    recommendations: string[]
  } {
    const modelUsage = new Map<string, number>()
    let totalCost = 0
    let successes = 0

    this.selectionHistory.forEach(selection => {
      modelUsage.set(selection.selectedModel, (modelUsage.get(selection.selectedModel) || 0) + 1)
      if (selection.actualCost) totalCost += selection.actualCost
      if (selection.success) successes++
    })

    const analytics = {
      totalSelections: this.selectionHistory.length,
      modelUsage,
      averageCost: totalCost / Math.max(1, this.selectionHistory.length),
      successRate: successes / Math.max(1, this.selectionHistory.length),
      costTrends: this.generateCostTrends(),
      recommendations: this.generateOptimizationRecommendations()
    }

    return analytics
  }

  private generateCostTrends(): Array<{ date: string; cost: number }> {
    const dailyCosts = new Map<string, number>()

    this.selectionHistory.forEach(selection => {
      if (selection.actualCost) {
        const date = new Date(selection.timestamp).toISOString().split('T')[0]
        dailyCosts.set(date, (dailyCosts.get(date) || 0) + selection.actualCost)
      }
    })

    return Array.from(dailyCosts.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, cost]) => ({ date, cost }))
  }

  private generateOptimizationRecommendations(): string[] {
    const recommendations: string[] = []

    // Analyze model usage patterns
    const modelStats = new Map<string, { uses: number; avgCost: number; successRate: number }>()

    this.selectionHistory.forEach(selection => {
      const model = selection.selectedModel
      const existing = modelStats.get(model) || { uses: 0, avgCost: 0, successRate: 0 }

      existing.uses++
      if (selection.actualCost) {
        existing.avgCost = (existing.avgCost * (existing.uses - 1) + selection.actualCost) / existing.uses
      }
      if (selection.success !== null) {
        existing.successRate = (existing.successRate * (existing.uses - 1) + (selection.success ? 1 : 0)) / existing.uses
      }

      modelStats.set(model, existing)
    })

    // Generate recommendations based on patterns
    const gpt5MiniStats = modelStats.get('gpt-5-mini')
    if (gpt5MiniStats && gpt5MiniStats.uses > 10) {
      if (gpt5MiniStats.successRate > 0.95) {
        recommendations.push('gpt-5-mini performing excellently - continue as primary model')
      } else if (gpt5MiniStats.successRate < 0.8) {
        recommendations.push('Consider using higher-quality models for complex operations')
      }
    }

    const totalCost = Array.from(modelStats.values()).reduce((sum, stats) => sum + stats.avgCost * stats.uses, 0)
    if (totalCost > 5.0) { // $5 threshold
      recommendations.push('High AI costs detected - consider more compression and caching')
    }

    const claudeUsage = modelStats.get('claude-3.7-sonnet')?.uses || 0
    if (claudeUsage > 20) {
      recommendations.push('High premium model usage - ensure only for critical operations')
    }

    return recommendations
  }

  // Predictive model selection based on patterns
  async predictOptimalModel(
    criteria: SelectionCriteria,
    similarPastRequests: SelectionHistory[]
  ): Promise<ModelRecommendation> {
    if (similarPastRequests.length === 0) {
      return this.selectModel(criteria)
    }

    // Analyze patterns in similar requests
    const modelPerformance = new Map<string, { successes: number; failures: number; avgCost: number }>()

    similarPastRequests.forEach(request => {
      const model = request.selectedModel
      const existing = modelPerformance.get(model) || { successes: 0, failures: 0, avgCost: 0 }

      if (request.success) existing.successes++
      else existing.failures++

      if (request.actualCost) {
        const total = existing.successes + existing.failures
        existing.avgCost = (existing.avgCost * (total - 1) + request.actualCost) / total
      }

      modelPerformance.set(model, existing)
    })

    // Find model with best track record for similar requests
    let bestModel = 'gpt-5-mini'
    let bestScore = 0

    modelPerformance.forEach((perf, model) => {
      const total = perf.successes + perf.failures
      if (total < 3) return // Need enough data

      const successRate = perf.successes / total
      const costEfficiency = 1 / Math.max(0.001, perf.avgCost) // Inverse cost
      const score = successRate * 0.7 + costEfficiency * 0.3

      if (score > bestScore) {
        bestScore = score
        bestModel = model
      }
    })

    // Use predicted model but adjust for current criteria
    return this.selectModel({
      ...criteria,
      context: {
        ...criteria.context,
        previousModel: bestModel
      }
    })
  }
}

// Supporting interfaces
interface PerformanceProfile {
  averageLatency: number
  reliability: number
  jsonAccuracy: number
  creativityScore: number
  consistencyScore: number
  costEfficiency: number
  sweetSpot: {
    minTokens: number
    maxTokens: number
    operations: string[]
  }
}

interface SelectionHistory {
  timestamp: number
  criteria: SelectionCriteria
  selectedModel: string
  confidence: number
  estimatedCost: number
  success?: boolean | null
  actualCost?: number
  actualLatency?: number
  qualityScore?: number
}

interface ModelPerformance {
  requests: number
  successes: number
  totalCost: number
  totalLatency: number
  averageQuality: number
}

// Global selector instance
export const smartModelSelector = new SmartModelSelector()

// Convenience functions for common operations
export async function selectForTokenOrganization(
  dataSize: number,
  complexity: 'simple' | 'moderate' | 'complex' = 'moderate',
  budget?: number
): Promise<ModelRecommendation> {
  return smartModelSelector.selectModel({
    inputSize: dataSize,
    operation: 'organize-pack',
    priority: 'normal',
    budget,
    quality: 'standard',
    speed: 'normal',
    context: { dataComplexity: complexity }
  })
}

export async function selectForResearch(
  dataSize: number,
  artifactCount: number
): Promise<ModelRecommendation> {
  const priority = artifactCount > 10 ? 'high' : 'normal'
  const complexity = dataSize > 500000 ? 'complex' : 'moderate'

  return smartModelSelector.selectModel({
    inputSize: dataSize,
    operation: 'research',
    priority,
    quality: 'standard',
    speed: 'thorough',
    context: { dataComplexity: complexity }
  })
}

export async function selectForAudit(
  packSize: number,
  criticalBusiness: boolean = false
): Promise<ModelRecommendation> {
  return smartModelSelector.selectModel({
    inputSize: packSize,
    operation: 'audit',
    priority: criticalBusiness ? 'critical' : 'high',
    quality: 'premium',
    speed: 'thorough'
  })
}