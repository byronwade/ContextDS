import { describe, expect, it } from 'vitest'
import type { CuratedTokenSet } from '@/lib/analyzers/token-curator'
import { mergeCurated } from '@/lib/workers/remeasure-contract'

function token(
  name: string,
  value: string,
  category = 'color'
): CuratedTokenSet['colors'][number] {
  return {
    name,
    value,
    usage: 10,
    confidence: 90,
    percentage: 50,
    category,
  }
}

describe('App Pack CSS remeasure merge', () => {
  it('lets CSS-measured colors win over vision', () => {
    const vision: CuratedTokenSet = {
      colors: [token('primary', '#vision')],
      typography: { families: [], sizes: [], weights: [] },
      spacing: [],
      radius: [],
      shadows: [],
      motion: [],
    }
    const measured: CuratedTokenSet = {
      colors: [token('primary', '#measured')],
      typography: { families: [], sizes: [], weights: [] },
      spacing: [token('md', '8px', 'spacing')],
      radius: [],
      shadows: [],
      motion: [],
    }

    const merged = mergeCurated(vision, measured, 'css-wins')
    expect(merged.colors[0]?.value).toBe('#measured')
    expect(merged.spacing[0]?.value).toBe('8px')
    expect(merged.metadata?.merged).toBe(true)
  })

  it('fills gaps from vision when measured category is empty', () => {
    const vision: CuratedTokenSet = {
      colors: [token('primary', '#vision')],
      typography: {
        families: [token('body', 'Geist', 'font')],
        sizes: [],
        weights: [],
      },
      spacing: [],
      radius: [],
      shadows: [],
      motion: [],
    }
    const measured: CuratedTokenSet = {
      colors: [token('primary', '#css')],
      typography: { families: [], sizes: [], weights: [] },
      spacing: [],
      radius: [],
      shadows: [],
      motion: [],
    }

    const merged = mergeCurated(vision, measured, 'vision-fills-gaps')
    expect(merged.colors[0]?.value).toBe('#css')
    expect(merged.typography.families[0]?.value).toBe('Geist')
  })
})
