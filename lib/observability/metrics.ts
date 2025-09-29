export type MetricEntry = {
  name: string
  durationMs?: number
  data?: Record<string, unknown>
}

export class MetricsCollector {
  private readonly startedAt = Date.now()
  private readonly entries: MetricEntry[] = []

  startPhase(name: string): () => void {
    const phaseStart = Date.now()
    return () => {
      this.entries.push({
        name,
        durationMs: Date.now() - phaseStart
      })
    }
  }

  record(name: string, data: Record<string, unknown> = {}): void {
    this.entries.push({
      name,
      data
    })
  }

  summary(): {
    totalDurationMs: number
    entries: MetricEntry[]
  } {
    return {
      totalDurationMs: Date.now() - this.startedAt,
      entries: this.entries
    }
  }
}
