import { intelligentCache } from '../cache/intelligent-cache'

export interface AIOperationMetric {
  id: string
  timestamp: number
  operation: string
  model: string
  usage: {
    inputTokens: number
    outputTokens: number
    totalTokens: number
    cost: number
  }
  performance: {
    latency: number
    queueTime: number
    processingTime: number
    cacheHit: boolean
  }
  quality: {
    score: number
    confidence: number
    validationPassed: boolean
    repairRequired: boolean
  }
  context: {
    url?: string
    userId?: string
    sessionId?: string
    requestId: string
    userAgent?: string
  }
  outcome: {
    success: boolean
    error?: string
    fallbackUsed: boolean
    retryCount: number
  }
}

export interface CostTracker {
  daily: DailyCosts
  monthly: MonthlyCosts
  byModel: ModelCosts
  byOperation: OperationCosts
  trends: CostTrend[]
  budget: BudgetTracking
}

export interface DailyCosts {
  today: number
  yesterday: number
  weekToDate: number
  trend: 'increasing' | 'decreasing' | 'stable'
}

export interface MonthlyCosts {
  current: number
  previous: number
  budget: number
  projected: number
  remaining: number
  daysLeft: number
}

export interface ModelCosts {
  [model: string]: {
    requests: number
    totalCost: number
    averageCost: number
    tokenUsage: number
    successRate: number
  }
}

export interface OperationCosts {
  [operation: string]: {
    requests: number
    totalCost: number
    averageCost: number
    averageLatency: number
    successRate: number
  }
}

export interface CostTrend {
  date: string
  cost: number
  requests: number
  averageCost: number
}

export interface BudgetTracking {
  monthly: number
  used: number
  remaining: number
  utilizationRate: number
  projectedOverage: number
  alertThresholds: {
    warning: number // 80%
    critical: number // 95%
  }
}

export interface PerformanceAlert {
  id: string
  timestamp: number
  type: 'cost' | 'performance' | 'quality' | 'error'
  severity: 'info' | 'warning' | 'error' | 'critical'
  message: string
  details: any
  resolved: boolean
  actions: string[]
}

export interface QualityMetrics {
  overall: {
    averageScore: number
    scoreDistribution: { [range: string]: number }
    trend: 'improving' | 'declining' | 'stable'
  }
  byOperation: {
    [operation: string]: {
      averageScore: number
      successRate: number
      repairRate: number
    }
  }
  issues: {
    commonErrors: Array<{ error: string; count: number; trend: string }>
    qualityDegradation: boolean
    consistencyIssues: number
  }
}

export class AIObservability {
  private metrics: AIOperationMetric[] = []
  private alerts: PerformanceAlert[] = []
  private budgetConfig = {
    monthly: 50.0, // $50/month default
    warningThreshold: 0.8, // 80%
    criticalThreshold: 0.95, // 95%
    autoShutoff: false
  }

  private performanceBaselines = {
    latency: { target: 3000, warning: 5000, critical: 10000 },
    cost: { target: 0.05, warning: 0.10, critical: 0.25 },
    quality: { target: 80, warning: 70, critical: 60 },
    successRate: { target: 0.95, warning: 0.90, critical: 0.80 }
  }

  // Record AI operation
  async recordOperation(metric: AIOperationMetric): Promise<void> {
    try {
      // Store metric
      this.metrics.push(metric)

      // Maintain sliding window (keep last 10k metrics)
      if (this.metrics.length > 10000) {
        this.metrics = this.metrics.slice(-10000)
      }

      // Update real-time analytics
      await this.updateAnalytics(metric)

      // Check for alerts
      await this.checkAlerts(metric)

      // Persist to cache for dashboard
      await this.persistMetrics(metric)

    } catch (error) {
      console.error('Failed to record AI operation metric:', error)
    }
  }

  // Real-time analytics updates
  private async updateAnalytics(metric: AIOperationMetric): Promise<void> {
    // Update cost tracking
    const today = new Date().toISOString().split('T')[0]
    const costKey = `cost:daily:${today}`

    const currentDailyCost = await intelligentCache.safeGet<number>(costKey, 'analytics') || 0
    await intelligentCache.safeSet(
      costKey,
      currentDailyCost + metric.usage.cost,
      'analytics',
      { strategy: 'cost-tracking', quality: 100, tags: ['cost', 'daily'] }
    )

    // Update model performance
    const modelKey = `performance:model:${metric.model}`
    const modelPerf = await intelligentCache.safeGet<any>(modelKey, 'analytics') || {
      requests: 0,
      totalCost: 0,
      totalLatency: 0,
      successes: 0
    }

    modelPerf.requests++
    modelPerf.totalCost += metric.usage.cost
    modelPerf.totalLatency += metric.performance.latency
    if (metric.outcome.success) modelPerf.successes++

    await intelligentCache.safeSet(modelKey, modelPerf, 'analytics', {
      strategy: 'performance-tracking',
      quality: 100,
      tags: ['performance', 'model', metric.model]
    })
  }

  // Alert checking and generation
  private async checkAlerts(metric: AIOperationMetric): Promise<void> {
    const alerts: PerformanceAlert[] = []

    // Cost alerts
    const dailyCost = await this.getDailyCost()
    const monthlyCost = await this.getMonthlyCost()

    if (monthlyCost >= this.budgetConfig.monthly * this.budgetConfig.criticalThreshold) {
      alerts.push({
        id: `budget-critical-${Date.now()}`,
        timestamp: Date.now(),
        type: 'cost',
        severity: 'critical',
        message: `Monthly budget ${(monthlyCost / this.budgetConfig.monthly * 100).toFixed(1)}% used`,
        details: { monthlyCost, budget: this.budgetConfig.monthly },
        resolved: false,
        actions: ['Review AI usage', 'Enable aggressive caching', 'Consider budget increase']
      })
    } else if (monthlyCost >= this.budgetConfig.monthly * this.budgetConfig.warningThreshold) {
      alerts.push({
        id: `budget-warning-${Date.now()}`,
        timestamp: Date.now(),
        type: 'cost',
        severity: 'warning',
        message: `Monthly budget ${(monthlyCost / this.budgetConfig.monthly * 100).toFixed(1)}% used`,
        details: { monthlyCost, budget: this.budgetConfig.monthly },
        resolved: false,
        actions: ['Monitor usage closely', 'Enable compression', 'Review expensive operations']
      })
    }

    // Performance alerts
    if (metric.performance.latency > this.performanceBaselines.latency.critical) {
      alerts.push({
        id: `latency-critical-${metric.id}`,
        timestamp: Date.now(),
        type: 'performance',
        severity: 'critical',
        message: `Extremely high latency: ${metric.performance.latency}ms`,
        details: { metric, baseline: this.performanceBaselines.latency.critical },
        resolved: false,
        actions: ['Check model status', 'Consider model switch', 'Review input size']
      })
    }

    // Quality alerts
    if (metric.quality.score < this.performanceBaselines.quality.critical) {
      alerts.push({
        id: `quality-critical-${metric.id}`,
        timestamp: Date.now(),
        type: 'quality',
        severity: 'critical',
        message: `Low quality score: ${metric.quality.score}%`,
        details: { metric, baseline: this.performanceBaselines.quality.critical },
        resolved: false,
        actions: ['Review prompt quality', 'Consider model upgrade', 'Check input data quality']
      })
    }

    // Error rate alerts
    const recentErrors = this.getRecentErrorRate()
    if (recentErrors > 0.2) { // 20% error rate
      alerts.push({
        id: `error-rate-${Date.now()}`,
        timestamp: Date.now(),
        type: 'error',
        severity: 'error',
        message: `High error rate: ${(recentErrors * 100).toFixed(1)}%`,
        details: { errorRate: recentErrors },
        resolved: false,
        actions: ['Review error patterns', 'Check model availability', 'Validate prompts']
      })
    }

    // Store alerts
    alerts.forEach(alert => this.addAlert(alert))
  }

  private addAlert(alert: PerformanceAlert): void {
    this.alerts.push(alert)

    // Maintain alert history (keep last 1000)
    if (this.alerts.length > 1000) {
      this.alerts = this.alerts.slice(-1000)
    }

    // Log critical alerts
    if (alert.severity === 'critical') {
      console.error(`Critical AI Alert: ${alert.message}`, alert.details)
    }
  }

  // Cost tracking methods
  async getDailyCost(): Promise<number> {
    const today = new Date().toISOString().split('T')[0]
    const costKey = `cost:daily:${today}`
    return await intelligentCache.safeGet<number>(costKey, 'analytics') || 0
  }

  async getMonthlyCost(): Promise<number> {
    const year = new Date().getFullYear()
    const month = new Date().getMonth() + 1
    const monthKey = `cost:monthly:${year}-${month.toString().padStart(2, '0')}`
    return await intelligentCache.safeGet<number>(monthKey, 'analytics') || 0
  }

  async getCostTracker(): Promise<CostTracker> {
    const now = new Date()
    const today = now.toISOString().split('T')[0]
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString().split('T')[0]

    const dailyCosts = {
      today: await this.getDailyCost(),
      yesterday: await intelligentCache.safeGet<number>(`cost:daily:${yesterday}`, 'analytics') || 0,
      weekToDate: await this.getWeekToDateCost(),
      trend: 'stable' as const // Would calculate actual trend
    }

    const monthlyCosts = {
      current: await this.getMonthlyCost(),
      previous: await this.getPreviousMonthCost(),
      budget: this.budgetConfig.monthly,
      projected: await this.getProjectedMonthlyCost(),
      remaining: Math.max(0, this.budgetConfig.monthly - await this.getMonthlyCost()),
      daysLeft: this.getDaysLeftInMonth()
    }

    const byModel = await this.getModelCosts()
    const byOperation = await this.getOperationCosts()
    const trends = await this.getCostTrends()

    const budget: BudgetTracking = {
      monthly: this.budgetConfig.monthly,
      used: monthlyCosts.current,
      remaining: monthlyCosts.remaining,
      utilizationRate: monthlyCosts.current / this.budgetConfig.monthly,
      projectedOverage: Math.max(0, monthlyCosts.projected - this.budgetConfig.monthly),
      alertThresholds: {
        warning: this.budgetConfig.warningThreshold,
        critical: this.budgetConfig.criticalThreshold
      }
    }

    return {
      daily: dailyCosts,
      monthly: monthlyCosts,
      byModel,
      byOperation,
      trends,
      budget
    }
  }

  // Performance metrics
  async getPerformanceMetrics(): Promise<{
    latency: { average: number; p50: number; p95: number; p99: number }
    throughput: { requestsPerSecond: number; tokensPerSecond: number }
    reliability: { uptime: number; successRate: number; errorRate: number }
    efficiency: { cacheHitRate: number; compressionRate: number; costPerToken: number }
  }> {
    const recentMetrics = this.getRecentMetrics(60 * 60 * 1000) // Last hour

    if (recentMetrics.length === 0) {
      return {
        latency: { average: 0, p50: 0, p95: 0, p99: 0 },
        throughput: { requestsPerSecond: 0, tokensPerSecond: 0 },
        reliability: { uptime: 100, successRate: 100, errorRate: 0 },
        efficiency: { cacheHitRate: 0, compressionRate: 0, costPerToken: 0 }
      }
    }

    // Calculate latency percentiles
    const latencies = recentMetrics.map(m => m.performance.latency).sort((a, b) => a - b)
    const latency = {
      average: latencies.reduce((sum, l) => sum + l, 0) / latencies.length,
      p50: latencies[Math.floor(latencies.length * 0.5)],
      p95: latencies[Math.floor(latencies.length * 0.95)],
      p99: latencies[Math.floor(latencies.length * 0.99)]
    }

    // Calculate throughput
    const timeWindow = 60 * 60 // 1 hour in seconds
    const totalTokens = recentMetrics.reduce((sum, m) => sum + m.usage.totalTokens, 0)
    const throughput = {
      requestsPerSecond: recentMetrics.length / timeWindow,
      tokensPerSecond: totalTokens / timeWindow
    }

    // Calculate reliability
    const successes = recentMetrics.filter(m => m.outcome.success).length
    const reliability = {
      uptime: 100, // Would calculate from service availability
      successRate: (successes / recentMetrics.length) * 100,
      errorRate: ((recentMetrics.length - successes) / recentMetrics.length) * 100
    }

    // Calculate efficiency
    const cacheHits = recentMetrics.filter(m => m.performance.cacheHit).length
    const compressionUsed = recentMetrics.filter(m => m.context.requestId.includes('compressed')).length
    const totalCost = recentMetrics.reduce((sum, m) => sum + m.usage.cost, 0)

    const efficiency = {
      cacheHitRate: (cacheHits / recentMetrics.length) * 100,
      compressionRate: (compressionUsed / recentMetrics.length) * 100,
      costPerToken: totalTokens > 0 ? totalCost / totalTokens : 0
    }

    return { latency, throughput, reliability, efficiency }
  }

  // Quality analysis
  async getQualityMetrics(): Promise<QualityMetrics> {
    const recentMetrics = this.getRecentMetrics(24 * 60 * 60 * 1000) // Last 24 hours

    if (recentMetrics.length === 0) {
      return {
        overall: { averageScore: 0, scoreDistribution: {}, trend: 'stable' },
        byOperation: {},
        issues: { commonErrors: [], qualityDegradation: false, consistencyIssues: 0 }
      }
    }

    // Overall quality analysis
    const qualityScores = recentMetrics.map(m => m.quality.score)
    const averageScore = qualityScores.reduce((sum, score) => sum + score, 0) / qualityScores.length

    const scoreDistribution: { [range: string]: number } = {
      '90-100': qualityScores.filter(s => s >= 90).length,
      '80-89': qualityScores.filter(s => s >= 80 && s < 90).length,
      '70-79': qualityScores.filter(s => s >= 70 && s < 80).length,
      '60-69': qualityScores.filter(s => s >= 60 && s < 70).length,
      '0-59': qualityScores.filter(s => s < 60).length
    }

    // Quality by operation
    const byOperation: { [operation: string]: any } = {}
    const operationGroups = this.groupMetricsByOperation(recentMetrics)

    Object.entries(operationGroups).forEach(([operation, opMetrics]) => {
      const opQualityScores = opMetrics.map(m => m.quality.score)
      const opSuccesses = opMetrics.filter(m => m.outcome.success).length
      const opRepairs = opMetrics.filter(m => m.quality.repairRequired).length

      byOperation[operation] = {
        averageScore: opQualityScores.reduce((sum, score) => sum + score, 0) / opQualityScores.length,
        successRate: (opSuccesses / opMetrics.length) * 100,
        repairRate: (opRepairs / opMetrics.length) * 100
      }
    })

    // Common errors analysis
    const errorCounts = new Map<string, number>()
    recentMetrics.filter(m => !m.outcome.success && m.outcome.error).forEach(m => {
      const error = m.outcome.error!
      errorCounts.set(error, (errorCounts.get(error) || 0) + 1)
    })

    const commonErrors = Array.from(errorCounts.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([error, count]) => ({ error, count, trend: 'stable' })) // Would calculate actual trends

    return {
      overall: {
        averageScore,
        scoreDistribution,
        trend: this.calculateQualityTrend(qualityScores)
      },
      byOperation,
      issues: {
        commonErrors,
        qualityDegradation: averageScore < this.performanceBaselines.quality.warning,
        consistencyIssues: this.detectConsistencyIssues(recentMetrics)
      }
    }
  }

  // Cost analysis and projections
  async getCostAnalysis(): Promise<{
    currentBurn: number
    projectedMonthly: number
    costByModel: ModelCosts
    costOptimization: {
      compressionSavings: number
      cachingSavings: number
      modelOptimizationSavings: number
    }
    recommendations: string[]
  }> {
    const recentMetrics = this.getRecentMetrics(24 * 60 * 60 * 1000)
    const dailyCost = recentMetrics.reduce((sum, m) => sum + m.usage.cost, 0)

    // Project monthly cost
    const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate()
    const dayOfMonth = new Date().getDate()
    const projectedMonthly = (dailyCost / dayOfMonth) * daysInMonth

    // Cost by model
    const costByModel: ModelCosts = {}
    const modelGroups = this.groupMetricsByModel(recentMetrics)

    Object.entries(modelGroups).forEach(([model, modelMetrics]) => {
      const totalCost = modelMetrics.reduce((sum, m) => sum + m.usage.cost, 0)
      const totalTokens = modelMetrics.reduce((sum, m) => sum + m.usage.totalTokens, 0)
      const successes = modelMetrics.filter(m => m.outcome.success).length

      costByModel[model] = {
        requests: modelMetrics.length,
        totalCost,
        averageCost: totalCost / modelMetrics.length,
        tokenUsage: totalTokens,
        successRate: (successes / modelMetrics.length) * 100
      }
    })

    // Calculate optimization savings
    const cacheHits = recentMetrics.filter(m => m.performance.cacheHit).length
    const cachingSavings = cacheHits * 0.02 // Rough estimate

    const compressionUsed = recentMetrics.filter(m => m.context.requestId.includes('compressed')).length
    const compressionSavings = compressionUsed * 0.015 // Rough estimate

    const optimization = {
      compressionSavings,
      cachingSavings,
      modelOptimizationSavings: this.calculateModelOptimizationSavings(costByModel)
    }

    // Generate recommendations
    const recommendations = this.generateCostRecommendations(dailyCost, costByModel, optimization)

    return {
      currentBurn: dailyCost,
      projectedMonthly,
      costByModel,
      costOptimization: optimization,
      recommendations
    }
  }

  // Generate cost optimization recommendations
  private generateCostRecommendations(
    dailyCost: number,
    modelCosts: ModelCosts,
    optimization: any
  ): string[] {
    const recommendations: string[] = []

    // High cost alerts
    if (dailyCost > 2.0) {
      recommendations.push('Daily costs exceed $2 - review usage patterns')
    }

    // Model-specific recommendations
    Object.entries(modelCosts).forEach(([model, costs]) => {
      if (model === 'claude-3.7-sonnet' && costs.requests > 20) {
        recommendations.push('High Claude usage - ensure only for critical operations')
      }

      if (costs.successRate < 80) {
        recommendations.push(`Low success rate for ${model} - consider alternatives`)
      }

      if (costs.averageCost > 0.15) {
        recommendations.push(`High average cost for ${model} - enable compression`)
      }
    })

    // Optimization opportunities
    if (optimization.cachingSavings < 0.10) {
      recommendations.push('Low caching benefits - review cache strategy')
    }

    if (optimization.compressionSavings < 0.05) {
      recommendations.push('Enable compression for large prompts')
    }

    return recommendations
  }

  // Alerting and monitoring
  getActiveAlerts(): PerformanceAlert[] {
    return this.alerts.filter(alert => !alert.resolved)
  }

  resolveAlert(alertId: string): boolean {
    const alert = this.alerts.find(a => a.id === alertId)
    if (alert) {
      alert.resolved = true
      return true
    }
    return false
  }

  // Real-time dashboard data
  async getDashboardData(): Promise<{
    summary: {
      totalRequests: number
      totalCost: number
      averageLatency: number
      successRate: number
    }
    currentStatus: {
      budgetUtilization: number
      activeAlerts: number
      systemHealth: 'healthy' | 'warning' | 'critical'
    }
    trends: {
      costTrend: 'increasing' | 'decreasing' | 'stable'
      performanceTrend: 'improving' | 'declining' | 'stable'
      qualityTrend: 'improving' | 'declining' | 'stable'
    }
    topOperations: Array<{ operation: string; requests: number; cost: number }>
  }> {
    const recentMetrics = this.getRecentMetrics(24 * 60 * 60 * 1000)

    const summary = {
      totalRequests: recentMetrics.length,
      totalCost: recentMetrics.reduce((sum, m) => sum + m.usage.cost, 0),
      averageLatency: recentMetrics.reduce((sum, m) => sum + m.performance.latency, 0) / Math.max(1, recentMetrics.length),
      successRate: (recentMetrics.filter(m => m.outcome.success).length / Math.max(1, recentMetrics.length)) * 100
    }

    const monthlyCost = await this.getMonthlyCost()
    const budgetUtilization = monthlyCost / this.budgetConfig.monthly

    const activeAlerts = this.getActiveAlerts()
    let systemHealth: 'healthy' | 'warning' | 'critical' = 'healthy'

    if (activeAlerts.some(a => a.severity === 'critical')) {
      systemHealth = 'critical'
    } else if (activeAlerts.some(a => a.severity === 'error' || a.severity === 'warning')) {
      systemHealth = 'warning'
    }

    const currentStatus = {
      budgetUtilization,
      activeAlerts: activeAlerts.length,
      systemHealth
    }

    // Calculate trends (simplified)
    const trends = {
      costTrend: budgetUtilization > 0.8 ? 'increasing' : 'stable' as const,
      performanceTrend: summary.averageLatency < 3000 ? 'stable' : 'declining' as const,
      qualityTrend: summary.successRate > 90 ? 'stable' : 'declining' as const
    }

    // Top operations by cost
    const operationGroups = this.groupMetricsByOperation(recentMetrics)
    const topOperations = Object.entries(operationGroups)
      .map(([operation, opMetrics]) => ({
        operation,
        requests: opMetrics.length,
        cost: opMetrics.reduce((sum, m) => sum + m.usage.cost, 0)
      }))
      .sort((a, b) => b.cost - a.cost)
      .slice(0, 5)

    return {
      summary,
      currentStatus,
      trends,
      topOperations
    }
  }

  // Health check for monitoring systems
  async healthCheck(): Promise<{
    healthy: boolean
    issues: string[]
    recommendations: string[]
    metrics: {
      responseTime: number
      errorRate: number
      costBurn: number
      cacheEfficiency: number
    }
  }> {
    const issues: string[] = []
    const recommendations: string[] = []

    // Check error rate
    const errorRate = this.getRecentErrorRate()
    if (errorRate > 0.1) {
      issues.push(`High error rate: ${(errorRate * 100).toFixed(1)}%`)
      recommendations.push('Review error patterns and model availability')
    }

    // Check cost burn
    const dailyCost = await this.getDailyCost()
    if (dailyCost > this.budgetConfig.monthly / 30 * 2) {
      issues.push(`High daily cost burn: $${dailyCost.toFixed(2)}`)
      recommendations.push('Enable cost optimization features')
    }

    // Check cache efficiency
    const cacheStats = await intelligentCache.getStats()
    if (cacheStats.hitRate < 30) {
      issues.push(`Low cache hit rate: ${cacheStats.hitRate.toFixed(1)}%`)
      recommendations.push('Improve caching strategy')
    }

    // Check system resources
    const memoryUsage = this.estimateMemoryUsage()
    if (memoryUsage > 500 * 1024 * 1024) { // 500MB
      issues.push('High memory usage')
      recommendations.push('Cleanup old metrics and cache entries')
    }

    const healthy = issues.length === 0
    const recentMetrics = this.getRecentMetrics(60 * 60 * 1000)
    const avgResponseTime = recentMetrics.reduce((sum, m) => sum + m.performance.latency, 0) / Math.max(1, recentMetrics.length)

    return {
      healthy,
      issues,
      recommendations,
      metrics: {
        responseTime: avgResponseTime,
        errorRate: errorRate * 100,
        costBurn: dailyCost,
        cacheEfficiency: cacheStats.hitRate
      }
    }
  }

  // Automated optimization suggestions
  async generateOptimizationSuggestions(): Promise<{
    immediate: string[]
    shortTerm: string[]
    longTerm: string[]
    estimatedSavings: number
  }> {
    const costAnalysis = await this.getCostAnalysis()
    const performance = await this.getPerformanceMetrics()
    const quality = await this.getQualityMetrics()

    const immediate: string[] = []
    const shortTerm: string[] = []
    const longTerm: string[] = []

    // Immediate optimizations
    if (performance.efficiency.cacheHitRate < 50) {
      immediate.push('Enable aggressive response caching')
    }

    if (costAnalysis.costByModel['claude-3.7-sonnet']?.requests > 30) {
      immediate.push('Reduce Claude usage to critical operations only')
    }

    if (performance.efficiency.compressionRate < 20) {
      immediate.push('Enable prompt compression for large requests')
    }

    // Short-term optimizations
    if (quality.overall.averageScore < 85) {
      shortTerm.push('Improve prompt engineering for higher quality')
    }

    if (performance.latency.average > 4000) {
      shortTerm.push('Optimize model selection for better performance')
    }

    if (costAnalysis.projectedMonthly > this.budgetConfig.monthly * 1.2) {
      shortTerm.push('Implement stricter budget controls')
    }

    // Long-term optimizations
    longTerm.push('Implement fine-tuned models for common operations')
    longTerm.push('Build predictive caching based on usage patterns')
    longTerm.push('Implement quality feedback loop for continuous improvement')

    const estimatedSavings = this.estimateOptimizationSavings(immediate, shortTerm)

    return {
      immediate,
      shortTerm,
      longTerm,
      estimatedSavings
    }
  }

  // Utility methods
  private getRecentMetrics(timeWindow: number): AIOperationMetric[] {
    const cutoff = Date.now() - timeWindow
    return this.metrics.filter(m => m.timestamp > cutoff)
  }

  private groupMetricsByOperation(metrics: AIOperationMetric[]): { [operation: string]: AIOperationMetric[] } {
    const groups: { [operation: string]: AIOperationMetric[] } = {}

    metrics.forEach(metric => {
      if (!groups[metric.operation]) {
        groups[metric.operation] = []
      }
      groups[metric.operation].push(metric)
    })

    return groups
  }

  private groupMetricsByModel(metrics: AIOperationMetric[]): { [model: string]: AIOperationMetric[] } {
    const groups: { [model: string]: AIOperationMetric[] } = {}

    metrics.forEach(metric => {
      if (!groups[metric.model]) {
        groups[metric.model] = []
      }
      groups[metric.model].push(metric)
    })

    return groups
  }

  private getRecentErrorRate(): number {
    const recentMetrics = this.getRecentMetrics(60 * 60 * 1000) // Last hour
    if (recentMetrics.length === 0) return 0

    const errors = recentMetrics.filter(m => !m.outcome.success).length
    return errors / recentMetrics.length
  }

  private calculateQualityTrend(scores: number[]): 'improving' | 'declining' | 'stable' {
    if (scores.length < 10) return 'stable'

    const firstHalf = scores.slice(0, Math.floor(scores.length / 2))
    const secondHalf = scores.slice(Math.floor(scores.length / 2))

    const firstAvg = firstHalf.reduce((sum, s) => sum + s, 0) / firstHalf.length
    const secondAvg = secondHalf.reduce((sum, s) => sum + s, 0) / secondHalf.length

    const difference = secondAvg - firstAvg

    if (difference > 5) return 'improving'
    if (difference < -5) return 'declining'
    return 'stable'
  }

  private detectConsistencyIssues(metrics: AIOperationMetric[]): number {
    // Count operations with high variance in quality scores
    const operationGroups = this.groupMetricsByOperation(metrics)
    let inconsistentOperations = 0

    Object.values(operationGroups).forEach(opMetrics => {
      if (opMetrics.length < 5) return

      const scores = opMetrics.map(m => m.quality.score)
      const average = scores.reduce((sum, s) => sum + s, 0) / scores.length
      const variance = scores.reduce((sum, s) => sum + Math.pow(s - average, 2), 0) / scores.length

      if (Math.sqrt(variance) > 15) { // High standard deviation
        inconsistentOperations++
      }
    })

    return inconsistentOperations
  }

  private calculateModelOptimizationSavings(modelCosts: ModelCosts): number {
    let savings = 0

    // Calculate potential savings from model optimization
    Object.entries(modelCosts).forEach(([model, costs]) => {
      if (model === 'claude-3.7-sonnet' && costs.requests > 20) {
        // Could save by using cheaper models for some operations
        savings += costs.totalCost * 0.6 // 60% potential savings
      }

      if (costs.successRate < 85) {
        // Poor performing model - savings from switching
        savings += costs.totalCost * 0.3
      }
    })

    return savings
  }

  private estimateOptimizationSavings(immediate: string[], shortTerm: string[]): number {
    let savings = 0

    immediate.forEach(optimization => {
      if (optimization.includes('caching')) savings += 0.50
      if (optimization.includes('compression')) savings += 0.30
      if (optimization.includes('Claude')) savings += 1.00
    })

    shortTerm.forEach(optimization => {
      if (optimization.includes('prompt engineering')) savings += 0.25
      if (optimization.includes('model selection')) savings += 0.40
      if (optimization.includes('budget controls')) savings += 0.60
    })

    return savings
  }

  // Async helper methods for cost calculations
  private async getWeekToDateCost(): Promise<number> {
    // Calculate week-to-date cost
    const now = new Date()
    const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()))
    let total = 0

    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek.getTime() + i * 24 * 60 * 60 * 1000)
      const dateStr = date.toISOString().split('T')[0]
      const dailyCost = await intelligentCache.safeGet<number>(`cost:daily:${dateStr}`, 'analytics') || 0
      total += dailyCost
    }

    return total
  }

  private async getPreviousMonthCost(): Promise<number> {
    const now = new Date()
    const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const year = prevMonth.getFullYear()
    const month = prevMonth.getMonth() + 1
    const monthKey = `cost:monthly:${year}-${month.toString().padStart(2, '0')}`
    return await intelligentCache.safeGet<number>(monthKey, 'analytics') || 0
  }

  private async getProjectedMonthlyCost(): Promise<number> {
    const dailyCost = await this.getDailyCost()
    const dayOfMonth = new Date().getDate()
    const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate()

    return (dailyCost / dayOfMonth) * daysInMonth
  }

  private getDaysLeftInMonth(): number {
    const now = new Date()
    const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
    return lastDayOfMonth - now.getDate()
  }

  private async getModelCosts(): Promise<ModelCosts> {
    const modelCosts: ModelCosts = {}
    const recentMetrics = this.getRecentMetrics(24 * 60 * 60 * 1000)
    const modelGroups = this.groupMetricsByModel(recentMetrics)

    Object.entries(modelGroups).forEach(([model, metrics]) => {
      const totalCost = metrics.reduce((sum, m) => sum + m.usage.cost, 0)
      const totalTokens = metrics.reduce((sum, m) => sum + m.usage.totalTokens, 0)
      const successes = metrics.filter(m => m.outcome.success).length

      modelCosts[model] = {
        requests: metrics.length,
        totalCost,
        averageCost: totalCost / metrics.length,
        tokenUsage: totalTokens,
        successRate: (successes / metrics.length) * 100
      }
    })

    return modelCosts
  }

  private async getOperationCosts(): Promise<OperationCosts> {
    const operationCosts: OperationCosts = {}
    const recentMetrics = this.getRecentMetrics(24 * 60 * 60 * 1000)
    const operationGroups = this.groupMetricsByOperation(recentMetrics)

    Object.entries(operationGroups).forEach(([operation, metrics]) => {
      const totalCost = metrics.reduce((sum, m) => sum + m.usage.cost, 0)
      const avgLatency = metrics.reduce((sum, m) => sum + m.performance.latency, 0) / metrics.length
      const successes = metrics.filter(m => m.outcome.success).length

      operationCosts[operation] = {
        requests: metrics.length,
        totalCost,
        averageCost: totalCost / metrics.length,
        averageLatency: avgLatency,
        successRate: (successes / metrics.length) * 100
      }
    })

    return operationCosts
  }

  private async getCostTrends(): Promise<CostTrend[]> {
    const trends: CostTrend[] = []
    const now = new Date()

    // Get last 30 days
    for (let i = 29; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
      const dateStr = date.toISOString().split('T')[0]

      const dailyCost = await intelligentCache.safeGet<number>(`cost:daily:${dateStr}`, 'analytics') || 0
      const dailyMetrics = this.metrics.filter(m => {
        const metricDate = new Date(m.timestamp).toISOString().split('T')[0]
        return metricDate === dateStr
      })

      trends.push({
        date: dateStr,
        cost: dailyCost,
        requests: dailyMetrics.length,
        averageCost: dailyMetrics.length > 0 ? dailyCost / dailyMetrics.length : 0
      })
    }

    return trends
  }

  private async persistMetrics(metric: AIOperationMetric): Promise<void> {
    // Store metrics for dashboard and analytics
    const metricsKey = `metrics:${new Date().toISOString().split('T')[0]}`
    const dailyMetrics = await intelligentCache.safeGet<AIOperationMetric[]>(metricsKey, 'analytics') || []

    dailyMetrics.push(metric)

    // Keep only last 1000 metrics per day
    if (dailyMetrics.length > 1000) {
      dailyMetrics.splice(0, dailyMetrics.length - 1000)
    }

    await intelligentCache.safeSet(metricsKey, dailyMetrics, 'analytics', {
      strategy: 'metrics-storage',
      quality: 100,
      tags: ['metrics', 'daily']
    })
  }

  private estimateMemoryUsage(): number {
    let usage = 0

    // Estimate metrics memory
    usage += this.metrics.length * 1000 // Rough estimate per metric

    // Estimate alerts memory
    usage += this.alerts.length * 500

    return usage
  }

  // Configuration management
  setBudget(monthlyBudget: number, warningThreshold: number = 0.8, criticalThreshold: number = 0.95): void {
    this.budgetConfig = {
      monthly: monthlyBudget,
      warningThreshold,
      criticalThreshold,
      autoShutoff: false
    }
  }

  updatePerformanceBaselines(baselines: Partial<typeof this.performanceBaselines>): void {
    this.performanceBaselines = { ...this.performanceBaselines, ...baselines }
  }

  // Cleanup and maintenance
  async cleanup(): Promise<void> {
    // Remove old metrics (keep last 7 days)
    const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000
    this.metrics = this.metrics.filter(m => m.timestamp > cutoff)

    // Remove resolved alerts older than 24 hours
    const alertCutoff = Date.now() - 24 * 60 * 60 * 1000
    this.alerts = this.alerts.filter(a => !a.resolved || a.timestamp > alertCutoff)

    console.log(`AI observability cleanup: ${this.metrics.length} metrics, ${this.alerts.length} alerts retained`)
  }
}

// Global observability instance
export const aiObservability = new AIObservability()

// Convenience functions for recording metrics
export async function recordAIOperation(
  operation: string,
  model: string,
  usage: { inputTokens: number; outputTokens: number; cost: number },
  performance: { latency: number; cacheHit: boolean },
  quality: { score: number; confidence: number; validationPassed: boolean },
  context: { url?: string; userId?: string; requestId: string },
  outcome: { success: boolean; error?: string; retryCount?: number }
): Promise<void> {
  const metric: AIOperationMetric = {
    id: `metric_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    timestamp: Date.now(),
    operation,
    model,
    usage: {
      ...usage,
      totalTokens: usage.inputTokens + usage.outputTokens
    },
    performance: {
      ...performance,
      queueTime: 0, // Would measure actual queue time
      processingTime: performance.latency
    },
    quality: {
      ...quality,
      repairRequired: false // Would detect from validation results
    },
    context,
    outcome: {
      ...outcome,
      fallbackUsed: false, // Would detect from processing flags
      retryCount: outcome.retryCount || 0
    }
  }

  await aiObservability.recordOperation(metric)
}

export async function getAIHealthStatus(): Promise<'healthy' | 'warning' | 'critical'> {
  const health = await aiObservability.healthCheck()
  return health.healthy ? 'healthy' : health.issues.some(i => i.includes('critical')) ? 'critical' : 'warning'
}

export async function getCostSummary(): Promise<{
  daily: number
  monthly: number
  remaining: number
  onTrack: boolean
}> {
  const tracker = await aiObservability.getCostTracker()

  return {
    daily: tracker.daily.today,
    monthly: tracker.monthly.current,
    remaining: tracker.budget.remaining,
    onTrack: tracker.monthly.projected <= tracker.monthly.budget
  }
}