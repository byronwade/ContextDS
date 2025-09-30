/**
 * Retry utility with exponential backoff for handling bot protection and rate limiting
 */

export type RetryStrategy = 'static' | 'headless' | 'stealth'

export interface RetryOptions {
  maxAttempts?: number
  initialDelayMs?: number
  maxDelayMs?: number
  backoffFactor?: number
  onRetry?: (attempt: number, error: Error, nextDelay: number) => void
}

export class BlockDetectionError extends Error {
  constructor(
    message: string,
    public readonly blockType: 'rate_limit' | 'bot_protection' | 'captcha' | 'cloudflare' | 'access_denied' | 'unknown',
    public readonly statusCode?: number
  ) {
    super(message)
    this.name = 'BlockDetectionError'
  }
}

/**
 * Detects the type of block from error message or status code
 */
export function detectBlockType(error: unknown): BlockDetectionError {
  const message = error instanceof Error ? error.message : String(error)
  const lowerMessage = message.toLowerCase()

  // Rate limiting (429, Cloudflare 1015)
  if (lowerMessage.includes('429') || lowerMessage.includes('rate limit') || lowerMessage.includes('too many requests')) {
    return new BlockDetectionError(message, 'rate_limit', 429)
  }

  // Cloudflare protection
  if (
    lowerMessage.includes('cloudflare') ||
    lowerMessage.includes('cf-ray') ||
    lowerMessage.includes('503 service') ||
    lowerMessage.includes('checking your browser')
  ) {
    return new BlockDetectionError(message, 'cloudflare', 503)
  }

  // CAPTCHA challenge
  if (lowerMessage.includes('captcha') || lowerMessage.includes('recaptcha') || lowerMessage.includes('hcaptcha')) {
    return new BlockDetectionError(message, 'captcha', 403)
  }

  // Generic bot protection
  if (
    lowerMessage.includes('bot') ||
    lowerMessage.includes('automated') ||
    lowerMessage.includes('access denied') ||
    lowerMessage.includes('forbidden') ||
    lowerMessage.includes('403')
  ) {
    return new BlockDetectionError(message, 'bot_protection', 403)
  }

  // Access denied (401, 403)
  if (lowerMessage.includes('401') || lowerMessage.includes('unauthorized') || lowerMessage.includes('authentication')) {
    return new BlockDetectionError(message, 'access_denied', 401)
  }

  return new BlockDetectionError(message, 'unknown')
}

/**
 * Retry a function with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxAttempts = 3,
    initialDelayMs = 1000,
    maxDelayMs = 10000,
    backoffFactor = 2,
    onRetry
  } = options

  let lastError: Error | undefined

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))

      // Don't retry on last attempt
      if (attempt === maxAttempts) {
        break
      }

      // Calculate delay with exponential backoff and jitter
      const baseDelay = Math.min(initialDelayMs * Math.pow(backoffFactor, attempt - 1), maxDelayMs)
      const jitter = Math.random() * 0.3 * baseDelay // ±30% jitter
      const delay = Math.floor(baseDelay + jitter)

      if (onRetry) {
        onRetry(attempt, lastError, delay)
      }

      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }

  throw lastError || new Error('Retry failed with unknown error')
}

/**
 * Retry with strategy escalation: static → headless → stealth
 */
export async function retryWithStrategyEscalation<T>(
  strategies: Array<{
    name: RetryStrategy
    fn: () => Promise<T>
  }>,
  options: RetryOptions = {}
): Promise<{ result: T; strategy: RetryStrategy; attempts: number }> {
  let totalAttempts = 0

  for (const strategy of strategies) {
    try {
      const result = await retryWithBackoff(strategy.fn, {
        ...options,
        onRetry: (attempt, error, delay) => {
          totalAttempts++
          console.log(
            `[retry-backoff] Strategy: ${strategy.name}, Attempt ${attempt}/${options.maxAttempts || 3}, ` +
            `Error: ${detectBlockType(error).blockType}, Retrying in ${delay}ms`
          )
          options.onRetry?.(attempt, error, delay)
        }
      })

      return { result, strategy: strategy.name, attempts: totalAttempts + 1 }
    } catch (error) {
      const blockError = detectBlockType(error)
      totalAttempts++

      console.log(
        `[retry-backoff] Strategy ${strategy.name} failed after retries. ` +
        `Block type: ${blockError.blockType}. Trying next strategy...`
      )

      // If this was the last strategy, throw the error
      if (strategy === strategies[strategies.length - 1]) {
        throw blockError
      }
    }
  }

  throw new Error('All strategies exhausted')
}