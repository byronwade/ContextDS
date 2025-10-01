/**
 * Ultra-Fast Parallel Execution System
 * Maximizes concurrency and streaming for ultrathink speed
 */

export interface ParallelTask<T> {
  name: string
  task: () => Promise<T>
  priority: 'critical' | 'high' | 'medium' | 'low'
  timeout?: number
  dependencies?: string[]
  canFail?: boolean
}

export interface ParallelResult<T> {
  name: string
  status: 'completed' | 'failed' | 'timeout'
  result?: T
  error?: Error
  duration: number
  priority: string
}

export interface StreamingOptions {
  concurrency?: number
  timeout?: number
  onProgress?: (completed: number, total: number, latest?: ParallelResult<any>) => void
  onResult?: (result: ParallelResult<any>) => void
  failFast?: boolean
  retries?: number
}

/**
 * Ultra-fast parallel task executor with streaming results
 */
export class UltraParallel {
  private concurrency: number
  private timeout: number
  private running: Map<string, Promise<any>> = new Map()
  private completed: ParallelResult<any>[] = []
  private dependencies: Map<string, string[]> = new Map()

  constructor(options: StreamingOptions = {}) {
    this.concurrency = options.concurrency ?? 10
    this.timeout = options.timeout ?? 30000
  }

  /**
   * Execute tasks with maximum parallelization and streaming
   */
  async executeParallel<T>(
    tasks: ParallelTask<T>[],
    options: StreamingOptions = {}
  ): Promise<Map<string, ParallelResult<T>>> {
    console.log(`🚀 Executing ${tasks.length} tasks with ultra-parallelization (concurrency: ${this.concurrency})`)

    const results = new Map<string, ParallelResult<T>>()
    const pending = new Map(tasks.map(task => [task.name, task]))
    const semaphore = new Semaphore(this.concurrency)

    // Build dependency graph
    tasks.forEach(task => {
      if (task.dependencies) {
        this.dependencies.set(task.name, task.dependencies)
      }
    })

    // Stream execution with maximum concurrency
    const promises: Promise<void>[] = []

    while (pending.size > 0 || this.running.size > 0) {
      // Find tasks that can be executed (dependencies satisfied)
      const ready = Array.from(pending.values()).filter(task =>
        this.canExecute(task.name, results)
      )

      // Execute ready tasks in parallel
      for (const task of ready.slice(0, this.concurrency)) {
        pending.delete(task.name)

        const promise = semaphore.acquire().then(async (release) => {
          try {
            const result = await this.executeTask(task)
            results.set(task.name, result)

            // Stream result immediately
            if (options.onResult) {
              options.onResult(result)
            }

            // Progress callback
            if (options.onProgress) {
              options.onProgress(results.size, tasks.length, result)
            }

          } finally {
            this.running.delete(task.name)
            release()
          }
        })

        this.running.set(task.name, promise)
        promises.push(promise)
      }

      // Wait for at least one task to complete before checking dependencies
      if (this.running.size > 0) {
        await Promise.race(Array.from(this.running.values()))
      }
    }

    // Wait for all remaining tasks
    await Promise.allSettled(promises)

    console.log(`✅ Ultra-parallel execution complete: ${results.size}/${tasks.length} tasks completed`)
    return results
  }

  /**
   * Execute task with timeout and error handling
   */
  private async executeTask<T>(task: ParallelTask<T>): Promise<ParallelResult<T>> {
    const startTime = performance.now()
    const taskTimeout = task.timeout ?? this.timeout

    try {
      const result = await Promise.race([
        task.task(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error(`Task timeout: ${task.name}`)), taskTimeout)
        )
      ])

      const duration = performance.now() - startTime

      console.log(`⚡ ${task.name} completed in ${Math.round(duration)}ms`)

      return {
        name: task.name,
        status: 'completed',
        result,
        duration,
        priority: task.priority
      }

    } catch (error) {
      const duration = performance.now() - startTime

      if (task.canFail) {
        console.warn(`⚠️ ${task.name} failed but marked as optional: ${error}`)
        return {
          name: task.name,
          status: 'failed',
          error: error instanceof Error ? error : new Error(String(error)),
          duration,
          priority: task.priority
        }
      } else {
        console.error(`❌ ${task.name} failed in ${Math.round(duration)}ms:`, error)
        throw error
      }
    }
  }

  /**
   * Check if task dependencies are satisfied
   */
  private canExecute(taskName: string, results: Map<string, ParallelResult<any>>): boolean {
    const deps = this.dependencies.get(taskName)
    if (!deps) return true

    return deps.every(dep =>
      results.has(dep) && results.get(dep)?.status === 'completed'
    )
  }
}

/**
 * Semaphore for controlling concurrency
 */
class Semaphore {
  private permits: number
  private waiting: (() => void)[] = []

  constructor(permits: number) {
    this.permits = permits
  }

  async acquire(): Promise<() => void> {
    return new Promise(resolve => {
      if (this.permits > 0) {
        this.permits--
        resolve(() => this.release())
      } else {
        this.waiting.push(() => {
          resolve(() => this.release())
        })
      }
    })
  }

  private release(): void {
    if (this.waiting.length > 0) {
      const next = this.waiting.shift()!
      next()
    } else {
      this.permits++
    }
  }
}

/**
 * Stream processor for continuous data processing
 */
export class UltraStream<T, R> {
  private batchSize: number
  private maxConcurrency: number
  private processor: (items: T[]) => Promise<R[]>

  constructor(
    processor: (items: T[]) => Promise<R[]>,
    options: { batchSize?: number; maxConcurrency?: number } = {}
  ) {
    this.processor = processor
    this.batchSize = options.batchSize ?? 50
    this.maxConcurrency = options.maxConcurrency ?? 5
  }

  /**
   * Stream process items with batching and concurrency
   */
  async *stream(items: T[]): AsyncGenerator<R[], void, unknown> {
    const batches = this.createBatches(items)
    const semaphore = new Semaphore(this.maxConcurrency)

    console.log(`🌊 Streaming ${items.length} items in ${batches.length} batches (${this.batchSize} per batch)`)

    // Process batches in parallel with streaming results
    const promises = batches.map(async (batch, index) => {
      const release = await semaphore.acquire()

      try {
        const startTime = performance.now()
        const results = await this.processor(batch)
        const duration = performance.now() - startTime

        console.log(`⚡ Batch ${index + 1}/${batches.length} processed in ${Math.round(duration)}ms`)
        return { results, index }

      } finally {
        release()
      }
    })

    // Yield results as they complete
    for await (const promise of promises) {
      const { results } = await promise
      yield results
    }
  }

  private createBatches(items: T[]): T[][] {
    const batches: T[][] = []
    for (let i = 0; i < items.length; i += this.batchSize) {
      batches.push(items.slice(i, i + this.batchSize))
    }
    return batches
  }
}

/**
 * Network request optimizer for parallel fetching
 */
export class UltraFetch {
  private maxConcurrency: number
  private retries: number

  constructor(options: { maxConcurrency?: number; retries?: number } = {}) {
    this.maxConcurrency = options.maxConcurrency ?? 8
    this.retries = options.retries ?? 2
  }

  /**
   * Fetch multiple URLs in parallel with optimization
   */
  async fetchParallel(urls: string[]): Promise<Map<string, Response | Error>> {
    console.log(`🌐 Fetching ${urls.length} URLs in parallel (concurrency: ${this.maxConcurrency})`)

    const results = new Map<string, Response | Error>()
    const semaphore = new Semaphore(this.maxConcurrency)

    const promises = urls.map(async (url) => {
      const release = await semaphore.acquire()

      try {
        const startTime = performance.now()
        const response = await this.fetchWithRetry(url)
        const duration = performance.now() - startTime

        results.set(url, response)
        console.log(`⚡ Fetched ${url} in ${Math.round(duration)}ms`)

      } catch (error) {
        results.set(url, error instanceof Error ? error : new Error(String(error)))
        console.warn(`⚠️ Failed to fetch ${url}:`, error)

      } finally {
        release()
      }
    })

    await Promise.allSettled(promises)
    return results
  }

  private async fetchWithRetry(url: string): Promise<Response> {
    let lastError: Error | null = null

    for (let attempt = 0; attempt <= this.retries; attempt++) {
      try {
        const response = await fetch(url, {
          headers: {
            'User-Agent': 'ContextDS/1.0 (https://contextds.com)',
          },
          signal: AbortSignal.timeout(10000) // 10s timeout
        })

        if (!response.ok && response.status >= 500 && attempt < this.retries) {
          // Retry on server errors
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000))
          continue
        }

        return response

      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error))
        if (attempt < this.retries) {
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000))
        }
      }
    }

    throw lastError || new Error(`Failed to fetch ${url} after ${this.retries + 1} attempts`)
  }
}

// Global instances for reuse
export const ultraParallel = new UltraParallel({ concurrency: 10 })
export const ultraFetch = new UltraFetch({ maxConcurrency: 8, retries: 2 })

/**
 * Convenience function for parallel task execution
 */
export async function executeInParallel<T>(
  tasks: ParallelTask<T>[],
  options?: StreamingOptions
): Promise<Map<string, ParallelResult<T>>> {
  return ultraParallel.executeParallel(tasks, options)
}

/**
 * Convenience function for streaming batch processing
 */
export function createUltraStream<T, R>(
  processor: (items: T[]) => Promise<R[]>,
  options?: { batchSize?: number; maxConcurrency?: number }
): UltraStream<T, R> {
  return new UltraStream(processor, options)
}