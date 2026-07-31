import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import {
  applyPatch,
  type SystemPatch,
  type WorkingSystem,
} from '@/lib/design-system/working-system'

/**
 * Canvas store — the one editable WorkingSystem the canvas paints.
 *
 * The draft is mirrored into localStorage so a reload keeps work in progress.
 * Hydration is deliberately effect-free: components read the persisted draft
 * through a cached useSyncExternalStore snapshot (same shape as
 * lib/chat-history.ts) and `hydrateCanvas()` pulls it into the store from an
 * event handler — never from a React effect.
 */

const DRAFT_KEY = 'dc:canvas-draft'
const DRAFT_EVENT = 'dc:canvas-draft-updated'

type CanvasDraft = {
  system: WorkingSystem
  open: boolean
  dirty: boolean
  updatedAt: number
}

let hydrated = false
let draftCache: WorkingSystem | null | undefined

function readDraft(): CanvasDraft | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(DRAFT_KEY)
    const parsed = raw ? (JSON.parse(raw) as CanvasDraft) : null
    if (!parsed || !parsed.system || !Array.isArray(parsed.system.colors)) return null
    return parsed
  } catch {
    return null
  }
}

function writeDraft(system: WorkingSystem, open: boolean, dirty: boolean): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(
      DRAFT_KEY,
      JSON.stringify({ system, open, dirty, updatedAt: Date.now() } satisfies CanvasDraft)
    )
    draftCache = system
    window.dispatchEvent(new CustomEvent(DRAFT_EVENT))
  } catch {
    /* storage full or unavailable — the draft stays in memory only */
  }
}

/** Short human label for a patch: "primary → #c08a5f", "radius → 16px". */
export function describePatch(patch: SystemPatch): string {
  const parts: string[] = []
  for (const [role, value] of Object.entries(patch.colors ?? {})) {
    parts.push(`${role} → ${value}`)
  }
  if (patch.name !== undefined) parts.push(`name → ${patch.name}`)
  if (patch.philosophyNote !== undefined) parts.push('philosophy note updated')
  if (patch.fontDisplay !== undefined) parts.push(`display → ${patch.fontDisplay}`)
  if (patch.fontBody !== undefined) parts.push(`body → ${patch.fontBody}`)
  if (patch.fontMono !== undefined) parts.push(`mono → ${patch.fontMono}`)
  if (patch.baseSize !== undefined) parts.push(`base size → ${patch.baseSize}px`)
  if (patch.scaleRatio !== undefined) parts.push(`scale → ${patch.scaleRatio}`)
  if (patch.scaleSteps !== undefined) parts.push(`scale steps → ${patch.scaleSteps}`)
  if (patch.spacingBase !== undefined) parts.push(`grid → ${patch.spacingBase}px`)
  if (patch.spacingSteps !== undefined) parts.push(`spacing steps → ${patch.spacingSteps}`)
  if (patch.radius !== undefined) parts.push(`radius → ${patch.radius}px`)
  if (patch.depth !== undefined) parts.push(`depth → ${patch.depth}`)
  if (parts.length === 0) return 'no change'
  return parts.slice(0, 2).join(' · ')
}

interface CanvasState {
  system: WorkingSystem | null
  open: boolean
  /** True once edited since the last save or open. */
  dirty: boolean
  /** Short human label of the most recent change. */
  lastPatchSummary: string | null

  /** Pull the persisted draft into the store. Safe to call repeatedly. */
  hydrateCanvas: () => void
  openCanvas: (system: WorkingSystem) => void
  closeCanvas: () => void
  patchSystem: (patch: SystemPatch, summary?: string) => void
  replaceSystem: (system: WorkingSystem) => void
  markSaved: (id: string) => void
}

export const useCanvasStore = create<CanvasState>()(
  devtools(
    (set, get) => ({
      system: null,
      open: false,
      dirty: false,
      lastPatchSummary: null,

      hydrateCanvas: () => {
        if (hydrated) return
        hydrated = true
        const draft = readDraft()
        if (!draft || get().system) return
        set({ system: draft.system, open: draft.open, dirty: draft.dirty })
      },

      openCanvas: (system) => {
        hydrated = true
        set({ system, open: true, dirty: false, lastPatchSummary: null })
        writeDraft(system, true, false)
      },

      closeCanvas: () => {
        const state = get()
        set({ open: false })
        if (state.system) writeDraft(state.system, false, state.dirty)
      },

      patchSystem: (patch, summary) => {
        get().hydrateCanvas()
        const state = get()
        if (!state.system) return
        const system = applyPatch(state.system, patch)
        set({
          system,
          dirty: true,
          lastPatchSummary: summary ?? describePatch(patch),
        })
        writeDraft(system, state.open, true)
      },

      replaceSystem: (system) => {
        hydrated = true
        set({ system, dirty: false, lastPatchSummary: null })
        writeDraft(system, get().open, false)
      },

      markSaved: (id) => {
        const state = get()
        if (!state.system) return
        const system: WorkingSystem = { ...state.system, id }
        set({ system, dirty: false })
        writeDraft(system, state.open, false)
      },
    }),
    { name: 'CanvasStore' }
  )
)

// --- useSyncExternalStore adapter (cached snapshot) ---------------------------

export function subscribeCanvasDraft(onStoreChange: () => void): () => void {
  const refresh = () => {
    draftCache = undefined
    onStoreChange()
  }
  window.addEventListener(DRAFT_EVENT, refresh)
  window.addEventListener('storage', refresh)
  return () => {
    window.removeEventListener(DRAFT_EVENT, refresh)
    window.removeEventListener('storage', refresh)
  }
}

/** Persisted draft, cached so the snapshot identity is stable between events. */
export function getCanvasDraftSnapshot(): WorkingSystem | null {
  if (draftCache === undefined) draftCache = readDraft()?.system ?? null
  return draftCache
}

export function getCanvasDraftServerSnapshot(): WorkingSystem | null {
  return null
}
