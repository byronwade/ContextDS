import { describe, expect, it } from 'vitest'
import { getContrastRatio } from '@/lib/contrast-checker'
import { DEFAULT_STUDIO_SYSTEM } from '@/lib/contracts/authored-contract'
import {
  evolveStudioSystem,
  fixStudioContrast,
  invertStudioPolarity,
} from '@/lib/contracts/system-mutate'

describe('system mutate', () => {
  it('fixes failing foreground/background contrast to AA', () => {
    const weak = {
      ...DEFAULT_STUDIO_SYSTEM,
      colors: [
        { id: 'background', role: 'background', value: '#eeeeee' },
        { id: 'foreground', role: 'foreground', value: '#cccccc' },
        { id: 'primary', role: 'primary', value: '#dddddd' },
        { id: 'muted', role: 'muted', value: '#d0d0d0' },
      ],
    }
    const before = getContrastRatio('#cccccc', '#eeeeee')
    expect(before).not.toBeNull()
    expect(before!).toBeLessThan(4.5)

    const fixed = fixStudioContrast(weak, 'AA')
    expect(fixed.changed).toBe(true)
    const fg = fixed.system.colors.find((c) => c.role === 'foreground')!.value
    const bg = fixed.system.colors.find((c) => c.role === 'background')!.value
    const after = getContrastRatio(fg, bg)
    expect(after).not.toBeNull()
    expect(after!).toBeGreaterThanOrEqual(4.5)
  })

  it('inverts polarity swapping background and foreground', () => {
    const inverted = invertStudioPolarity(DEFAULT_STUDIO_SYSTEM)
    const bg = inverted.colors.find((c) => c.role === 'background')!.value
    const fg = inverted.colors.find((c) => c.role === 'foreground')!.value
    expect(bg).toBe(
      DEFAULT_STUDIO_SYSTEM.colors.find((c) => c.role === 'foreground')!.value
    )
    expect(fg).toBe(
      DEFAULT_STUDIO_SYSTEM.colors.find((c) => c.role === 'background')!.value
    )
    expect(inverted.name).toMatch(/inverted/i)
  })

  it('evolves density / sharpness from a directive', () => {
    const evolved = evolveStudioSystem(DEFAULT_STUDIO_SYSTEM, 'dense terminal ops sharp corners')
    expect(evolved.spacingBase).toBe(4)
    expect(evolved.radius).toBeLessThanOrEqual(6)
    expect(evolved.depth).toBe('flat')
    expect(evolved.philosophyNote).toMatch(/dense terminal/)
  })
})
