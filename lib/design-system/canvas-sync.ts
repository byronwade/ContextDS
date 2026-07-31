/**
 * Bridge between the chat transcript and the canvas store.
 *
 * The agent's `open_canvas` / `update_canvas` tools return plain data; this
 * turns those results into ordered, de-duplicable directives so the canvas can
 * replay exactly what the conversation asked for — once each.
 */

import type { SystemPatch, WorkingSystem } from '@/lib/design-system/working-system'

export type CanvasDirective =
  | { id: string; kind: 'open'; system: WorkingSystem; summary: string }
  | {
      id: string
      kind: 'patch'
      patch: SystemPatch
      reason: string
      warnings: string[]
    }

type UnknownPart = {
  type?: string
  state?: string
  toolCallId?: string
  output?: unknown
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

/**
 * Pull canvas directives out of a message list, in transcript order.
 * Only settled tool calls with a recognized payload are returned.
 */
export function extractCanvasDirectives(
  messages: Array<{ id: string; parts?: unknown[] }>
): CanvasDirective[] {
  const directives: CanvasDirective[] = []

  for (const message of messages) {
    const parts = Array.isArray(message.parts) ? message.parts : []
    parts.forEach((raw, index) => {
      if (!isRecord(raw)) return
      const part = raw as UnknownPart
      if (part.state !== 'output-available') return
      const output = part.output
      if (!isRecord(output)) return

      const id = part.toolCallId || `${message.id}-${index}`

      if (output.kind === 'canvas-open' && isRecord(output.system)) {
        directives.push({
          id,
          kind: 'open',
          system: output.system as unknown as WorkingSystem,
          summary: typeof output.summary === 'string' ? output.summary : '',
        })
        return
      }

      if (output.kind === 'canvas-patch' && isRecord(output.patch)) {
        directives.push({
          id,
          kind: 'patch',
          patch: output.patch as SystemPatch,
          reason: typeof output.reason === 'string' ? output.reason : '',
          warnings: Array.isArray(output.warnings)
            ? output.warnings.filter((warning): warning is string => typeof warning === 'string')
            : [],
        })
      }
    })
  }

  return directives
}
