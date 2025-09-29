import OpenAI from 'openai'
import { z } from 'zod'

export interface AIGatewayConfig {
  baseURL: string
  apiKey: string
  defaultModel: string
  fallbackModel?: string
  maxRetries: number
  timeout: number
}

export interface ModelConfig {
  name: string
  provider: 'openai' | 'google' | 'anthropic'
  maxTokens: number
  costPer1MInput: number
  costPer1MOutput: number
  specialization: string[]
  contextWindow: number
}

export interface AIRequest {
  prompt: string
  schema?: z.ZodSchema
  model?: string
  maxTokens?: number
  temperature?: number
  metadata?: {
    operation: string
    url?: string
    strategy?: string
    priority?: 'low' | 'normal' | 'high' | 'critical'
  }
}

export interface AIResponse<T = any> {
  data: T
  model: string
  usage: {
    inputTokens: number
    outputTokens: number
    totalTokens: number
    estimatedCost: number
  }
  performance: {
    latency: number
    cached: boolean
    retries: number
  }
  metadata: {
    requestId: string
    timestamp: string
    quality: number
  }
}

export class AIGatewayClient {
  private models: Map<string, ModelConfig> = new Map()
  private client: OpenAI
  private stats = {
    requests: 0,
    totalCost: 0,
    totalTokens: 0,
    cacheHits: 0,
    errors: 0
  }

  constructor(config: AIGatewayConfig) {
    this.client = new OpenAI({
      baseURL: config.baseURL,
      apiKey: config.apiKey
    })

    this.initializeModels()
  }

  private initializeModels() {
    // Primary organizer - cheap, fast, reliable
    this.models.set('gpt-5-mini', {
      name: 'gpt-5-mini',
      provider: 'openai',
      maxTokens: 16384,
      costPer1MInput: 0.25,
      costPer1MOutput: 2.00,
      specialization: ['organization', 'json-generation', 'mapping-hints', 'naming'],
      contextWindow: 400000
    })

    // Large context specialist - handles big research payloads
    this.models.set('gemini-2.5-flash-lite', {
      name: 'gemini-2.5-flash-lite',
      provider: 'google',
      maxTokens: 8192,
      costPer1MInput: 0.10,
      costPer1MOutput: 0.40,
      specialization: ['research', 'summarization', 'large-context'],
      contextWindow: 1000000
    })

    // High-accuracy judge - expensive but precise
    this.models.set('claude-3.7-sonnet', {
      name: 'claude-3.7-sonnet',
      provider: 'anthropic',
      maxTokens: 8192,
      costPer1MInput: 3.00,
      costPer1MOutput: 15.00,
      specialization: ['quality-assurance', 'complex-reasoning', 'audit'],
      contextWindow: 200000
    })

    // Ultra-cheap compressor
    this.models.set('gpt-5-nano', {
      name: 'gpt-5-nano',
      provider: 'openai',
      maxTokens: 4096,
      costPer1MInput: 0.05,
      costPer1MOutput: 0.40,
      specialization: ['compression', 'extraction', 'summarization'],
      contextWindow: 128000
    })

    // Alternative options
    this.models.set('gpt-4.1-mini', {
      name: 'gpt-4.1-mini',
      provider: 'openai',
      maxTokens: 16384,
      costPer1MInput: 0.40,
      costPer1MOutput: 1.60,
      specialization: ['organization', 'reasoning'],
      contextWindow: 1000000
    })
  }

  // Smart model selection based on context and requirements
  selectOptimalModel(
    inputSize: number,
    operation: string,
    priority: 'low' | 'normal' | 'high' | 'critical' = 'normal',
    budget?: number
  ): string {
    // Decision tree implementation
    if (inputSize <= 200000 && ['organize-pack', 'naming', 'mapping'].includes(operation)) {
      return 'gpt-5-mini' // Default workhorse
    }

    if (inputSize > 200000 && inputSize <= 1000000) {
      return 'gemini-2.5-flash-lite' // Large context specialist
    }

    if (priority === 'critical' || operation === 'audit' || operation === 'quality-check') {
      return 'claude-3.7-sonnet' // High-accuracy judge
    }

    if (operation === 'compress' || operation === 'extract-summary') {
      return 'gpt-5-nano' // Ultra-cheap compressor
    }

    // Budget-aware selection
    if (budget && budget < 0.05) {
      return 'gpt-5-nano'
    }

    // Fallback to primary workhorse
    return 'gpt-5-mini'
  }

  // Main AI request handler with automatic routing
  async request<T>(request: AIRequest): Promise<AIResponse<T>> {
    const startTime = Date.now()
    const requestId = this.generateRequestId()

    try {
      // Estimate input token count
      const inputTokens = this.estimateTokens(request.prompt)

      // Select optimal model
      const selectedModel = request.model || this.selectOptimalModel(
        inputTokens,
        request.metadata?.operation || 'organize-pack',
        request.metadata?.priority
      )

      const modelConfig = this.models.get(selectedModel)
      if (!modelConfig) {
        throw new Error(`Unknown model: ${selectedModel}`)
      }

      // Check context window limits
      if (inputTokens > modelConfig.contextWindow) {
        // Auto-switch to larger context model or compress
        if (modelConfig.contextWindow < 1000000) {
          return await this.request<T>({
            ...request,
            model: 'gemini-2.5-flash-lite'
          })
        } else {
          // Need compression
          const compressed = await this.compressPrompt(request.prompt)
          return await this.request<T>({
            ...request,
            prompt: compressed
          })
        }
      }

      // Execute request with retry logic
      const response = await this.executeWithRetries(request, selectedModel, modelConfig)

      // Validate response if schema provided
      if (request.schema) {
        try {
          const validated = request.schema.parse(response.data)
          response.data = validated
        } catch (validationError) {
          // Auto-repair attempt
          const repaired = await this.attemptAutoRepair(response.data, request.schema, selectedModel)
          if (repaired) {
            response.data = repaired
          } else {
            throw new Error(`Response validation failed: ${validationError}`)
          }
        }
      }

      // Update statistics
      this.updateStats(response)

      return response

    } catch (error) {
      this.stats.errors++
      console.error(`AI request failed [${requestId}]:`, error)
      throw error
    }
  }

  private async executeWithRetries(
    request: AIRequest,
    modelName: string,
    modelConfig: ModelConfig,
    retries = 0
  ): Promise<AIResponse> {
    try {
      const startTime = Date.now()

      const completion = await this.client.chat.completions.create({
        model: modelName,
        messages: [
          {
            role: 'system',
            content: this.getSystemPrompt(request.metadata?.operation || 'organize-pack')
          },
          {
            role: 'user',
            content: request.prompt
          }
        ],
        max_tokens: request.maxTokens || modelConfig.maxTokens,
        temperature: request.temperature || 0.3,
        response_format: request.schema ? { type: 'json_object' } : undefined
      })

      const response = completion.choices[0]?.message?.content
      if (!response) {
        throw new Error('No response content')
      }

      // Parse JSON if expected
      let data: any = response
      if (request.schema || request.metadata?.operation?.includes('pack')) {
        try {
          data = JSON.parse(response)
        } catch (parseError) {
          // Try to extract JSON from response
          const jsonMatch = response.match(/\{[\s\S]*\}/)
          if (jsonMatch) {
            data = JSON.parse(jsonMatch[0])
          } else {
            throw new Error('Invalid JSON response')
          }
        }
      }

      const latency = Date.now() - startTime
      const inputTokens = completion.usage?.prompt_tokens || this.estimateTokens(request.prompt)
      const outputTokens = completion.usage?.completion_tokens || this.estimateTokens(response)

      return {
        data,
        model: modelName,
        usage: {
          inputTokens,
          outputTokens,
          totalTokens: inputTokens + outputTokens,
          estimatedCost: this.calculateCost(inputTokens, outputTokens, modelConfig)
        },
        performance: {
          latency,
          cached: false, // Would detect from headers in production
          retries
        },
        metadata: {
          requestId: this.generateRequestId(),
          timestamp: new Date().toISOString(),
          quality: this.assessResponseQuality(data, request)
        }
      }

    } catch (error) {
      if (retries < 3 && this.isRetryableError(error)) {
        // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, retries) * 1000))
        return this.executeWithRetries(request, modelName, modelConfig, retries + 1)
      }
      throw error
    }
  }

  // System prompts optimized for each operation
  private getSystemPrompt(operation: string): string {
    const basePrompt = `You are ContextDS AI, a specialized design token analysis expert. You provide precise, actionable guidance for developers using design tokens.`

    switch (operation) {
      case 'organize-pack':
        return `${basePrompt}

Your task is to organize extracted design tokens into a coherent, usable format with implementation guidance.

REQUIREMENTS:
1. Generate valid JSON matching the provided schema
2. Provide semantic naming suggestions for tokens
3. Include Tailwind CSS mapping hints
4. Flag potential accessibility issues
5. Suggest consistent naming conventions
6. Keep responses concise and actionable

RESPONSE FORMAT: Valid JSON only, no markdown or explanation.`

      case 'compress':
        return `${basePrompt}

Your task is to compress and summarize large CSS analysis data while preserving essential information.

REQUIREMENTS:
1. Extract key patterns, unique values, and outliers
2. Summarize color palettes, typography scales, spacing systems
3. Identify framework signatures and component patterns
4. Preserve accessibility-critical information
5. Reduce token count by 70-80% while maintaining accuracy

RESPONSE FORMAT: Compressed JSON summary.`

      case 'research':
        return `${basePrompt}

Your task is to analyze design system artifacts and documentation to enrich token analysis.

REQUIREMENTS:
1. Synthesize information from multiple sources
2. Identify official design system patterns
3. Validate extracted tokens against documentation
4. Suggest improvements based on established patterns
5. Flag inconsistencies between implementation and documentation

RESPONSE FORMAT: Valid JSON with research insights.`

      case 'audit':
        return `${basePrompt}

Your task is to perform quality assurance on generated design token packs.

REQUIREMENTS:
1. Validate naming consistency and semantic accuracy
2. Check for accessibility compliance issues
3. Identify contradictions or inconsistencies
4. Suggest improvements without rewriting
5. Flag critical issues that need human review

RESPONSE FORMAT: Audit report in JSON format.`

      default:
        return basePrompt
    }
  }

  // Prompt compression for large contexts
  private async compressPrompt(prompt: string): Promise<string> {
    if (this.estimateTokens(prompt) < 100000) {
      return prompt // No compression needed
    }

    try {
      const compression = await this.request({
        prompt: `Compress this design analysis data while preserving essential patterns and unique values:\n\n${prompt}`,
        model: 'gpt-5-nano',
        metadata: { operation: 'compress', priority: 'normal' }
      })

      return compression.data as string

    } catch (error) {
      console.warn('Prompt compression failed, using truncation:', error)
      // Fallback to truncation
      return prompt.substring(0, 50000) + '\n\n[Content truncated for processing]'
    }
  }

  // Auto-repair for failed JSON validation
  private async attemptAutoRepair<T>(
    invalidData: any,
    schema: z.ZodSchema<T>,
    model: string
  ): Promise<T | null> {
    try {
      const repairPrompt = `Fix this JSON to match the required schema. Return only valid JSON:

INVALID JSON:
${JSON.stringify(invalidData, null, 2)}

SCHEMA REQUIREMENTS:
${this.schemaToDescription(schema)}

Return only the corrected JSON, no explanation.`

      const repair = await this.client.chat.completions.create({
        model,
        messages: [
          { role: 'system', content: 'You are a JSON repair specialist. Fix invalid JSON to match schemas.' },
          { role: 'user', content: repairPrompt }
        ],
        max_tokens: 4096,
        temperature: 0.1
      })

      const repairedJSON = repair.choices[0]?.message?.content
      if (repairedJSON) {
        const parsed = JSON.parse(repairedJSON)
        return schema.parse(parsed) // Validate again
      }

      return null

    } catch (error) {
      console.warn('Auto-repair failed:', error)
      return null
    }
  }

  // Cost calculation and tracking
  private calculateCost(inputTokens: number, outputTokens: number, model: ModelConfig): number {
    const inputCost = (inputTokens / 1000000) * model.costPer1MInput
    const outputCost = (outputTokens / 1000000) * model.costPer1MOutput
    return inputCost + outputCost
  }

  // Token estimation (rough approximation)
  private estimateTokens(text: string): number {
    // Rough estimate: 1 token ≈ 4 characters for English text
    return Math.ceil(text.length / 4)
  }

  // Response quality assessment
  private assessResponseQuality(data: any, request: AIRequest): number {
    let quality = 50

    // JSON validity
    if (typeof data === 'object' && data !== null) {
      quality += 20
    }

    // Schema compliance
    if (request.schema) {
      try {
        request.schema.parse(data)
        quality += 20
      } catch {
        quality -= 10
      }
    }

    // Content richness
    if (data && typeof data === 'object') {
      const keys = Object.keys(data)
      quality += Math.min(10, keys.length)

      // Check for empty values
      const emptyValues = keys.filter(key => !data[key] || data[key] === '').length
      quality -= emptyValues * 2
    }

    return Math.max(0, Math.min(100, quality))
  }

  private updateStats(response: AIResponse): void {
    this.stats.requests++
    this.stats.totalCost += response.usage.estimatedCost
    this.stats.totalTokens += response.usage.totalTokens

    if (response.performance.cached) {
      this.stats.cacheHits++
    }
  }

  private isRetryableError(error: any): boolean {
    const retryablePatterns = [
      'timeout',
      'rate limit',
      'server error',
      '429',
      '500',
      '502',
      '503',
      '504'
    ]

    const errorMessage = error.message?.toLowerCase() || ''
    return retryablePatterns.some(pattern => errorMessage.includes(pattern))
  }

  private schemaToDescription(schema: z.ZodSchema): string {
    // Convert Zod schema to human-readable description
    try {
      return `Required JSON structure with proper types and required fields`
    } catch {
      return 'Valid JSON object'
    }
  }

  private generateRequestId(): string {
    return `ctx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  // Public API methods
  async organizeTokenPack(
    extractedData: any,
    options: {
      url: string
      intent?: 'component-authoring' | 'marketing-site'
      framework?: string
      complexity?: 'simple' | 'complex'
    }
  ): Promise<AIResponse> {
    const inputSize = this.estimateTokens(JSON.stringify(extractedData))
    const model = this.selectOptimalModel(inputSize, 'organize-pack')

    const prompt = this.buildOrganizePrompt(extractedData, options)

    return await this.request({
      prompt,
      model,
      schema: this.getTokenPackSchema(),
      metadata: {
        operation: 'organize-pack',
        url: options.url,
        strategy: 'token-organization',
        priority: 'normal'
      }
    })
  }

  async researchDesignSystem(
    artifacts: {
      docs: string[]
      storybook?: string
      github?: any
      designTokens?: any
    },
    url: string
  ): Promise<AIResponse> {
    const inputSize = this.estimateTokens(JSON.stringify(artifacts))

    // Always use large context model for research
    const model = inputSize > 800000 ? 'gemini-2.5-flash-lite' : 'gpt-4.1-mini'

    const prompt = this.buildResearchPrompt(artifacts, url)

    return await this.request({
      prompt,
      model,
      schema: this.getResearchSchema(),
      metadata: {
        operation: 'research',
        url,
        strategy: 'design-system-research',
        priority: 'normal'
      }
    })
  }

  async auditTokenPack(
    tokenPack: any,
    originalData: any
  ): Promise<AIResponse> {
    const prompt = this.buildAuditPrompt(tokenPack, originalData)

    return await this.request({
      prompt,
      model: 'claude-3.7-sonnet', // Always use high-accuracy model for audits
      schema: this.getAuditSchema(),
      metadata: {
        operation: 'audit',
        strategy: 'quality-assurance',
        priority: 'high'
      }
    })
  }

  // Prompt builders
  private buildOrganizePrompt(data: any, options: any): string {
    return `Organize these extracted design tokens into a comprehensive design system pack:

EXTRACTED DATA:
${JSON.stringify(data, null, 2)}

CONTEXT:
- URL: ${options.url}
- Intent: ${options.intent || 'component-authoring'}
- Framework: ${options.framework || 'unknown'}

REQUIREMENTS:
1. Organize tokens into semantic categories (colors, typography, spacing, etc.)
2. Suggest consistent naming conventions
3. Provide Tailwind CSS mapping hints
4. Include accessibility recommendations
5. Flag potential issues or inconsistencies
6. Generate implementation guidance

Focus on creating actionable, developer-friendly token organization.`
  }

  private buildResearchPrompt(artifacts: any, url: string): string {
    return `Analyze these design system artifacts to enrich token analysis:

ARTIFACTS:
${JSON.stringify(artifacts, null, 2)}

URL: ${url}

REQUIREMENTS:
1. Identify official design system patterns
2. Validate extracted tokens against documentation
3. Find gaps between documentation and implementation
4. Suggest token improvements based on best practices
5. Identify framework-specific optimizations

Provide comprehensive research insights to improve token accuracy.`
  }

  private buildAuditPrompt(tokenPack: any, originalData: any): string {
    return `Audit this design token pack for quality and consistency:

TOKEN PACK:
${JSON.stringify(tokenPack, null, 2)}

ORIGINAL DATA:
${JSON.stringify(originalData, null, 2)}

AUDIT FOCUS:
1. Naming consistency and semantic accuracy
2. Accessibility compliance issues
3. Token value accuracy and precision
4. Missing or redundant tokens
5. Implementation guidance quality

Provide a concise audit report with actionable recommendations.`
  }

  // Schema definitions
  private getTokenPackSchema() {
    return z.object({
      metadata: z.object({
        name: z.string(),
        version: z.string(),
        description: z.string(),
        url: z.string(),
        extractedAt: z.string(),
        confidence: z.number().min(0).max(100)
      }),
      tokens: z.object({
        colors: z.array(z.object({
          name: z.string(),
          value: z.string(),
          type: z.literal('color'),
          semantic: z.string().optional(),
          accessibility: z.object({
            contrastRatio: z.number().optional(),
            wcagLevel: z.enum(['AA', 'AAA', 'fail']).optional()
          }).optional()
        })),
        typography: z.array(z.object({
          name: z.string(),
          value: z.string(),
          type: z.literal('typography'),
          property: z.enum(['font-family', 'font-size', 'font-weight', 'line-height']),
          role: z.enum(['primary', 'secondary', 'accent', 'monospace']).optional()
        })),
        spacing: z.array(z.object({
          name: z.string(),
          value: z.string(),
          type: z.literal('spacing'),
          scale: z.number().optional(),
          consistency: z.number().optional()
        }))
      }),
      mappingHints: z.object({
        tailwind: z.object({
          colors: z.string(),
          spacing: z.string(),
          typography: z.string(),
          borderRadius: z.string().optional(),
          boxShadow: z.string().optional()
        }),
        cssVariables: z.object({
          recommendation: z.string(),
          example: z.string()
        }),
        framework: z.object({
          specific: z.string(),
          integration: z.string()
        }).optional()
      }),
      guidelines: z.object({
        usage: z.array(z.string()),
        pitfalls: z.array(z.string()),
        accessibility: z.array(z.string()),
        performance: z.array(z.string())
      }),
      quality: z.object({
        score: z.number().min(0).max(100),
        confidence: z.number().min(0).max(100),
        completeness: z.number().min(0).max(100),
        issues: z.array(z.string())
      })
    })
  }

  private getResearchSchema() {
    return z.object({
      findings: z.object({
        officialTokens: z.array(z.string()),
        documentedPatterns: z.array(z.string()),
        gaps: z.array(z.string()),
        inconsistencies: z.array(z.string())
      }),
      recommendations: z.object({
        tokenImprovements: z.array(z.string()),
        namingAdjustments: z.array(z.string()),
        frameworkOptimizations: z.array(z.string())
      }),
      confidence: z.number().min(0).max(100),
      sources: z.array(z.object({
        type: z.string(),
        url: z.string(),
        relevance: z.number().min(0).max(100)
      }))
    })
  }

  private getAuditSchema() {
    return z.object({
      overall: z.object({
        score: z.number().min(0).max(100),
        status: z.enum(['excellent', 'good', 'needs-improvement', 'poor']),
        summary: z.string()
      }),
      categories: z.object({
        naming: z.object({ score: z.number().min(0).max(100), issues: z.array(z.string()) }),
        accessibility: z.object({ score: z.number().min(0).max(100), issues: z.array(z.string()) }),
        consistency: z.object({ score: z.number().min(0).max(100), issues: z.array(z.string()) }),
        completeness: z.object({ score: z.number().min(0).max(100), issues: z.array(z.string()) })
      }),
      recommendations: z.array(z.object({
        priority: z.enum(['low', 'medium', 'high', 'critical']),
        category: z.string(),
        description: z.string(),
        solution: z.string()
      })),
      redFlags: z.array(z.string())
    })
  }

  // Statistics and monitoring
  getStats() {
    return {
      ...this.stats,
      averageCost: this.stats.totalCost / Math.max(1, this.stats.requests),
      cacheHitRate: (this.stats.cacheHits / Math.max(1, this.stats.requests)) * 100,
      errorRate: (this.stats.errors / Math.max(1, this.stats.requests)) * 100
    }
  }

  resetStats() {
    this.stats = {
      requests: 0,
      totalCost: 0,
      totalTokens: 0,
      cacheHits: 0,
      errors: 0
    }
  }
}

// Global gateway instance
export const aiGateway = new AIGatewayClient({
  baseURL: 'https://gateway.ai.cloudflare.com/v1/account/workersai/openai',
  apiKey: process.env.AI_GATEWAY_API_KEY!,
  defaultModel: 'gpt-5-mini',
  maxRetries: 3,
  timeout: 30000
})

// Route-specific clients
export const routes = {
  organizePack: (data: any, options: any) => aiGateway.organizeTokenPack(data, options),
  research: (artifacts: any, url: string) => aiGateway.researchDesignSystem(artifacts, url),
  audit: (pack: any, original: any) => aiGateway.auditTokenPack(pack, original),
  compress: (prompt: string) => aiGateway.request({
    prompt: `Compress this data while preserving key patterns: ${prompt}`,
    model: 'gpt-5-nano',
    metadata: { operation: 'compress' }
  })
}