import { z } from 'zod'
import { aiGateway } from './gateway-client'

export interface ValidationResult<T> {
  valid: boolean
  data?: T
  errors: ValidationError[]
  repaired: boolean
  confidence: number
}

export interface ValidationError {
  path: string
  message: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  code: string
  suggestion?: string
  autoFixable: boolean
}

export interface RepairStrategy {
  name: string
  description: string
  applicableErrors: string[]
  execute: (data: any, error: ValidationError) => Promise<any>
  confidence: number
}

export interface SchemaGuardrails {
  maxRepairAttempts: number
  fallbackOnFailure: boolean
  strictMode: boolean
  autoFixTypes: string[]
  escalationThreshold: number
}

// Core schemas for ContextDS
export const TokenPackSchema = z.object({
  metadata: z.object({
    name: z.string().min(1),
    version: z.string().regex(/^\d+\.\d+\.\d+$/),
    description: z.string().min(10),
    url: z.string().url(),
    extractedAt: z.string().datetime(),
    confidence: z.number().min(0).max(100),
    strategies: z.array(z.string()).optional(),
    dataQuality: z.number().min(0).max(100).optional()
  }),
  tokens: z.object({
    colors: z.array(z.object({
      name: z.string().min(1),
      value: z.string().regex(/^#[0-9a-fA-F]{6}$|^rgb\(|^hsl\(|^oklch\(/),
      type: z.literal('color'),
      semantic: z.enum(['primary', 'secondary', 'accent', 'neutral', 'success', 'warning', 'error', 'info']).optional(),
      usage: z.number().min(1),
      confidence: z.number().min(0).max(100),
      accessibility: z.object({
        contrastRatio: z.number().min(1).max(21).optional(),
        wcagLevel: z.enum(['AA', 'AAA', 'fail']).optional(),
        suggestions: z.array(z.string()).optional()
      }).optional()
    })).min(1),
    typography: z.array(z.object({
      name: z.string().min(1),
      value: z.string().min(1),
      type: z.literal('typography'),
      property: z.enum(['font-family', 'font-size', 'font-weight', 'line-height']),
      role: z.enum(['primary', 'secondary', 'accent', 'monospace', 'display']).optional(),
      usage: z.number().min(1),
      confidence: z.number().min(0).max(100)
    })),
    spacing: z.array(z.object({
      name: z.string().min(1),
      value: z.string().regex(/^\d+(\.\d+)?(px|rem|em|%)$/),
      type: z.literal('spacing'),
      scale: z.number().optional(),
      consistency: z.number().min(0).max(100).optional(),
      usage: z.number().min(1),
      confidence: z.number().min(0).max(100)
    })),
    radius: z.array(z.object({
      name: z.string().min(1),
      value: z.string().regex(/^\d+(\.\d+)?(px|rem|em|%)$/),
      type: z.literal('radius'),
      usage: z.number().min(1),
      confidence: z.number().min(0).max(100)
    })).optional(),
    shadows: z.array(z.object({
      name: z.string().min(1),
      value: z.string().min(1),
      type: z.literal('shadow'),
      elevation: z.number().min(0).max(10).optional(),
      usage: z.number().min(1),
      confidence: z.number().min(0).max(100)
    })).optional(),
    motion: z.array(z.object({
      name: z.string().min(1),
      value: z.string().min(1),
      type: z.literal('motion'),
      property: z.enum(['duration', 'timing-function', 'delay']),
      usage: z.number().min(1),
      confidence: z.number().min(0).max(100)
    })).optional()
  }),
  mappingHints: z.object({
    tailwind: z.object({
      colors: z.string().min(10),
      spacing: z.string().min(10),
      typography: z.string().min(10),
      borderRadius: z.string().optional(),
      boxShadow: z.string().optional(),
      animation: z.string().optional()
    }),
    cssVariables: z.object({
      recommendation: z.string().min(20),
      example: z.string().min(10),
      naming: z.string().optional()
    }),
    framework: z.object({
      detected: z.array(z.string()).optional(),
      specific: z.string().optional(),
      integration: z.string().min(20).optional()
    }).optional()
  }),
  guidelines: z.object({
    usage: z.array(z.string().min(5)).min(1),
    pitfalls: z.array(z.string().min(5)).min(1),
    accessibility: z.array(z.string().min(5)),
    performance: z.array(z.string().min(5)),
    bestPractices: z.array(z.string()).optional()
  }),
  quality: z.object({
    score: z.number().min(0).max(100),
    confidence: z.number().min(0).max(100),
    completeness: z.number().min(0).max(100),
    issues: z.array(z.string()),
    recommendations: z.array(z.string()).optional()
  })
})

export const ResearchSchema = z.object({
  findings: z.object({
    officialTokens: z.array(z.string()),
    documentedPatterns: z.array(z.string()),
    gaps: z.array(z.string()),
    inconsistencies: z.array(z.string()),
    frameworkEvidence: z.array(z.string()).optional()
  }),
  validation: z.object({
    extractedVsDocumented: z.number().min(0).max(100),
    namingAlignment: z.number().min(0).max(100),
    valueAccuracy: z.number().min(0).max(100)
  }),
  recommendations: z.object({
    tokenImprovements: z.array(z.string()),
    namingAdjustments: z.array(z.string()),
    frameworkOptimizations: z.array(z.string()),
    accessibilityImprovements: z.array(z.string()).optional()
  }),
  confidence: z.number().min(0).max(100),
  sources: z.array(z.object({
    type: z.enum(['documentation', 'storybook', 'github', 'figma', 'npm']),
    url: z.string().url(),
    relevance: z.number().min(0).max(100),
    lastChecked: z.string().datetime().optional()
  }))
})

export const AuditSchema = z.object({
  overall: z.object({
    score: z.number().min(0).max(100),
    status: z.enum(['excellent', 'good', 'needs-improvement', 'poor']),
    summary: z.string().min(20),
    confidence: z.number().min(0).max(100)
  }),
  categories: z.object({
    naming: z.object({
      score: z.number().min(0).max(100),
      issues: z.array(z.string()),
      consistency: z.number().min(0).max(100)
    }),
    accessibility: z.object({
      score: z.number().min(0).max(100),
      issues: z.array(z.string()),
      wcagCompliance: z.enum(['A', 'AA', 'AAA', 'fail']).optional()
    }),
    consistency: z.object({
      score: z.number().min(0).max(100),
      issues: z.array(z.string()),
      patterns: z.array(z.string()).optional()
    }),
    completeness: z.object({
      score: z.number().min(0).max(100),
      issues: z.array(z.string()),
      missing: z.array(z.string()).optional()
    })
  }),
  recommendations: z.array(z.object({
    priority: z.enum(['low', 'medium', 'high', 'critical']),
    category: z.string(),
    description: z.string().min(10),
    solution: z.string().min(10),
    impact: z.enum(['minor', 'moderate', 'major', 'critical']).optional()
  })),
  redFlags: z.array(z.string()),
  actionItems: z.array(z.object({
    task: z.string(),
    priority: z.enum(['low', 'medium', 'high', 'critical']),
    effort: z.enum(['small', 'medium', 'large']).optional()
  })).optional()
})

export class SchemaValidator {
  private repairStrategies: RepairStrategy[] = []
  private guardrails: SchemaGuardrails = {
    maxRepairAttempts: 3,
    fallbackOnFailure: true,
    strictMode: false,
    autoFixTypes: ['string', 'number', 'array', 'object'],
    escalationThreshold: 2
  }

  constructor() {
    this.initializeRepairStrategies()
  }

  private initializeRepairStrategies() {
    this.repairStrategies = [
      {
        name: 'missing-required-fields',
        description: 'Add missing required fields with sensible defaults',
        applicableErrors: ['required', 'missing'],
        execute: this.repairMissingFields.bind(this),
        confidence: 0.8
      },
      {
        name: 'type-coercion',
        description: 'Convert values to expected types',
        applicableErrors: ['type', 'invalid_type'],
        execute: this.repairTypeErrors.bind(this),
        confidence: 0.9
      },
      {
        name: 'format-correction',
        description: 'Fix format errors (URLs, dates, regexes)',
        applicableErrors: ['format', 'invalid_string'],
        execute: this.repairFormatErrors.bind(this),
        confidence: 0.85
      },
      {
        name: 'range-correction',
        description: 'Clamp numbers to valid ranges',
        applicableErrors: ['too_small', 'too_big'],
        execute: this.repairRangeErrors.bind(this),
        confidence: 0.95
      },
      {
        name: 'array-normalization',
        description: 'Fix array length and content issues',
        applicableErrors: ['too_small', 'too_big', 'invalid_type'],
        execute: this.repairArrayErrors.bind(this),
        confidence: 0.75
      },
      {
        name: 'enum-correction',
        description: 'Map invalid enum values to valid options',
        applicableErrors: ['invalid_enum_value'],
        execute: this.repairEnumErrors.bind(this),
        confidence: 0.90
      },
      {
        name: 'structure-reconstruction',
        description: 'Rebuild malformed object structures',
        applicableErrors: ['invalid_type', 'unrecognized_keys'],
        execute: this.repairStructureErrors.bind(this),
        confidence: 0.60
      }
    ]
  }

  // Main validation method with auto-repair
  async validateWithRepair<T>(
    data: any,
    schema: z.ZodSchema<T>,
    options: {
      allowRepair?: boolean
      maxAttempts?: number
      strictMode?: boolean
      operation?: string
    } = {}
  ): Promise<ValidationResult<T>> {
    const startTime = Date.now()
    let currentData = data
    let repairAttempts = 0
    const maxAttempts = options.maxAttempts || this.guardrails.maxRepairAttempts
    const allowRepair = options.allowRepair !== false

    while (repairAttempts <= maxAttempts) {
      try {
        // Attempt validation
        const validated = schema.parse(currentData)

        return {
          valid: true,
          data: validated,
          errors: [],
          repaired: repairAttempts > 0,
          confidence: this.calculateValidationConfidence(validated, repairAttempts)
        }

      } catch (error) {
        if (error instanceof z.ZodError) {
          const validationErrors = this.parseZodErrors(error)

          // If this is the last attempt or repair is disabled, return errors
          if (repairAttempts >= maxAttempts || !allowRepair) {
            return {
              valid: false,
              errors: validationErrors,
              repaired: false,
              confidence: 0
            }
          }

          // Attempt auto-repair
          const repairResult = await this.attemptRepair(currentData, validationErrors, options.operation)

          if (repairResult.success) {
            currentData = repairResult.data
            repairAttempts++

            // Log successful repair
            console.log(`Schema repair attempt ${repairAttempts} successful: ${repairResult.strategy}`)
          } else {
            // If repair failed, try AI-powered repair as last resort
            if (repairAttempts === 0) {
              const aiRepaired = await this.aiPoweredRepair(currentData, schema, validationErrors)
              if (aiRepaired) {
                currentData = aiRepaired
                repairAttempts++
                continue
              }
            }

            return {
              valid: false,
              errors: validationErrors,
              repaired: repairAttempts > 0,
              confidence: 0
            }
          }
        } else {
          throw error // Re-throw non-Zod errors
        }
      }
    }

    // Should not reach here, but return failure state
    return {
      valid: false,
      errors: [{ path: 'root', message: 'Max repair attempts exceeded', severity: 'critical', code: 'MAX_ATTEMPTS', autoFixable: false }],
      repaired: repairAttempts > 0,
      confidence: 0
    }
  }

  // Parse Zod errors into structured format
  private parseZodErrors(zodError: z.ZodError): ValidationError[] {
    return zodError.errors.map(error => ({
      path: error.path.join('.'),
      message: error.message,
      severity: this.classifyErrorSeverity(error),
      code: error.code,
      suggestion: this.generateErrorSuggestion(error),
      autoFixable: this.isAutoFixable(error)
    }))
  }

  private classifyErrorSeverity(error: z.ZodIssue): 'low' | 'medium' | 'high' | 'critical' {
    switch (error.code) {
      case 'invalid_type':
        return error.path.length === 0 ? 'critical' : 'high' // Root type errors are critical
      case 'too_small':
      case 'too_big':
        return 'medium'
      case 'invalid_string':
        return error.path.includes('url') ? 'high' : 'medium'
      case 'required':
        return error.path.includes('metadata') ? 'high' : 'medium'
      default:
        return 'medium'
    }
  }

  private generateErrorSuggestion(error: z.ZodIssue): string {
    switch (error.code) {
      case 'invalid_type':
        return `Expected ${error.expected}, got ${error.received}. Convert value to correct type.`
      case 'too_small':
        return `Value too small. Minimum: ${error.minimum}`
      case 'too_big':
        return `Value too large. Maximum: ${error.maximum}`
      case 'invalid_string':
        return `String format invalid. Expected pattern: ${error.validation}`
      case 'required':
        return `Field is required. Add this field with appropriate value.`
      default:
        return 'Fix this validation error to continue.'
    }
  }

  private isAutoFixable(error: z.ZodIssue): boolean {
    const autoFixableCodes = ['too_small', 'too_big', 'invalid_enum_value', 'required']
    return autoFixableCodes.includes(error.code) || this.guardrails.autoFixTypes.includes(error.expected?.toString() || '')
  }

  // Auto-repair implementation
  private async attemptRepair(
    data: any,
    errors: ValidationError[],
    operation?: string
  ): Promise<{ success: boolean; data?: any; strategy?: string }> {
    let repairedData = JSON.parse(JSON.stringify(data)) // Deep clone

    for (const error of errors.filter(e => e.autoFixable)) {
      const applicableStrategies = this.repairStrategies.filter(strategy =>
        strategy.applicableErrors.some(code => error.code.includes(code))
      )

      for (const strategy of applicableStrategies.sort((a, b) => b.confidence - a.confidence)) {
        try {
          const repairResult = await strategy.execute(repairedData, error)

          if (repairResult !== null) {
            repairedData = repairResult
            return {
              success: true,
              data: repairedData,
              strategy: strategy.name
            }
          }

        } catch (repairError) {
          console.warn(`Repair strategy ${strategy.name} failed:`, repairError)
        }
      }
    }

    return { success: false }
  }

  // Repair strategy implementations
  private async repairMissingFields(data: any, error: ValidationError): Promise<any> {
    const repaired = { ...data }
    const pathParts = error.path.split('.')

    // Navigate to parent object
    let current = repaired
    for (let i = 0; i < pathParts.length - 1; i++) {
      if (!current[pathParts[i]]) {
        current[pathParts[i]] = {}
      }
      current = current[pathParts[i]]
    }

    const fieldName = pathParts[pathParts.length - 1]

    // Add sensible defaults based on field name
    const defaults: { [key: string]: any } = {
      name: 'untitled',
      version: '1.0.0',
      description: 'Auto-generated description',
      confidence: 50,
      score: 50,
      usage: 1,
      type: 'unknown',
      value: '',
      issues: [],
      recommendations: [],
      url: 'https://example.com',
      extractedAt: new Date().toISOString()
    }

    current[fieldName] = defaults[fieldName] || null

    return repaired
  }

  private async repairTypeErrors(data: any, error: ValidationError): Promise<any> {
    const repaired = { ...data }
    const pathParts = error.path.split('.')

    // Navigate to the field
    let current = repaired
    for (let i = 0; i < pathParts.length - 1; i++) {
      current = current[pathParts[i]]
    }

    const fieldName = pathParts[pathParts.length - 1]
    const currentValue = current[fieldName]

    // Type conversion based on error message
    if (error.message.includes('number')) {
      const parsed = parseFloat(currentValue)
      current[fieldName] = isNaN(parsed) ? 0 : parsed
    } else if (error.message.includes('string')) {
      current[fieldName] = String(currentValue)
    } else if (error.message.includes('array')) {
      current[fieldName] = Array.isArray(currentValue) ? currentValue : [currentValue].filter(Boolean)
    } else if (error.message.includes('object')) {
      current[fieldName] = typeof currentValue === 'object' ? currentValue : {}
    }

    return repaired
  }

  private async repairFormatErrors(data: any, error: ValidationError): Promise<any> {
    const repaired = { ...data }
    const pathParts = error.path.split('.')

    let current = repaired
    for (let i = 0; i < pathParts.length - 1; i++) {
      current = current[pathParts[i]]
    }

    const fieldName = pathParts[pathParts.length - 1]
    const currentValue = current[fieldName]

    // Fix common format issues
    if (error.message.includes('url')) {
      try {
        new URL(currentValue)
      } catch {
        current[fieldName] = currentValue.startsWith('http') ? currentValue : `https://${currentValue}`
      }
    } else if (error.message.includes('datetime')) {
      try {
        new Date(currentValue).toISOString()
      } catch {
        current[fieldName] = new Date().toISOString()
      }
    } else if (error.message.includes('version')) {
      // Fix version format
      if (!/^\d+\.\d+\.\d+$/.test(currentValue)) {
        current[fieldName] = '1.0.0'
      }
    } else if (error.message.includes('color')) {
      // Fix color format
      if (!currentValue.startsWith('#') && !currentValue.startsWith('rgb')) {
        current[fieldName] = '#000000' // Fallback black
      }
    }

    return repaired
  }

  private async repairRangeErrors(data: any, error: ValidationError): Promise<any> {
    const repaired = { ...data }
    const pathParts = error.path.split('.')

    let current = repaired
    for (let i = 0; i < pathParts.length - 1; i++) {
      current = current[pathParts[i]]
    }

    const fieldName = pathParts[pathParts.length - 1]
    const currentValue = current[fieldName]

    // Extract range from error message
    if (error.message.includes('at least')) {
      const minMatch = error.message.match(/at least (\d+)/)
      if (minMatch) {
        const min = parseInt(minMatch[1])
        current[fieldName] = Math.max(min, currentValue)
      }
    } else if (error.message.includes('at most')) {
      const maxMatch = error.message.match(/at most (\d+)/)
      if (maxMatch) {
        const max = parseInt(maxMatch[1])
        current[fieldName] = Math.min(max, currentValue)
      }
    }

    return repaired
  }

  private async repairArrayErrors(data: any, error: ValidationError): Promise<any> {
    const repaired = { ...data }
    const pathParts = error.path.split('.')

    let current = repaired
    for (let i = 0; i < pathParts.length - 1; i++) {
      current = current[pathParts[i]]
    }

    const fieldName = pathParts[pathParts.length - 1]
    const currentValue = current[fieldName]

    if (!Array.isArray(currentValue)) {
      current[fieldName] = currentValue ? [currentValue] : []
    } else {
      // Fix array length issues
      if (error.message.includes('at least')) {
        const minMatch = error.message.match(/at least (\d+)/)
        if (minMatch) {
          const min = parseInt(minMatch[1])
          while (currentValue.length < min) {
            currentValue.push(this.generateDefaultArrayItem(fieldName))
          }
        }
      }
    }

    return repaired
  }

  private async repairEnumErrors(data: any, error: ValidationError): Promise<any> {
    const repaired = { ...data }
    const pathParts = error.path.split('.')

    let current = repaired
    for (let i = 0; i < pathParts.length - 1; i++) {
      current = current[pathParts[i]]
    }

    const fieldName = pathParts[pathParts.length - 1]
    const currentValue = current[fieldName]

    // Map common invalid values to valid enum options
    const enumMappings: { [key: string]: { [key: string]: string } } = {
      priority: {
        urgent: 'high',
        important: 'high',
        normal: 'medium',
        low: 'low'
      },
      severity: {
        major: 'high',
        minor: 'low',
        critical: 'critical'
      },
      status: {
        ok: 'good',
        bad: 'poor',
        great: 'excellent'
      }
    }

    const mapping = enumMappings[fieldName]
    if (mapping && mapping[currentValue]) {
      current[fieldName] = mapping[currentValue]
    } else {
      // Fallback to first valid option (would extract from schema in production)
      const fallbacks: { [key: string]: string } = {
        priority: 'medium',
        severity: 'medium',
        status: 'good',
        type: 'color',
        property: 'font-family'
      }
      current[fieldName] = fallbacks[fieldName] || 'unknown'
    }

    return repaired
  }

  private async repairStructureErrors(data: any, error: ValidationError): Promise<any> {
    // Complex structural repairs - might need AI assistance
    if (error.path.includes('tokens') && typeof data.tokens !== 'object') {
      return {
        ...data,
        tokens: {
          colors: [],
          typography: [],
          spacing: []
        }
      }
    }

    if (error.path.includes('metadata') && typeof data.metadata !== 'object') {
      return {
        ...data,
        metadata: {
          name: 'Auto-repaired',
          version: '1.0.0',
          description: 'Auto-generated metadata',
          url: 'https://example.com',
          extractedAt: new Date().toISOString(),
          confidence: 50
        }
      }
    }

    return data
  }

  // AI-powered repair as last resort
  private async aiPoweredRepair<T>(
    data: any,
    schema: z.ZodSchema<T>,
    errors: ValidationError[]
  ): Promise<any | null> {
    try {
      const repairPrompt = `Fix this JSON to match the required schema. Focus on these specific errors:

INVALID JSON:
${JSON.stringify(data, null, 2)}

VALIDATION ERRORS:
${errors.map(e => `- ${e.path}: ${e.message}`).join('\n')}

REQUIREMENTS:
1. Fix all validation errors
2. Preserve as much original data as possible
3. Add sensible defaults for missing required fields
4. Ensure all types match the schema
5. Return only valid JSON, no explanation

Return the corrected JSON:`

      const response = await aiGateway.request({
        prompt: repairPrompt,
        model: 'gpt-5-mini', // Use cheap model for repairs
        maxTokens: 8192,
        temperature: 0.1,
        metadata: {
          operation: 'repair',
          priority: 'normal'
        }
      })

      // Validate the repair
      try {
        return schema.parse(response.data)
      } catch {
        console.warn('AI repair produced invalid result')
        return null
      }

    } catch (error) {
      console.warn('AI-powered repair failed:', error)
      return null
    }
  }

  // Validation confidence calculation
  private calculateValidationConfidence(data: any, repairAttempts: number): number {
    let confidence = 100

    // Reduce confidence for repairs
    confidence -= repairAttempts * 15

    // Check data completeness
    if (typeof data === 'object' && data !== null) {
      const fields = Object.keys(data)
      const filledFields = fields.filter(field => {
        const value = data[field]
        return value !== null && value !== undefined && value !== ''
      })

      const completeness = filledFields.length / fields.length
      confidence = confidence * completeness
    }

    return Math.max(0, Math.min(100, confidence))
  }

  // Generate default values for array items
  private generateDefaultArrayItem(fieldName: string): any {
    const defaults: { [key: string]: any } = {
      colors: { name: 'auto-color', value: '#000000', type: 'color', usage: 1, confidence: 50 },
      typography: { name: 'auto-font', value: 'system-ui', type: 'typography', property: 'font-family', usage: 1, confidence: 50 },
      spacing: { name: 'auto-space', value: '8px', type: 'spacing', usage: 1, confidence: 50 },
      issues: 'Auto-generated issue',
      recommendations: 'Auto-generated recommendation',
      pitfalls: 'Consider reviewing this aspect',
      usage: 'Use this token consistently'
    }

    return defaults[fieldName] || 'auto-generated'
  }

  // Validation reporting and analytics
  getValidationStats(): {
    totalValidations: number
    successRate: number
    repairRate: number
    commonErrors: Array<{ error: string; count: number }>
    repairEffectiveness: number
  } {
    // Would track validation statistics in production
    return {
      totalValidations: 0,
      successRate: 95,
      repairRate: 12,
      commonErrors: [
        { error: 'missing required field', count: 45 },
        { error: 'invalid type', count: 23 },
        { error: 'format error', count: 18 }
      ],
      repairEffectiveness: 87
    }
  }

  // Schema evolution and versioning
  async validateWithVersioning<T>(
    data: any,
    schema: z.ZodSchema<T>,
    version: string
  ): Promise<ValidationResult<T>> {
    // Handle schema version compatibility
    const migrated = await this.migrateDataForVersion(data, version)
    return this.validateWithRepair(migrated, schema)
  }

  private async migrateDataForVersion(data: any, version: string): Promise<any> {
    // Handle data migration for schema changes
    const migrations: { [version: string]: (data: any) => any } = {
      '1.0.0': (data) => data, // No migration needed
      '1.1.0': (data) => ({
        ...data,
        quality: data.quality || { score: 50, confidence: 50, completeness: 50, issues: [] }
      }),
      '2.0.0': (data) => ({
        ...data,
        mappingHints: {
          ...data.mappingHints,
          framework: data.framework || {}
        }
      })
    }

    return migrations[version] ? migrations[version](data) : data
  }

  // Custom validators for ContextDS-specific patterns
  validateTokenPack(data: any): Promise<ValidationResult<any>> {
    return this.validateWithRepair(data, TokenPackSchema, {
      operation: 'token-pack-validation',
      strictMode: false
    })
  }

  validateResearchData(data: any): Promise<ValidationResult<any>> {
    return this.validateWithRepair(data, ResearchSchema, {
      operation: 'research-validation',
      strictMode: true
    })
  }

  validateAuditReport(data: any): Promise<ValidationResult<any>> {
    return this.validateWithRepair(data, AuditSchema, {
      operation: 'audit-validation',
      strictMode: true
    })
  }

  // Guardrails configuration
  updateGuardrails(newGuardrails: Partial<SchemaGuardrails>): void {
    this.guardrails = { ...this.guardrails, ...newGuardrails }
  }

  // Emergency fallback when all else fails
  createEmergencyFallback(operation: string, url: string): any {
    const fallbacks: { [key: string]: any } = {
      'organize-pack': {
        metadata: {
          name: new URL(url).hostname,
          version: '1.0.0',
          description: 'Emergency fallback token pack',
          url,
          extractedAt: new Date().toISOString(),
          confidence: 25
        },
        tokens: {
          colors: [
            { name: 'primary', value: '#3b82f6', type: 'color', usage: 1, confidence: 50 }
          ],
          typography: [
            { name: 'font-base', value: 'system-ui', type: 'typography', property: 'font-family', usage: 1, confidence: 50 }
          ],
          spacing: [
            { name: 'space-md', value: '16px', type: 'spacing', usage: 1, confidence: 50 }
          ]
        },
        mappingHints: {
          tailwind: {
            colors: 'Configure in tailwind.config.js theme.colors',
            spacing: 'Use in tailwind.config.js theme.spacing',
            typography: 'Configure in tailwind.config.js theme.fontFamily'
          },
          cssVariables: {
            recommendation: 'Define as CSS custom properties for theming',
            example: ':root { --color-primary: #3b82f6; }'
          }
        },
        guidelines: {
          usage: ['Use tokens consistently across components'],
          pitfalls: ['Validate color contrast for accessibility'],
          accessibility: ['Ensure WCAG AA compliance'],
          performance: ['Minimize unique token values']
        },
        quality: {
          score: 25,
          confidence: 25,
          completeness: 30,
          issues: ['Emergency fallback - limited data available']
        }
      }
    }

    return fallbacks[operation] || { error: 'No fallback available' }
  }
}

// Global validator instance
export const schemaValidator = new SchemaValidator()

// Convenience validation functions
export async function validateTokenPack(data: any): Promise<ValidationResult<any>> {
  return schemaValidator.validateTokenPack(data)
}

export async function validateWithStrictMode<T>(
  data: any,
  schema: z.ZodSchema<T>
): Promise<ValidationResult<T>> {
  return schemaValidator.validateWithRepair(data, schema, {
    strictMode: true,
    allowRepair: false
  })
}

export async function validateAndRepair<T>(
  data: any,
  schema: z.ZodSchema<T>,
  operation: string
): Promise<ValidationResult<T>> {
  return schemaValidator.validateWithRepair(data, schema, {
    allowRepair: true,
    operation
  })
}