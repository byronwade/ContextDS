/**
 * ContextDS drift-evidence receipt builder.
 *
 * Mirrors `src/contextds.mjs` in https://github.com/byronwade/Design so the
 * receipt we ship inside a pack (at `.design/receipts/contextds-drift.json`,
 * relative to the installed project root — hence `target: '.'`) is
 * byte-compatible with what the engine itself would write.
 *
 * Invariant: drift evidence is observation-only. It records external
 * observations with `authority: 'external-drift-evidence'` and
 * `canReplaceDesignTruth: false` on the adapter and every observation — it
 * NEVER edits DESIGN.md or any other design truth.
 *
 * Server-side only (uses node:crypto); the pack is built in a Node worker.
 */

import { createHash } from 'node:crypto'

export type DriftObservation = {
  surface: string
  kind: string
  summary: string
  observedAt?: string | null
  evidence?: unknown
  suggestedAction?: string | null
}

export type ContextDsDriftAdapter = {
  name: 'ContextDS'
  required: false
  mode: 'observation-only'
  canReplaceDesignTruth: false
}

export type ContextDsDriftReceiptObservation = {
  id: string
  source: string
  kind: string
  surface: string
  observedAt: string | null
  summary: string
  evidence: unknown
  suggestedAction: string | null
  authority: 'external-drift-evidence'
  canReplaceDesignTruth: false
}

export type ContextDsDriftReceipt = {
  schemaVersion: 1
  action: 'contextds-drift-evidence'
  target: string
  generatedAt: string
  adapter: ContextDsDriftAdapter
  observations: ContextDsDriftReceiptObservation[]
  warnings: string[]
  receiptHash: string
}

/** Mirrors `safeId` in the engine's `src/utils.mjs`. */
function safeId(value: string): string {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function sha256Hex(content: string): string {
  return createHash('sha256').update(content).digest('hex')
}

/**
 * Mirrors `normalizeContextDsObservation` in the engine's `src/contextds.mjs`,
 * with `source` defaulting to the honest provenance string
 * ('designcontracts.sh') instead of 'contextds'.
 */
function normalizeObservation(
  observation: DriftObservation,
  fallbackEvidence: unknown
): ContextDsDriftReceiptObservation {
  if (!observation || typeof observation !== 'object') {
    throw new Error('ContextDS observation must be an object.')
  }
  const surface = String(observation.surface ?? '').trim()
  if (!surface) throw new Error('ContextDS observation requires a surface.')
  return {
    id: safeId(`${surface}-${observation.kind ?? 'observation'}-${observation.observedAt ?? ''}`),
    source: 'designcontracts.sh',
    kind: String(observation.kind ?? 'external-observation'),
    surface,
    observedAt: observation.observedAt ?? null,
    summary: String(observation.summary ?? '').trim(),
    evidence: observation.evidence ?? fallbackEvidence,
    suggestedAction: observation.suggestedAction ?? null,
    authority: 'external-drift-evidence',
    canReplaceDesignTruth: false,
  }
}

export function buildContextDsDriftReceipt(input: {
  sourceDomain: string
  sourceUrl: string
  generatedAt: string
  observations: DriftObservation[]
}): ContextDsDriftReceipt {
  const fallbackEvidence = { domain: input.sourceDomain, url: input.sourceUrl }
  const observations = (input.observations ?? []).map((observation) =>
    normalizeObservation(observation, fallbackEvidence)
  )
  const adapter: ContextDsDriftAdapter = {
    name: 'ContextDS',
    required: false,
    mode: 'observation-only',
    canReplaceDesignTruth: false,
  }
  return {
    schemaVersion: 1,
    action: 'contextds-drift-evidence',
    // Relative to the installed project root; the receipt lands inside the
    // pack at .design/receipts/contextds-drift.json.
    target: '.',
    generatedAt: input.generatedAt,
    adapter,
    observations,
    warnings: observations.length === 0 ? ['No ContextDS observations supplied.'] : [],
    receiptHash: sha256Hex(JSON.stringify({ adapter, observations })),
  }
}

export function driftReceiptJson(receipt: ContextDsDriftReceipt): string {
  return `${JSON.stringify(receipt, null, 2)}\n`
}
