/**
 * Progressive Loading System for Ultra-Fast UI
 * Shows skeletons immediately (<50ms) and streams in real data as it becomes available
 */

export interface ProgressiveState<T> {
  status: 'skeleton' | 'partial' | 'complete' | 'error'
  data: Partial<T> | null
  progress: {
    phase: string
    step: number
    totalSteps: number
    completedSteps: string[]
    estimatedCompletion: number // ms
  }
  error?: Error | null
  skeleton: boolean
  timestamp: number
}

export interface ProgressiveConfig {
  skeletonTimeout: number // Max time to show skeleton before showing partial data
  minSkeletonDuration: number // Minimum time to show skeleton for smooth UX
  transitionDuration: number // CSS transition duration
  streamingEnabled: boolean
}

export type ProgressivePhase =
  | 'initializing'
  | 'css-collection'
  | 'token-generation'
  | 'analysis'
  | 'ai-processing'
  | 'finalization'

export interface ProgressiveUpdate<T> {
  phase: ProgressivePhase
  step: string
  data?: Partial<T>
  progress?: number // 0-100
  metadata?: Record<string, any>
}

export class ProgressiveLoader<T> {
  private state: ProgressiveState<T>
  private config: ProgressiveConfig
  private listeners: Set<(state: ProgressiveState<T>) => void> = new Set()
  private skeletonTimer: NodeJS.Timeout | null = null
  private minDurationTimer: NodeJS.Timeout | null = null
  private startTime: number = 0

  constructor(config: Partial<ProgressiveConfig> = {}) {
    this.config = {
      skeletonTimeout: 2000, // Show skeleton for max 2s
      minSkeletonDuration: 200, // Min 200ms skeleton for smooth transitions
      transitionDuration: 300, // 300ms CSS transitions
      streamingEnabled: true,
      ...config
    }

    this.state = {
      status: 'skeleton',
      data: null,
      progress: {
        phase: 'initializing',
        step: 0,
        totalSteps: 6, // 6 major phases
        completedSteps: [],
        estimatedCompletion: 0
      },
      skeleton: true,
      timestamp: Date.now()
    }

    this.startTime = Date.now()
  }

  /**
   * Start progressive loading - shows skeleton immediately
   */
  start(): void {
    console.log('🚀 Progressive loading started - showing skeleton immediately')

    // Set minimum skeleton duration
    this.minDurationTimer = setTimeout(() => {
      if (this.state.status === 'skeleton') {
        // Can transition away from skeleton after minimum duration
        console.log('⚡ Minimum skeleton duration reached - ready for data')
      }
    }, this.config.minSkeletonDuration)

    // Set maximum skeleton timeout
    this.skeletonTimer = setTimeout(() => {
      if (this.state.status === 'skeleton') {
        console.log('⏱️ Skeleton timeout reached - forcing partial state')
        this.updateState({
          status: 'partial',
          skeleton: false
        })
      }
    }, this.config.skeletonTimeout)

    this.emitState()
  }

  /**
   * Stream in progressive updates
   */
  update(update: ProgressiveUpdate<T>): void {
    const now = Date.now()
    const elapsed = now - this.startTime

    console.log(`⚡ Progressive update: ${update.phase} - ${update.step} (${elapsed}ms elapsed)`)

    // Calculate progress
    const phaseProgress = this.calculatePhaseProgress(update.phase, update.step)
    const estimatedTotal = this.estimateCompletionTime(update.phase, elapsed)

    // Update progress tracking
    const newCompletedSteps = [...this.state.progress.completedSteps]
    if (!newCompletedSteps.includes(update.step)) {
      newCompletedSteps.push(update.step)
    }

    // Merge data if provided
    let newData = this.state.data
    if (update.data) {
      newData = {
        ...this.state.data,
        ...update.data
      }
    }

    // Determine new status
    let newStatus = this.state.status
    const canTransitionFromSkeleton = elapsed >= this.config.minSkeletonDuration ||
                                     this.state.progress.completedSteps.length >= 2

    if (this.state.status === 'skeleton' && canTransitionFromSkeleton && newData) {
      newStatus = 'partial'
      console.log(`🔄 Transitioning from skeleton to partial data (${elapsed}ms)`)
    } else if (update.phase === 'finalization') {
      newStatus = 'complete'
      console.log(`✅ Progressive loading complete (${elapsed}ms total)`)
    }

    this.updateState({
      status: newStatus,
      data: newData,
      progress: {
        phase: update.phase,
        step: phaseProgress.step,
        totalSteps: phaseProgress.totalSteps,
        completedSteps: newCompletedSteps,
        estimatedCompletion: estimatedTotal
      },
      skeleton: newStatus === 'skeleton',
      timestamp: now
    })
  }

  /**
   * Complete loading with final data
   */
  complete(finalData: T): void {
    const elapsed = Date.now() - this.startTime
    console.log(`✅ Progressive loading completed with final data (${elapsed}ms total)`)

    this.clearTimers()

    this.updateState({
      status: 'complete',
      data: finalData,
      progress: {
        ...this.state.progress,
        phase: 'finalization',
        step: this.state.progress.totalSteps,
        estimatedCompletion: elapsed
      },
      skeleton: false,
      timestamp: Date.now()
    })
  }

  /**
   * Handle error state
   */
  error(error: Error): void {
    const elapsed = Date.now() - this.startTime
    console.error(`❌ Progressive loading failed after ${elapsed}ms:`, error)

    this.clearTimers()

    this.updateState({
      status: 'error',
      error,
      skeleton: false,
      timestamp: Date.now()
    })
  }

  /**
   * Subscribe to state changes
   */
  subscribe(listener: (state: ProgressiveState<T>) => void): () => void {
    this.listeners.add(listener)

    // Immediately call with current state
    listener(this.state)

    return () => {
      this.listeners.delete(listener)
    }
  }

  /**
   * Get current state
   */
  getState(): ProgressiveState<T> {
    return { ...this.state }
  }

  /**
   * Check if should show skeleton
   */
  shouldShowSkeleton(): boolean {
    return this.state.skeleton || this.state.status === 'skeleton'
  }

  /**
   * Get transition classes for smooth animations
   */
  getTransitionClasses(): string {
    return `transition-all duration-${this.config.transitionDuration} ease-out`
  }

  private updateState(updates: Partial<ProgressiveState<T>>): void {
    this.state = {
      ...this.state,
      ...updates
    }
    this.emitState()
  }

  private emitState(): void {
    this.listeners.forEach(listener => {
      try {
        listener(this.state)
      } catch (error) {
        console.error('Progressive loader listener error:', error)
      }
    })
  }

  private clearTimers(): void {
    if (this.skeletonTimer) {
      clearTimeout(this.skeletonTimer)
      this.skeletonTimer = null
    }
    if (this.minDurationTimer) {
      clearTimeout(this.minDurationTimer)
      this.minDurationTimer = null
    }
  }

  private calculatePhaseProgress(phase: ProgressivePhase, step: string): { step: number; totalSteps: number } {
    const phaseSteps: Record<ProgressivePhase, number> = {
      'initializing': 1,
      'css-collection': 2,
      'token-generation': 3,
      'analysis': 4,
      'ai-processing': 5,
      'finalization': 6
    }

    return {
      step: phaseSteps[phase],
      totalSteps: 6
    }
  }

  private estimateCompletionTime(phase: ProgressivePhase, elapsed: number): number {
    // Estimate based on phase and elapsed time
    const phaseWeights: Record<ProgressivePhase, number> = {
      'initializing': 0.05, // 5% of total time
      'css-collection': 0.25, // 25% of total time
      'token-generation': 0.35, // 35% of total time
      'analysis': 0.20, // 20% of total time
      'ai-processing': 0.10, // 10% of total time
      'finalization': 0.05 // 5% of total time
    }

    const currentWeight = Object.entries(phaseWeights)
      .filter(([p]) => this.isPhaseCompleted(p as ProgressivePhase, phase))
      .reduce((sum, [, weight]) => sum + weight, phaseWeights[phase] * 0.5)

    if (currentWeight === 0) return elapsed * 20 // Fallback estimate

    return Math.round(elapsed / currentWeight)
  }

  private isPhaseCompleted(checkPhase: ProgressivePhase, currentPhase: ProgressivePhase): boolean {
    const phaseOrder: ProgressivePhase[] = [
      'initializing', 'css-collection', 'token-generation', 'analysis', 'ai-processing', 'finalization'
    ]

    const checkIndex = phaseOrder.indexOf(checkPhase)
    const currentIndex = phaseOrder.indexOf(currentPhase)

    return checkIndex < currentIndex
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.clearTimers()
    this.listeners.clear()
  }
}

/**
 * Hook for using progressive loading in React components
 */
export function useProgressiveLoader<T>(config?: Partial<ProgressiveConfig>) {
  const loader = new ProgressiveLoader<T>(config)

  return {
    loader,
    start: () => loader.start(),
    update: (update: ProgressiveUpdate<T>) => loader.update(update),
    complete: (data: T) => loader.complete(data),
    error: (error: Error) => loader.error(error),
    subscribe: (listener: (state: ProgressiveState<T>) => void) => loader.subscribe(listener),
    getState: () => loader.getState(),
    shouldShowSkeleton: () => loader.shouldShowSkeleton(),
    getTransitionClasses: () => loader.getTransitionClasses(),
    destroy: () => loader.destroy()
  }
}

/**
 * Progressive loading states for different scan phases
 */
export const PROGRESSIVE_PHASES: Record<ProgressivePhase, string> = {
  'initializing': 'Initializing scan...',
  'css-collection': 'Collecting CSS sources...',
  'token-generation': 'Generating design tokens...',
  'analysis': 'Analyzing design patterns...',
  'ai-processing': 'Processing AI insights...',
  'finalization': 'Finalizing results...'
}

/**
 * Global progressive loader instance for scan results
 */
export const scanProgressiveLoader = new ProgressiveLoader({
  skeletonTimeout: 1500, // 1.5s max skeleton time for scans
  minSkeletonDuration: 150, // 150ms min for smooth UX
  transitionDuration: 250, // 250ms transitions
  streamingEnabled: true
})