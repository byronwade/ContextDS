/**
 * Bulletproof resilience utilities for scanning large sites
 * Prevents memory exhaustion, timeouts, and cascading failures
 */

export class TimeoutError extends Error {
  constructor(message: string, timeout: number) {
    super(`${message} (timeout: ${timeout}ms)`)
    this.name = 'TimeoutError'
  }
}

export class MemoryLimitError extends Error {
  constructor(message: string, limit: number) {
    super(`${message} (limit: ${limit} bytes)`)
    this.name = 'MemoryLimitError'
  }
}

export class CircuitBreakerError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'CircuitBreakerError'
  }
}

/**
 * Timeout wrapper that kills operations that take too long
 */
export async function withTimeout<T>(
  operation: () => Promise<T>,
  timeoutMs: number,
  errorMessage?: string
): Promise<T> {
  const controller = new AbortController()

  const timeoutId = setTimeout(() => {
    controller.abort()
  }, timeoutMs)

  try {
    const promise = operation()

    // Race the operation against the timeout
    const result = await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        controller.signal.addEventListener('abort', () => {
          reject(new TimeoutError(
            errorMessage || 'Operation timed out',
            timeoutMs
          ))
        })
      })
    ])

    clearTimeout(timeoutId)
    return result
  } catch (error) {
    clearTimeout(timeoutId)
    throw error
  }
}

/**
 * Memory limit tracker that prevents excessive memory usage
 */
export interface MemoryLimit {
  track: (bytes: number) => void
  check: () => void
  used: () => number
  remaining: () => number
}

export function createMemoryLimit(maxBytes: number): MemoryLimit {
  let usedBytes = 0

  return {
    track(bytes: number) {
      usedBytes += bytes
      this.check()
    },

    check() {
      if (usedBytes > maxBytes) {
        throw new MemoryLimitError(
          `Memory limit exceeded: ${usedBytes} bytes used`,
          maxBytes
        )
      }
    },

    used() {
      return usedBytes
    },

    remaining() {
      return Math.max(0, maxBytes - usedBytes)
    }
  }
}

/**
 * Circuit breaker pattern to prevent cascading failures
 */
export interface CircuitBreakerConfig {
  failureThreshold: number
  resetTimeout: number
  name: string
}

export interface CircuitBreaker {
  execute: <T>(operation: () => Promise<T>) => Promise<T>
  getState: () => 'closed' | 'open' | 'half-open'
  getFailureCount: () => number
  reset: () => void
}

export function createCircuitBreaker(config: CircuitBreakerConfig): CircuitBreaker {
  let state: 'closed' | 'open' | 'half-open' = 'closed'
  let failureCount = 0
  let lastFailureTime = 0
  let nextAttemptTime = 0

  return {
    async execute<T>(operation: () => Promise<T>): Promise<T> {
      const now = Date.now()

      // If circuit is open, check if we should attempt reset
      if (state === 'open') {
        if (now < nextAttemptTime) {
          throw new CircuitBreakerError(
            `Circuit breaker '${config.name}' is open (${failureCount} failures)`
          )
        }
        // Transition to half-open for testing
        state = 'half-open'
      }

      try {
        const result = await operation()

        // Success: reset circuit breaker
        if (state === 'half-open') {
          state = 'closed'
          failureCount = 0
        }

        return result
      } catch (error) {
        failureCount++
        lastFailureTime = now

        // Open circuit if threshold reached
        if (failureCount >= config.failureThreshold) {
          state = 'open'
          nextAttemptTime = now + config.resetTimeout
        }

        throw error
      }
    },

    getState() {
      return state
    },

    getFailureCount() {
      return failureCount
    },

    reset() {
      state = 'closed'
      failureCount = 0
      lastFailureTime = 0
      nextAttemptTime = 0
    }
  }
}

/**
 * Progressive scanner that processes large data in chunks
 */
export interface ProgressiveScanner<T, R> {
  process: (items: T[]) => Promise<R[]>
  getStats: () => {
    processed: number
    failed: number
    skipped: number
    totalTime: number
  }
}

export function createProgressiveScanner<T, R>(
  processor: (item: T) => Promise<R | null>,
  options: {
    chunkSize?: number
    maxConcurrency?: number
    maxProcessingTime?: number
    onProgress?: (stats: { processed: number; total: number; failed: number }) => void
  } = {}
): ProgressiveScanner<T, R> {
  const chunkSize = options.chunkSize || 10
  const maxConcurrency = options.maxConcurrency || 3
  const maxProcessingTime = options.maxProcessingTime || 60000 // 1 minute
  const onProgress = options.onProgress

  let processed = 0
  let failed = 0
  let skipped = 0
  let totalTime = 0

  return {
    async process(items: T[]): Promise<R[]> {
      const startTime = Date.now()
      const results: R[] = []

      // Process in chunks to avoid memory spikes
      for (let i = 0; i < items.length; i += chunkSize) {
        const chunk = items.slice(i, i + chunkSize)

        // Check total processing time
        if (Date.now() - startTime > maxProcessingTime) {
          console.warn(`Progressive scanner timeout reached, processed ${processed}/${items.length} items`)
          break
        }

        // Process chunk with concurrency limit
        const limit = pLimit(maxConcurrency)
        const chunkPromises = chunk.map(item =>
          limit(async () => {
            try {
              const result = await processor(item)
              processed++

              if (onProgress) {
                onProgress({ processed, total: items.length, failed })
              }

              return result
            } catch (error) {
              failed++
              console.warn('Progressive scanner item failed:', error)
              return null
            }
          })
        )

        const chunkResults = await Promise.all(chunkPromises)

        // Add successful results
        chunkResults.forEach(result => {
          if (result !== null) {
            results.push(result)
          } else {
            skipped++
          }
        })

        // Yield to event loop between chunks
        await new Promise(resolve => setImmediate(resolve))
      }

      totalTime = Date.now() - startTime
      return results
    },

    getStats() {
      return { processed, failed, skipped, totalTime }
    }
  }
}

// Re-export pLimit for convenience
import pLimit from 'p-limit'
export { pLimit }