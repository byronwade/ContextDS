import { describe, expect, it } from 'vitest'
import { createWorkingSystem } from '@/lib/design-system/working-system'
import { saveSystem } from '@/lib/storage/system-store'
import { forkStoredSystem } from '@/lib/design-system/fork-system'

describe('forkStoredSystem', () => {
  it('clones a library system with fork lineage', async () => {
    const source = await saveSystem({
      system: createWorkingSystem({
        name: 'Source System',
        colors: [
          { id: 'background', role: 'background', value: '#111111' },
          { id: 'foreground', role: 'foreground', value: '#eeeeee' },
          { id: 'primary', role: 'primary', value: '#22c55e' },
        ],
      }),
      visibility: 'public',
    })

    const { stored, system } = await forkStoredSystem({
      systemId: source.id,
      name: 'Source System fork',
    })

    expect(stored.id).not.toBe(source.id)
    expect(stored.origin).toEqual({
      kind: 'fork',
      systemId: source.id,
      name: 'Source System',
    })
    expect(system.origin.kind).toBe('fork')
    expect(system.colors.find((c) => c.role === 'primary')?.value).toBe('#22c55e')
  })
})
