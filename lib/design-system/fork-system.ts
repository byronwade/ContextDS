/**
 * Fork a stored library system into a new WorkingSystem with lineage.
 */

import {
  createWorkingSystem,
  toStudioSystem,
  type WorkingSystem,
} from '@/lib/design-system/working-system'
import { slugify } from '@/lib/contracts/authored-contract'
import { getSystem, saveSystem, type StoredSystem } from '@/lib/storage/system-store'

export async function forkStoredSystem(input: {
  systemId: string
  name?: string
  visibility?: 'public' | 'private'
  ownerCustomerId?: string | null
  ownerEmail?: string | null
}): Promise<{ stored: StoredSystem; system: WorkingSystem }> {
  const source = await getSystem(input.systemId)
  if (!source) {
    throw new Error('System not found')
  }

  const studio = toStudioSystem(source.system)
  const name = (input.name?.trim() || `${source.name} fork`).slice(0, 80)
  const forked = createWorkingSystem({
    ...studio,
    id: null,
    name,
    slug: slugify(name),
    origin: { kind: 'fork', systemId: source.id, name: source.name },
    revision: 0,
    philosophyNote:
      studio.philosophyNote ||
      `Forked from ${source.name}. Edit freely — lineage is preserved.`,
  })

  const stored = await saveSystem({
    system: forked,
    visibility: input.visibility ?? 'public',
    ownerCustomerId: input.ownerCustomerId ?? null,
    ownerEmail: input.ownerEmail ?? null,
  })

  return {
    stored,
    system: { ...forked, id: stored.id },
  }
}
