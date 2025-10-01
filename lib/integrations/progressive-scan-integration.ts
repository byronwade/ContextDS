/**
 * Integration between Progressive Loading System and Ultra-Parallel Scan Orchestrator
 * Provides real-time updates from scanning to progressive UI
 */

import { ProgressiveLoader, type ProgressivePhase, type ProgressiveUpdate } from '@/lib/utils/progressive-loader'
import { runScanJob, type ScanJobInput, type ScanJobResult } from '@/lib/workers/scan-orchestrator'
import { EventEmitter } from 'events'

export interface ScanProgressEvent {
  phase: ProgressivePhase
  step: string
  progress: number
  data?: Partial<ScanJobResult>
  metadata?: Record<string, any>
  timestamp: number
}

export interface ScanIntegrationConfig {
  enableProgressiveUpdates: boolean
  updateInterval: number // ms between progress updates
  enableDebugLogging: boolean
}

export class ProgressiveScanIntegration extends EventEmitter {
  private progressiveLoader: ProgressiveLoader<ScanJobResult>
  private config: ScanIntegrationConfig
  private scanPromise: Promise<ScanJobResult> | null = null
  private isScanning = false

  constructor(
    progressiveLoader: ProgressiveLoader<ScanJobResult>,
    config: Partial<ScanIntegrationConfig> = {}
  ) {
    super()

    this.progressiveLoader = progressiveLoader
    this.config = {
      enableProgressiveUpdates: true,
      updateInterval: 100, // Update every 100ms
      enableDebugLogging: process.env.NODE_ENV === 'development',
      ...config
    }

    if (this.config.enableDebugLogging) {
      console.log('🔗 Progressive scan integration initialized with config:', this.config)
    }
  }

  /**
   * Start scanning with progressive loading updates
   */
  async startScan(input: ScanJobInput): Promise<ScanJobResult> {
    if (this.isScanning) {
      throw new Error('Scan already in progress')
    }

    this.isScanning = true

    try {
      // Start progressive loading immediately - shows skeletons
      this.progressiveLoader.start()

      if (this.config.enableDebugLogging) {
        console.log('🚀 Starting progressive scan for:', input.url)
      }

      // Start the actual scan
      this.scanPromise = this.executeScanWithProgressiveUpdates(input)

      // Return the result
      const result = await this.scanPromise

      // Complete progressive loading with final data
      this.progressiveLoader.complete(result)

      if (this.config.enableDebugLogging) {
        console.log('✅ Progressive scan completed successfully')
      }

      this.emit('scanCompleted', result)
      return result

    } catch (error) {
      // Handle error in progressive loader
      this.progressiveLoader.error(error as Error)

      if (this.config.enableDebugLogging) {
        console.error('❌ Progressive scan failed:', error)
      }

      this.emit('scanFailed', error)
      throw error

    } finally {
      this.isScanning = false
      this.scanPromise = null
    }
  }

  /**
   * Execute scan with progressive updates
   */
  private async executeScanWithProgressiveUpdates(input: ScanJobInput): Promise<ScanJobResult> {
    const startTime = Date.now()

    // Set up progress monitoring
    const progressInterval = this.config.enableProgressiveUpdates
      ? setInterval(() => {
          this.checkScanProgress(startTime)
        }, this.config.updateInterval)
      : null

    try {
      // Hook into the scan orchestrator's console output to extract progress
      const originalConsoleLog = console.log
      const scanLogs: string[] = []

      // Override console.log to capture scan progress
      console.log = (...args: any[]) => {
        const message = args.join(' ')
        scanLogs.push(message)

        // Parse progress from scan orchestrator logs
        this.parseProgressFromLogs(message, startTime)

        // Call original console.log
        originalConsoleLog(...args)
      }

      // Execute the actual scan
      const result = await runScanJob(input)

      // Restore console.log
      console.log = originalConsoleLog

      return result

    } finally {
      if (progressInterval) {
        clearInterval(progressInterval)
      }
    }
  }

  /**
   * Parse progress from scan orchestrator log messages
   */
  private parseProgressFromLogs(message: string, startTime: number): void {
    const elapsed = Date.now() - startTime

    // Parse different types of scan progress messages
    if (message.includes('Starting') && message.includes('scan of')) {
      this.sendProgressiveUpdate({
        phase: 'initializing',
        step: 'scan-started',
        progress: 5,
        metadata: { message, elapsed }
      })
    }

    else if (message.includes('CSS collection') && message.includes('progress')) {
      this.sendProgressiveUpdate({
        phase: 'css-collection',
        step: 'css-collection-progress',
        progress: 25,
        metadata: { message, elapsed }
      })
    }

    else if (message.includes('Ultra-parallel CSS collection complete')) {
      this.sendProgressiveUpdate({
        phase: 'css-collection',
        step: 'css-collection-complete',
        progress: 35,
        metadata: { message, elapsed }
      })
    }

    else if (message.includes('Token generation progress')) {
      this.sendProgressiveUpdate({
        phase: 'token-generation',
        step: 'token-generation-progress',
        progress: 50,
        metadata: { message, elapsed }
      })
    }

    else if (message.includes('Ultra-parallel token generation complete')) {
      this.sendProgressiveUpdate({
        phase: 'token-generation',
        step: 'token-generation-complete',
        progress: 65,
        metadata: { message, elapsed }
      })
    }

    else if (message.includes('Analysis progress')) {
      this.sendProgressiveUpdate({
        phase: 'analysis',
        step: 'analysis-progress',
        progress: 75,
        metadata: { message, elapsed }
      })
    }

    else if (message.includes('Ultra-parallel analysis complete')) {
      this.sendProgressiveUpdate({
        phase: 'analysis',
        step: 'analysis-complete',
        progress: 85,
        metadata: { message, elapsed }
      })
    }

    else if (message.includes('AI insights') || message.includes('comprehensive analysis')) {
      this.sendProgressiveUpdate({
        phase: 'ai-processing',
        step: 'ai-processing-progress',
        progress: 95,
        metadata: { message, elapsed }
      })
    }

    else if (message.includes('Scan completed')) {
      this.sendProgressiveUpdate({
        phase: 'finalization',
        step: 'scan-finalized',
        progress: 100,
        metadata: { message, elapsed }
      })
    }
  }

  /**
   * Check scan progress periodically
   */
  private checkScanProgress(startTime: number): void {
    if (!this.isScanning) return

    const elapsed = Date.now() - startTime

    // Emit periodic progress events
    this.emit('progressUpdate', {
      elapsed,
      phase: this.progressiveLoader.getState().progress.phase,
      isScanning: this.isScanning
    })
  }

  /**
   * Send progressive update to loader
   */
  private sendProgressiveUpdate(update: Omit<ProgressiveUpdate<ScanJobResult>, 'data'>): void {
    if (this.config.enableDebugLogging) {
      console.log(`⚡ Progressive update: ${update.phase} - ${update.step} (${update.progress}%)`)
    }

    this.progressiveLoader.update(update)

    this.emit('scanProgress', {
      ...update,
      timestamp: Date.now()
    })
  }

  /**
   * Get current scan status
   */
  getScanStatus() {
    return {
      isScanning: this.isScanning,
      progressiveState: this.progressiveLoader.getState(),
      hasActiveScan: this.scanPromise !== null
    }
  }

  /**
   * Cancel current scan (if possible)
   */
  cancelScan(): void {
    if (this.isScanning) {
      this.isScanning = false
      this.progressiveLoader.error(new Error('Scan cancelled by user'))
      this.emit('scanCancelled')
    }
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.cancelScan()
    this.progressiveLoader.destroy()
    this.removeAllListeners()
  }
}

/**
 * Factory function to create a progressive scan integration
 */
export function createProgressiveScanIntegration(
  config?: Partial<ScanIntegrationConfig>
): ProgressiveScanIntegration {
  const progressiveLoader = new ProgressiveLoader<ScanJobResult>({
    skeletonTimeout: 2000,
    minSkeletonDuration: 200,
    transitionDuration: 300,
    streamingEnabled: true
  })

  return new ProgressiveScanIntegration(progressiveLoader, config)
}

/**
 * Hook for using progressive scan integration in React components
 */
export function useProgressiveScan(config?: Partial<ScanIntegrationConfig>) {
  const integration = createProgressiveScanIntegration(config)

  return {
    startScan: (input: ScanJobInput) => integration.startScan(input),
    getScanStatus: () => integration.getScanStatus(),
    cancelScan: () => integration.cancelScan(),
    subscribe: (event: string, listener: (...args: any[]) => void) => {
      integration.on(event, listener)
      return () => integration.off(event, listener)
    },
    destroy: () => integration.destroy()
  }
}