/**
 * Progress Emitter for Scan Orchestrator
 * Emits real-time progress events during scanning
 */

import { progressStore } from '@/lib/events/progress-store'

export interface ProgressEvent {
  type: 'progress' | 'metrics' | 'complete' | 'error'
  scanId: string
  step?: number
  totalSteps?: number
  phase?: string
  message?: string
  data?: any
  time?: string
  details?: string[]
  logs?: string[]
  metrics?: {
    cssRules?: number
    variables?: number
    colors?: number
    tokens?: number
    qualityScore?: number
  }
  timestamp: number
}

export class ProgressEmitter {
  private scanId: string
  private startTime: number
  private currentStep: number = 0
  private totalSteps: number = 16

  constructor(scanId: string) {
    this.scanId = scanId
    this.startTime = Date.now()
  }

  emit(event: Omit<ProgressEvent, 'scanId' | 'timestamp'>) {
    const progressEvent: ProgressEvent = {
      ...event,
      scanId: this.scanId,
      timestamp: Date.now(),
    }

    // Emit to in-memory progress store for SSE streaming
    try {
      progressStore.emit(this.scanId, progressEvent)
    } catch (error) {
      console.error('Failed to emit progress event:', error)
    }
  }

  phase(phase: string, message: string, details?: string[], logs?: string[]) {
    this.currentStep++
    const elapsed = ((Date.now() - this.startTime) / 1000).toFixed(1)

    this.emit({
      type: 'progress',
      step: this.currentStep,
      totalSteps: this.totalSteps,
      phase,
      message,
      time: `${elapsed}s`,
      details,
      logs,
    })
  }

  metrics(metrics: ProgressEvent['metrics']) {
    this.emit({
      type: 'metrics',
      metrics,
    })
  }

  complete(data?: any) {
    this.emit({
      type: 'complete',
      data,
    })
  }

  error(error: string) {
    this.emit({
      type: 'error',
      message: error,
    })
  }

  getElapsedSeconds(): number {
    return (Date.now() - this.startTime) / 1000
  }
}