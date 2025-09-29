import { encode } from 'gpt-tokenizer' // For accurate token counting
import { intelligentCache } from '../cache/intelligent-cache'

export interface TokenCount {
  tokens: number
  characters: number
  words: number
  estimatedCost: number
  model: string
}

export interface CompressionResult {
  original: string
  compressed: string
  reduction: number
  preservedElements: string[]
  quality: number
}

export interface CostOptimization {
  originalCost: number
  optimizedCost: number
  savings: number
  strategies: string[]
  quality: number
  tokensReduced: number
}

export interface PromptAnalysis {
  size: TokenCount
  complexity: 'simple' | 'moderate' | 'complex' | 'extreme'
  compressibility: number
  criticalSections: string[]
  redundancy: number
  recommendedModel: string
}

export class CostOptimizer {
  private tokenCountCache = new Map<string, TokenCount>()
  private compressionCache = new Map<string, CompressionResult>()

  // Accurate token counting for different model families
  async countTokens(text: string, model: string = 'gpt-5-mini'): Promise<TokenCount> {
    const cacheKey = `${model}:${text.substring(0, 100)}`
    const cached = this.tokenCountCache.get(cacheKey)

    if (cached) return cached

    let tokens: number

    try {
      // Use proper tokenizer for OpenAI models
      if (model.includes('gpt') || model.includes('openai')) {
        tokens = encode(text).length
      } else {
        // Approximation for other models (Gemini, Claude)
        tokens = Math.ceil(text.length / 4) // Rough estimate
      }

      const modelConfig = this.getModelConfig(model)
      const estimatedCost = this.calculateInputCost(tokens, modelConfig)

      const result: TokenCount = {
        tokens,
        characters: text.length,
        words: text.split(/\s+/).length,
        estimatedCost,
        model
      }

      this.tokenCountCache.set(cacheKey, result)
      return result

    } catch (error) {
      console.warn('Token counting failed, using approximation:', error)

      // Fallback approximation
      const approximateTokens = Math.ceil(text.length / 4)
      return {
        tokens: approximateTokens,
        characters: text.length,
        words: text.split(/\s+/).length,
        estimatedCost: approximateTokens * 0.0000025, // Rough estimate
        model: 'approximated'
      }
    }
  }

  // Intelligent prompt compression with preservation of critical data
  async compressPrompt(
    prompt: string,
    preserveElements: string[] = ['colors', 'typography', 'spacing', 'accessibility'],
    targetReduction: number = 0.7 // 70% reduction target
  ): Promise<CompressionResult> {
    const cacheKey = `compress:${prompt.substring(0, 100)}:${targetReduction}`
    const cached = this.compressionCache.get(cacheKey)

    if (cached) return cached

    try {
      // Multi-strategy compression
      const strategies = [
        this.removeRedundancy,
        this.summarizeRepetitiveData,
        this.compressCSSData,
        this.consolidatePatterns,
        this.extractKeyInsights
      ]

      let compressed = prompt
      const appliedStrategies: string[] = []

      for (const strategy of strategies) {
        const before = compressed.length
        compressed = await strategy.call(this, compressed, preserveElements)
        const after = compressed.length

        if (before > after) {
          const reductionPercent = ((before - after) / before) * 100
          appliedStrategies.push(`${strategy.name}: ${reductionPercent.toFixed(1)}%`)
        }

        // Check if we've hit target reduction
        const totalReduction = (prompt.length - compressed.length) / prompt.length
        if (totalReduction >= targetReduction) {
          break
        }
      }

      const result: CompressionResult = {
        original: prompt,
        compressed,
        reduction: ((prompt.length - compressed.length) / prompt.length) * 100,
        preservedElements,
        quality: this.assessCompressionQuality(prompt, compressed, preserveElements)
      }

      this.compressionCache.set(cacheKey, result)
      return result

    } catch (error) {
      console.warn('Prompt compression failed:', error)

      // Fallback: simple truncation with preservation
      const lines = prompt.split('\n')
      const criticalLines = lines.filter(line =>
        preserveElements.some(element => line.toLowerCase().includes(element.toLowerCase()))
      )

      const preserved = criticalLines.join('\n')
      const remaining = lines.filter(line => !criticalLines.includes(line))
      const truncated = remaining.slice(0, Math.floor(remaining.length * (1 - targetReduction))).join('\n')

      const compressed = `${preserved}\n\n${truncated}\n\n[Content compressed for cost optimization]`

      return {
        original: prompt,
        compressed,
        reduction: ((prompt.length - compressed.length) / prompt.length) * 100,
        preservedElements,
        quality: 60 // Lower quality for fallback compression
      }
    }
  }

  // Compression strategies
  private async removeRedundancy(text: string, preserve: string[]): Promise<string> {
    // Remove duplicate CSS rules, repeated values, and redundant descriptions
    const lines = text.split('\n')
    const seen = new Set<string>()
    const deduplicated: string[] = []

    lines.forEach(line => {
      const normalized = line.trim().toLowerCase()

      // Preserve critical lines
      if (preserve.some(element => normalized.includes(element))) {
        deduplicated.push(line)
        return
      }

      // Check for duplicates
      const signature = normalized.replace(/\s+/g, ' ').substring(0, 50)
      if (!seen.has(signature)) {
        seen.add(signature)
        deduplicated.push(line)
      }
    })

    return deduplicated.join('\n')
  }

  private async summarizeRepetitiveData(text: string, preserve: string[]): Promise<string> {
    // Convert repetitive data into statistical summaries
    const cssRulePattern = /([a-zA-Z-]+):\s*([^;]+);/g
    const rules = new Map<string, Set<string>>()

    let match
    while ((match = cssRulePattern.exec(text)) !== null) {
      const [, property, value] = match
      if (!rules.has(property)) {
        rules.set(property, new Set())
      }
      rules.get(property)!.add(value)
    }

    // Summarize rules with many unique values
    const summaries: string[] = []
    rules.forEach((values, property) => {
      if (values.size > 10) {
        const valueArray = Array.from(values)
        summaries.push(
          `${property}: ${valueArray.slice(0, 3).join(', ')} ... (${values.size} total values)`
        )
      } else if (values.size > 1) {
        summaries.push(`${property}: ${Array.from(values).join(', ')}`)
      }
    })

    // Replace repetitive sections with summaries
    let compressed = text
    if (summaries.length > 0) {
      const summarySection = `\nCSS PROPERTY SUMMARY:\n${summaries.join('\n')}\n`

      // Remove original repetitive CSS rules and add summary
      compressed = text.replace(cssRulePattern, '').replace(/\n{3,}/g, '\n\n')
      compressed += summarySection
    }

    return compressed
  }

  private async compressCSSData(text: string, preserve: string[]): Promise<string> {
    // Compress CSS-specific data while preserving design tokens
    const sections = text.split(/\n\n+/)
    const compressedSections: string[] = []

    sections.forEach(section => {
      const lowerSection = section.toLowerCase()

      // Preserve critical design token sections
      if (preserve.some(element => lowerSection.includes(element))) {
        compressedSections.push(section)
        return
      }

      // Compress CSS rules to key insights
      if (section.includes('{') && section.includes('}')) {
        const ruleCount = (section.match(/\{[^}]*\}/g) || []).length
        const uniqueProperties = new Set(
          (section.match(/([a-zA-Z-]+):/g) || []).map(match => match.replace(':', ''))
        )

        compressedSections.push(
          `CSS Section: ${ruleCount} rules, ${uniqueProperties.size} unique properties, key patterns: ${Array.from(uniqueProperties).slice(0, 5).join(', ')}`
        )
      } else {
        // Keep non-CSS sections but trim
        compressedSections.push(section.length > 200 ? section.substring(0, 200) + '...' : section)
      }
    })

    return compressedSections.join('\n\n')
  }

  private async consolidatePatterns(text: string, preserve: string[]): Promise<string> {
    // Identify and consolidate repeated patterns
    const patterns = new Map<string, number>()

    // Find repeated color patterns
    const colorPattern = /#[0-9a-fA-F]{6}|rgb\([^)]+\)|rgba\([^)]+\)/g
    const colors = text.match(colorPattern) || []
    colors.forEach(color => {
      patterns.set(color, (patterns.get(color) || 0) + 1)
    })

    // Find repeated spacing patterns
    const spacingPattern = /\b\d+px\b/g
    const spacings = text.match(spacingPattern) || []
    spacings.forEach(spacing => {
      patterns.set(spacing, (patterns.get(spacing) || 0) + 1)
    })

    // Create pattern summaries for frequently repeated items
    const patternSummaries: string[] = []
    patterns.forEach((count, pattern) => {
      if (count > 5) {
        patternSummaries.push(`${pattern} (used ${count} times)`)
      }
    })

    if (patternSummaries.length > 0) {
      const summaryText = `\nFREQUENT PATTERNS:\n${patternSummaries.slice(0, 20).join('\n')}\n`

      // Remove patterns from text and add summary
      let compressed = text
      patterns.forEach((count, pattern) => {
        if (count > 5) {
          const regex = new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')
          compressed = compressed.replace(regex, `[${pattern}]`)
        }
      })

      return compressed + summaryText
    }

    return text
  }

  private async extractKeyInsights(text: string, preserve: string[]): Promise<string> {
    // Extract only the most important insights and patterns
    const insights: string[] = []

    // Extract token summaries
    const tokenSections = text.match(/(?:colors?|typography|spacing|shadows?|radius|motion):\s*[^\n]+/gi) || []
    insights.push(...tokenSections.slice(0, 20))

    // Extract framework detection
    const frameworkMentions = text.match(/(?:tailwind|bootstrap|material|chakra|ant|semantic)[^.]*\./gi) || []
    insights.push(...frameworkMentions.slice(0, 5))

    // Extract accessibility insights
    const a11yMentions = text.match(/(?:contrast|wcag|aria|semantic|accessibility)[^.]*\./gi) || []
    insights.push(...a11yMentions.slice(0, 10))

    // Extract component patterns
    const componentMentions = text.match(/(?:button|form|card|navigation|modal)[^.]*\./gi) || []
    insights.push(...componentMentions.slice(0, 15))

    if (insights.length > 0) {
      return `KEY INSIGHTS:\n${insights.join('\n')}\n\n[Original content compressed - ${text.length} chars reduced to key insights]`
    }

    // Fallback: return first portion of text
    return text.substring(0, Math.floor(text.length * 0.3)) + '\n\n[Content truncated for cost optimization]'
  }

  // Quality assessment for compressed prompts
  private assessCompressionQuality(original: string, compressed: string, preserved: string[]): number {
    let quality = 50

    // Check preservation of critical elements
    preserved.forEach(element => {
      const originalCount = (original.toLowerCase().match(new RegExp(element, 'g')) || []).length
      const compressedCount = (compressed.toLowerCase().match(new RegExp(element, 'g')) || []).length

      const preservationRate = originalCount > 0 ? compressedCount / originalCount : 1
      quality += Math.min(10, preservationRate * 10)
    })

    // Penalize excessive reduction
    const reductionRate = (original.length - compressed.length) / original.length
    if (reductionRate > 0.9) {
      quality -= 20 // Too aggressive
    } else if (reductionRate < 0.3) {
      quality -= 10 // Not enough compression
    }

    // Check for structural integrity
    if (compressed.includes('SUMMARY') || compressed.includes('PATTERNS')) {
      quality += 15 // Good structure preservation
    }

    return Math.max(0, Math.min(100, quality))
  }

  // Two-phase prompting: compress then organize
  async twoPhasePrompt(
    extractedData: any,
    options: {
      url: string
      intent?: string
      maxTokens?: number
      targetCost?: number
    }
  ): Promise<{ compressed: any; organized: any; totalCost: number }> {
    const originalPrompt = JSON.stringify(extractedData, null, 2)
    const originalSize = await this.countTokens(originalPrompt)

    let phase1Data = extractedData
    let phase1Cost = 0

    // Phase 1: Compression (if needed)
    if (originalSize.tokens > 150000 || (options.targetCost && originalSize.estimatedCost > options.targetCost)) {
      const compressionResult = await this.compressExtractedData(extractedData)
      phase1Data = compressionResult.compressed
      phase1Cost = compressionResult.cost
    }

    // Phase 2: Organization with optimal model
    const phase2Size = await this.countTokens(JSON.stringify(phase1Data))
    const optimalModel = this.selectModelForSize(phase2Size.tokens, 'organize-pack')

    const organized = await this.organizeTokens(phase1Data, {
      ...options,
      model: optimalModel
    })

    return {
      compressed: phase1Data,
      organized: organized.data,
      totalCost: phase1Cost + organized.cost
    }
  }

  // Smart data compression specifically for design tokens
  async compressExtractedData(data: any): Promise<{ compressed: any; cost: number }> {
    const compressionPrompt = `Compress this design analysis data while preserving essential patterns:

DATA TO COMPRESS:
${JSON.stringify(data, null, 2)}

REQUIREMENTS:
1. Preserve all unique color values and their usage counts
2. Summarize repetitive spacing/typography values into ranges
3. Keep framework detection evidence but compress examples
4. Maintain accessibility-critical information
5. Compress component analysis to key patterns only
6. Preserve brand identity elements
7. Return structured JSON with compressed data

Focus on reducing token count while maintaining data integrity for design token generation.`

    try {
      const response = await this.makeCompressedRequest(compressionPrompt, 'gpt-5-nano')

      return {
        compressed: response.data,
        cost: response.usage.estimatedCost
      }

    } catch (error) {
      console.warn('AI compression failed, using deterministic compression:', error)

      // Fallback: deterministic compression
      const compressed = this.deterministicCompress(data)
      return {
        compressed,
        cost: 0 // No AI cost for fallback
      }
    }
  }

  // Deterministic compression fallback
  private deterministicCompress(data: any): any {
    const compressed: any = {}

    // Compress arrays to summaries + samples
    Object.entries(data).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        if (value.length > 10) {
          compressed[key] = {
            summary: `${value.length} items`,
            samples: value.slice(0, 5),
            patterns: this.extractPatterns(value),
            uniqueCount: new Set(value.map(v => typeof v === 'object' ? JSON.stringify(v) : v)).size
          }
        } else {
          compressed[key] = value
        }
      } else if (typeof value === 'object' && value !== null) {
        compressed[key] = this.deterministicCompress(value)
      } else {
        compressed[key] = value
      }
    })

    return compressed
  }

  // Pattern extraction from arrays
  private extractPatterns(arr: any[]): any {
    if (arr.length === 0) return {}

    const patterns: any = {}

    // For color arrays
    if (arr.some(item => typeof item === 'string' && (item.includes('#') || item.includes('rgb')))) {
      const hexColors = arr.filter(item => typeof item === 'string' && item.includes('#'))
      const rgbColors = arr.filter(item => typeof item === 'string' && item.includes('rgb'))

      patterns.colorTypes = {
        hex: hexColors.length,
        rgb: rgbColors.length,
        samples: [...hexColors.slice(0, 3), ...rgbColors.slice(0, 2)]
      }
    }

    // For spacing arrays
    if (arr.some(item => typeof item === 'string' && item.includes('px'))) {
      const pxValues = arr
        .filter(item => typeof item === 'string' && item.includes('px'))
        .map(item => parseFloat(item))
        .filter(num => !isNaN(num))
        .sort((a, b) => a - b)

      patterns.spacing = {
        range: { min: pxValues[0], max: pxValues[pxValues.length - 1] },
        scale: this.detectScale(pxValues),
        common: this.getMostCommon(pxValues, 5)
      }
    }

    // For typography arrays
    if (arr.some(item => typeof item === 'object' && item.family)) {
      const families = arr.map(item => item.family).filter(Boolean)
      const sizes = arr.map(item => item.size).filter(Boolean)

      patterns.typography = {
        families: [...new Set(families)],
        sizeRange: sizes.length > 0 ? {
          min: Math.min(...sizes.map(s => parseFloat(s))),
          max: Math.max(...sizes.map(s => parseFloat(s)))
        } : null
      }
    }

    return patterns
  }

  // Scale detection for spacing systems
  private detectScale(values: number[]): { type: string; base?: number; ratio?: number } {
    if (values.length < 3) return { type: 'arbitrary' }

    // Check for multiplicative scale (8px system)
    const bases = [4, 8, 16]
    for (const base of bases) {
      const isMultiplicative = values.every(v => v % base === 0)
      if (isMultiplicative) {
        return { type: 'multiplicative', base }
      }
    }

    // Check for geometric scale
    const ratios = []
    for (let i = 1; i < values.length; i++) {
      ratios.push(values[i] / values[i - 1])
    }

    const avgRatio = ratios.reduce((sum, r) => sum + r, 0) / ratios.length
    const isGeometric = ratios.every(r => Math.abs(r - avgRatio) < 0.2)

    if (isGeometric) {
      return { type: 'geometric', ratio: Math.round(avgRatio * 100) / 100 }
    }

    return { type: 'arbitrary' }
  }

  private getMostCommon<T>(arr: T[], count: number): T[] {
    const frequency = new Map<T, number>()
    arr.forEach(item => {
      frequency.set(item, (frequency.get(item) || 0) + 1)
    })

    return Array.from(frequency.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, count)
      .map(([item]) => item)
  }

  // Model selection optimization
  private selectModelForSize(tokens: number, operation: string): string {
    if (tokens <= 50000 && operation === 'organize-pack') {
      return 'gpt-5-mini' // Cheap and fast
    }

    if (tokens <= 200000) {
      return 'gpt-5-mini' // Still within range
    }

    if (tokens <= 1000000) {
      return 'gemini-2.5-flash-lite' // Large context
    }

    // Need compression first
    return 'gpt-5-nano' // Ultra-cheap for compression
  }

  // Cost-optimized request with automatic fallbacks
  private async makeCompressedRequest(prompt: string, preferredModel: string): Promise<any> {
    const size = await this.countTokens(prompt, preferredModel)

    // Check if we need to compress further
    if (size.estimatedCost > 0.10) { // $0.10 threshold
      const compressed = await this.compressPrompt(prompt, [], 0.5)
      prompt = compressed.compressed
    }

    // Make the actual request
    const response = await this.client.chat.completions.create({
      model: preferredModel,
      messages: [
        {
          role: 'system',
          content: this.getSystemPrompt('compress')
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 4096,
      temperature: 0.1
    })

    const content = response.choices[0]?.message?.content
    let data: any

    try {
      data = JSON.parse(content || '{}')
    } catch {
      // If not JSON, return as text
      data = content
    }

    return {
      data,
      usage: {
        inputTokens: response.usage?.prompt_tokens || size.tokens,
        outputTokens: response.usage?.completion_tokens || 0,
        estimatedCost: size.estimatedCost
      }
    }
  }

  // Token organization with cost optimization
  async organizeTokens(data: any, options: {
    url: string
    model?: string
    intent?: string
    maxCost?: number
  }): Promise<{ data: any; cost: number }> {
    let prompt = this.buildOptimizedOrganizePrompt(data, options)
    const size = await this.countTokens(prompt)

    // Auto-select model based on size and budget
    const model = options.model || this.selectModelForSize(size.tokens, 'organize-pack')

    // Budget check
    if (options.maxCost && size.estimatedCost > options.maxCost) {
      // Compress to fit budget
      const targetReduction = 1 - (options.maxCost / size.estimatedCost)
      const compressed = await this.compressPrompt(prompt, ['colors', 'typography'], targetReduction)
      prompt = compressed.compressed
    }

    const response = await this.client.chat.completions.create({
      model,
      messages: [
        {
          role: 'system',
          content: this.getSystemPrompt('organize-pack')
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 8192,
      temperature: 0.3,
      response_format: { type: 'json_object' }
    })

    const content = response.choices[0]?.message?.content
    const organized = JSON.parse(content || '{}')

    const inputTokens = response.usage?.prompt_tokens || 0
    const outputTokens = response.usage?.completion_tokens || 0
    const modelConfig = this.getModelConfig(model)
    const cost = this.calculateInputCost(inputTokens, modelConfig) + this.calculateOutputCost(outputTokens, modelConfig)

    return {
      data: organized,
      cost
    }
  }

  private buildOptimizedOrganizePrompt(data: any, options: any): string {
    // Build a cost-optimized prompt that focuses on essentials
    const essentialData = this.extractEssentials(data)

    return `Organize these design tokens for ${options.url}:

ESSENTIAL DATA:
${JSON.stringify(essentialData, null, 2)}

INTENT: ${options.intent || 'component-authoring'}

Generate a complete design token pack with:
1. Semantic token names (color.primary, spacing.md, etc.)
2. Tailwind CSS configuration mappings
3. Accessibility recommendations
4. Implementation guidelines
5. Common pitfalls to avoid

Return valid JSON only.`
  }

  // Extract only essential data for token organization
  private extractEssentials(data: any): any {
    const essential: any = {}

    // Colors: top 20 most used
    if (data.colors) {
      essential.colors = Array.isArray(data.colors)
        ? data.colors.slice(0, 20)
        : data.colors
    }

    // Typography: families and top sizes
    if (data.typography) {
      essential.typography = {
        families: data.typography.families?.slice(0, 5),
        sizes: data.typography.sizes?.slice(0, 10),
        weights: data.typography.weights?.slice(0, 8)
      }
    }

    // Spacing: detected scale and common values
    if (data.spacing) {
      essential.spacing = {
        scale: data.spacing.scale?.slice(0, 15),
        base: data.spacing.base,
        patterns: data.spacing.patterns?.slice(0, 5)
      }
    }

    // Components: key patterns only
    if (data.components) {
      essential.components = {
        buttons: data.components.buttons?.variants?.slice(0, 5),
        forms: data.components.forms?.summary,
        navigation: data.components.navigation?.primary
      }
    }

    // Frameworks: detected systems
    if (data.frameworks) {
      essential.frameworks = data.frameworks.detected?.slice(0, 3)
    }

    // Accessibility: critical issues only
    if (data.accessibility) {
      essential.accessibility = {
        contrastIssues: data.accessibility.contrast?.violations?.slice(0, 5),
        semanticIssues: data.accessibility.semantic?.violations?.slice(0, 3)
      }
    }

    return essential
  }

  // Cost calculation helpers
  private getModelConfig(model: string): ModelConfig {
    return this.models.get(model) || this.models.get('gpt-5-mini')!
  }

  private calculateInputCost(tokens: number, model: ModelConfig): number {
    return (tokens / 1000000) * model.costPer1MInput
  }

  private calculateOutputCost(tokens: number, model: ModelConfig): number {
    return (tokens / 1000000) * model.costPer1MOutput
  }

  // Analytics and monitoring
  getCostAnalytics(): {
    totalRequests: number
    totalCost: number
    averageCost: number
    costByModel: Map<string, number>
    tokensSaved: number
    compressionEfficiency: number
  } {
    return {
      totalRequests: this.stats.requests,
      totalCost: this.stats.totalCost,
      averageCost: this.stats.totalCost / Math.max(1, this.stats.requests),
      costByModel: new Map(), // Would track per model in production
      tokensSaved: 0, // Would track compression savings
      compressionEfficiency: this.compressionCache.size > 0
        ? Array.from(this.compressionCache.values()).reduce((sum, comp) => sum + comp.reduction, 0) / this.compressionCache.size
        : 0
    }
  }

  // Budget management
  async estimateOperationCost(
    operation: 'organize-pack' | 'research' | 'audit' | 'compress',
    dataSize: number,
    options: { model?: string; quality?: 'basic' | 'standard' | 'premium' } = {}
  ): Promise<{
    estimatedCost: number
    recommendedModel: string
    alternatives: Array<{ model: string; cost: number; quality: number }>
  }> {
    const models = ['gpt-5-nano', 'gpt-5-mini', 'gemini-2.5-flash-lite', 'claude-3.7-sonnet']
    const estimates = models.map(model => {
      const config = this.getModelConfig(model)
      const inputCost = this.calculateInputCost(dataSize, config)
      const outputCost = this.calculateOutputCost(2000, config) // Estimated output

      return {
        model,
        cost: inputCost + outputCost,
        quality: this.getModelQuality(model, operation)
      }
    })

    const recommended = estimates.find(e => e.quality >= 80 && e.cost < 0.05) || estimates[0]

    return {
      estimatedCost: recommended.cost,
      recommendedModel: recommended.model,
      alternatives: estimates.sort((a, b) => a.cost - b.cost)
    }
  }

  private getModelQuality(model: string, operation: string): number {
    const qualityMatrix: { [key: string]: { [key: string]: number } } = {
      'gpt-5-nano': { 'compress': 85, 'organize-pack': 70, 'research': 60, 'audit': 50 },
      'gpt-5-mini': { 'compress': 80, 'organize-pack': 90, 'research': 85, 'audit': 80 },
      'gemini-2.5-flash-lite': { 'compress': 75, 'organize-pack': 85, 'research': 95, 'audit': 75 },
      'claude-3.7-sonnet': { 'compress': 70, 'organize-pack': 95, 'research': 90, 'audit': 98 }
    }

    return qualityMatrix[model]?.[operation] || 70
  }

  // Batch processing for cost efficiency
  async batchProcess(
    requests: Array<{ data: any; options: any }>,
    maxConcurrency: number = 3
  ): Promise<Array<{ result: any; cost: number; error?: string }>> {
    const results: Array<{ result: any; cost: number; error?: string }> = []

    // Process in batches to avoid rate limits
    for (let i = 0; i < requests.length; i += maxConcurrency) {
      const batch = requests.slice(i, i + maxConcurrency)

      const batchPromises = batch.map(async ({ data, options }) => {
        try {
          const result = await this.twoPhasePrompt(data, options)
          return { result: result.organized, cost: result.totalCost }
        } catch (error) {
          return {
            result: null,
            cost: 0,
            error: error instanceof Error ? error.message : 'Unknown error'
          }
        }
      })

      const batchResults = await Promise.allSettled(batchPromises)
      results.push(...batchResults.map(r =>
        r.status === 'fulfilled' ? r.value : { result: null, cost: 0, error: 'Promise rejected' }
      ))

      // Rate limiting delay between batches
      if (i + maxConcurrency < requests.length) {
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    }

    return results
  }

  // System prompt optimization
  private getSystemPrompt(operation: string): string {
    // Return appropriate system prompt based on operation
    const prompts: { [key: string]: string } = {
      'organize-pack': `You are a design token expert. Organize extracted CSS data into semantic W3C design tokens with Tailwind mappings and implementation guidance. Return valid JSON only.`,

      'compress': `You are a data compression specialist. Reduce token count by 70% while preserving essential design patterns, unique values, and accessibility information. Return compressed JSON.`,

      'research': `You are a design system researcher. Analyze documentation and artifacts to validate and improve extracted design tokens. Return structured research insights in JSON.`,

      'audit': `You are a design system quality auditor. Review token packs for consistency, accessibility, and implementation accuracy. Return audit findings in JSON.`
    }

    return prompts[operation] || prompts['organize-pack']
  }
}

// Global cost optimizer instance
export const costOptimizer = new CostOptimizer()