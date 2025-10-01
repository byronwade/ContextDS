/**
 * Ultra Performance Profiler
 * Identifies bottlenecks in scanning operations to achieve <200ms target
 */

export interface ProfileEntry {
  operation: string
  startTime: number
  endTime: number
  duration: number
  metadata?: any
  children: ProfileEntry[]
  parent?: ProfileEntry
}

export interface PerformanceReport {
  totalDuration: number
  operations: ProfileEntry[]
  bottlenecks: {
    operation: string
    duration: number
    percentage: number
  }[]
  recommendations: string[]
}

export class UltraProfiler {
  private operations: ProfileEntry[] = []
  private stack: ProfileEntry[] = []
  private startTime: number = 0

  start() {
    this.startTime = performance.now()
    this.operations = []
    this.stack = []
  }

  startOperation(name: string, metadata?: any): () => void {
    const entry: ProfileEntry = {
      operation: name,
      startTime: performance.now(),
      endTime: 0,
      duration: 0,
      metadata,
      children: [],
      parent: this.stack[this.stack.length - 1]
    }

    // Add to parent's children if we have a parent
    if (entry.parent) {
      entry.parent.children.push(entry)
    } else {
      this.operations.push(entry)
    }

    this.stack.push(entry)

    // Return end function
    return () => {
      entry.endTime = performance.now()
      entry.duration = entry.endTime - entry.startTime
      this.stack.pop()
    }
  }

  measure<T>(name: string, operation: () => T | Promise<T>, metadata?: any): Promise<T> {
    const endProfiler = this.startOperation(name, metadata)

    try {
      const result = operation()

      if (result instanceof Promise) {
        return result.finally(() => endProfiler())
      } else {
        endProfiler()
        return Promise.resolve(result)
      }
    } catch (error) {
      endProfiler()
      throw error
    }
  }

  getReport(): PerformanceReport {
    const totalDuration = performance.now() - this.startTime

    // Flatten all operations for bottleneck analysis
    const flatOperations: ProfileEntry[] = []
    const flatten = (ops: ProfileEntry[]) => {
      ops.forEach(op => {
        flatOperations.push(op)
        flatten(op.children)
      })
    }
    flatten(this.operations)

    // Find bottlenecks (operations taking >10ms or >5% of total time)
    const bottlenecks = flatOperations
      .filter(op => op.duration > 10 || (op.duration / totalDuration) > 0.05)
      .map(op => ({
        operation: op.operation,
        duration: Math.round(op.duration * 100) / 100,
        percentage: Math.round((op.duration / totalDuration) * 100)
      }))
      .sort((a, b) => b.duration - a.duration)

    // Generate recommendations
    const recommendations = this.generateRecommendations(bottlenecks, totalDuration)

    return {
      totalDuration: Math.round(totalDuration * 100) / 100,
      operations: this.operations,
      bottlenecks,
      recommendations
    }
  }

  private generateRecommendations(bottlenecks: any[], totalDuration: number): string[] {
    const recommendations: string[] = []

    bottlenecks.forEach(bottleneck => {
      const { operation, duration, percentage } = bottleneck

      if (operation.includes('fetch') && duration > 50) {
        recommendations.push(`🌐 NETWORK: ${operation} (${duration}ms) - Implement aggressive caching or CDN`)
      }

      if (operation.includes('browser') && duration > 100) {
        recommendations.push(`🌐 BROWSER: ${operation} (${duration}ms) - Skip browser automation, use static analysis only`)
      }

      if (operation.includes('token') && duration > 30) {
        recommendations.push(`🧠 TOKENS: ${operation} (${duration}ms) - Pre-compute tokens or use faster algorithm`)
      }

      if (operation.includes('database') && duration > 20) {
        recommendations.push(`🗄️ DATABASE: ${operation} (${duration}ms) - Optimize queries or use in-memory cache`)
      }

      if (operation.includes('ai') || operation.includes('analysis')) {
        recommendations.push(`🤖 AI: ${operation} (${duration}ms) - Move to background processing with skeleton UI`)
      }

      if (percentage > 30) {
        recommendations.push(`⚡ CRITICAL: ${operation} consumes ${percentage}% of total time - prioritize optimization`)
      }
    })

    if (totalDuration > 200) {
      recommendations.push(`🎯 TARGET: Total time ${totalDuration}ms exceeds 200ms target by ${totalDuration - 200}ms`)
    }

    if (recommendations.length === 0) {
      recommendations.push(`✅ PERFORMANCE: All operations under threshold, consider micro-optimizations`)
    }

    return recommendations
  }

  printReport(): void {
    const report = this.getReport()

    console.log('\n🚀 ULTRA PERFORMANCE REPORT')
    console.log('============================')
    console.log(`⏱️  Total Duration: ${report.totalDuration}ms`)
    console.log(`🎯 Target: 200ms (${report.totalDuration > 200 ? '❌ OVER' : '✅ UNDER'} by ${Math.abs(report.totalDuration - 200)}ms)`)

    console.log('\n🔥 BOTTLENECKS (>10ms or >5%):')
    report.bottlenecks.forEach((bottleneck, i) => {
      console.log(`${i + 1}. ${bottleneck.operation}: ${bottleneck.duration}ms (${bottleneck.percentage}%)`)
    })

    console.log('\n💡 RECOMMENDATIONS:')
    report.recommendations.forEach((rec, i) => {
      console.log(`${i + 1}. ${rec}`)
    })

    console.log('\n📊 OPERATION TREE:')
    this.printOperationTree(report.operations, 0)
  }

  private printOperationTree(operations: ProfileEntry[], level: number): void {
    operations.forEach(op => {
      const indent = '  '.repeat(level)
      const duration = Math.round(op.duration * 100) / 100
      console.log(`${indent}${op.operation}: ${duration}ms`)

      if (op.children.length > 0) {
        this.printOperationTree(op.children, level + 1)
      }
    })
  }
}

// Global profiler instance
export const ultraProfiler = new UltraProfiler()

// Convenience wrapper for measuring functions
export async function profile<T>(
  name: string,
  operation: () => T | Promise<T>,
  metadata?: any
): Promise<T> {
  return ultraProfiler.measure(name, operation, metadata)
}

// Wrapper for measuring async operations with detailed metadata
export async function profileAsync<T>(
  name: string,
  operation: () => Promise<T>,
  metadata?: any
): Promise<T> {
  const start = performance.now()
  const endProfiler = ultraProfiler.startOperation(name, metadata)

  try {
    const result = await operation()
    const duration = performance.now() - start

    // Add result metadata
    endProfiler()

    if (duration > 50) {
      console.warn(`⚠️ SLOW OPERATION: ${name} took ${Math.round(duration)}ms`)
    }

    return result
  } catch (error) {
    endProfiler()
    throw error
  }
}

// Decorator for profiling class methods
export function profileMethod(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
  const originalMethod = descriptor.value

  descriptor.value = async function (...args: any[]) {
    const className = this.constructor.name
    const methodName = `${className}.${propertyKey}`

    return profile(methodName, () => originalMethod.apply(this, args))
  }

  return descriptor
}