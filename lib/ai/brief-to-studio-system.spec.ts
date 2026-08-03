import { describe, expect, it } from 'vitest'
import { briefToStudioSystem } from '@/lib/ai/brief-to-studio-system'
import { buildStudioContractPack } from '@/lib/contracts/authored-contract'

describe('briefToStudioSystem', () => {
  it('heuristically synthesizes a dark ops system without AI gateway', async () => {
    const { system, source } = await briefToStudioSystem({
      brief:
        'A dense dark ops workbench for infrastructure — teal accents, monospace secondary, sharp corners, 4px grid.',
      name: 'Infra Ops',
    })

    expect(source).toBe('heuristic')
    expect(system.name).toBe('Infra Ops')
    expect(system.colors.length).toBeGreaterThanOrEqual(4)
    expect(system.philosophyNote.toLowerCase()).toMatch(/ops|workbench|infrastructure/)
  })

  it('builds a full pack from a warm editorial brief', async () => {
    const { system } = await briefToStudioSystem({
      brief:
        'Warm cream editorial brand site with serif display, terracotta accent, soft paper depth.',
      name: 'Warm Editorial',
    })
    const { pack, zip } = buildStudioContractPack(system)
    expect(zip.byteLength).toBeGreaterThan(500)
    expect(pack.designMd.markdown).toContain('Warm Editorial')
    expect(pack.installCommand).toMatch(/npx/)
  })
})
