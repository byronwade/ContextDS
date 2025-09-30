/**
 * In-memory event store for scan progress
 * Allows SSE endpoint to stream progress from Node.js environment
 */

import { ProgressEvent } from '@/lib/workers/progress-emitter'

type ProgressListener = (event: ProgressEvent) => void

class ProgressStore {
  private listeners = new Map<string, Set<ProgressListener>>()
  private recentEvents = new Map<string, ProgressEvent[]>()
  private readonly MAX_EVENTS_PER_SCAN = 100

  /**
   * Subscribe to progress events for a specific scanId
   */
  subscribe(scanId: string, listener: ProgressListener): () => void {
    if (!this.listeners.has(scanId)) {
      this.listeners.set(scanId, new Set())
    }

    this.listeners.get(scanId)!.add(listener)

    // Send recent events to catch up
    const recent = this.recentEvents.get(scanId) || []
    recent.forEach(event => listener(event))

    // Return unsubscribe function
    return () => {
      const listeners = this.listeners.get(scanId)
      if (listeners) {
        listeners.delete(listener)
        if (listeners.size === 0) {
          this.listeners.delete(scanId)
        }
      }
    }
  }

  /**
   * Emit a progress event to all subscribers
   */
  emit(scanId: string, event: ProgressEvent) {
    // Store event for catchup
    if (!this.recentEvents.has(scanId)) {
      this.recentEvents.set(scanId, [])
    }

    const events = this.recentEvents.get(scanId)!
    events.push(event)

    // Keep only recent events
    if (events.length > this.MAX_EVENTS_PER_SCAN) {
      events.shift()
    }

    // Notify all subscribers
    const listeners = this.listeners.get(scanId)
    if (listeners) {
      listeners.forEach(listener => {
        try {
          listener(event)
        } catch (error) {
          console.error('Error in progress listener:', error)
        }
      })
    }

    // Clean up completed scans after 5 minutes
    if (event.type === 'complete' || event.type === 'error') {
      setTimeout(() => {
        this.cleanup(scanId)
      }, 300000)
    }
  }

  /**
   * Get recent events for a scanId (for SSE catch-up)
   */
  getRecentEvents(scanId: string): ProgressEvent[] {
    return this.recentEvents.get(scanId) || []
  }

  /**
   * Clean up events for a completed scan
   */
  private cleanup(scanId: string) {
    this.recentEvents.delete(scanId)
    this.listeners.delete(scanId)
  }

  /**
   * Check if a scan has active listeners
   */
  hasListeners(scanId: string): boolean {
    const listeners = this.listeners.get(scanId)
    return listeners ? listeners.size > 0 : false
  }
}

// Global singleton instance
export const progressStore = new ProgressStore()