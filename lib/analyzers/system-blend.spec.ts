import { describe, expect, it } from 'vitest'
import { blendSystems } from '@/lib/analyzers/system-blend'
import { buildStudioContractPack } from '@/lib/contracts/authored-contract'
import type { CuratedLike } from '@/lib/analyzers/design-philosophy'

function curated(primary: string, font: string): CuratedLike {
  return {
    colors: [
      { value: '#0e0e10', usage: 40 },
      { value: '#f4f4f5', usage: 40 },
      { value: primary, usage: 20 },
      { value: '#888888', usage: 10 },
    ],
    typography: {
      families: [{ value: font }, { value: 'Geist Mono' }],
      sizes: [{ value: '16px' }, { value: '20px' }, { value: '28px' }],
    },
    spacing: [{ value: '8px' }, { value: '16px' }, { value: '24px' }],
    radius: [{ value: '8px' }, { value: '12px' }],
    shadows: [{ value: '0 1px 2px rgba(0,0,0,0.1)' }],
  }
}

describe('blendSystems → pack', () => {
  it('merges two curated systems deterministically', () => {
    const a = blendSystems(
      [
        { domain: 'alpha.example', curated: curated('#22d3ee', 'Inter') },
        { domain: 'beta.example', curated: curated('#a78bfa', 'Geist') },
      ],
      'Alpha Beta'
    )
    const b = blendSystems(
      [
        { domain: 'alpha.example', curated: curated('#22d3ee', 'Inter') },
        { domain: 'beta.example', curated: curated('#a78bfa', 'Geist') },
      ],
      'Alpha Beta'
    )

    expect(a.system.colors).toEqual(b.system.colors)
    expect(a.sources).toEqual(['alpha.example', 'beta.example'])
    expect(Object.keys(a.attribution).length).toBeGreaterThan(0)
  })

  it('emits an installable ZIP façade', () => {
    const blend = blendSystems(
      [
        { domain: 'one.test', curated: curated('#f97316', 'IBM Plex Sans') },
        { domain: 'two.test', curated: curated('#14b8a6', 'IBM Plex Sans') },
      ],
      'One Two Blend'
    )
    const { pack, zip, fileName } = buildStudioContractPack(blend.system)
    expect(fileName).toMatch(/one-two-blend/)
    expect(zip.byteLength).toBeGreaterThan(500)
    expect(pack.files.some((f) => f.path === 'DESIGN.md')).toBe(true)
    expect(pack.installCommand).toMatch(/--app-type/)
  })

  it('rejects fewer than two sources', () => {
    expect(() =>
      blendSystems([{ domain: 'solo.test', curated: curated('#fff', 'Geist') }])
    ).toThrow(/at least 2/i)
  })
})
