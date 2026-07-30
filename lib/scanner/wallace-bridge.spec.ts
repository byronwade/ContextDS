import { describe, expect, it } from 'vitest'
import type { CuratedTokenSet } from '@/lib/analyzers/token-curator'
import { analyzeWithWallace, mergeCuratedSets } from '@/lib/scanner/wallace-bridge'

const emptySet = (): CuratedTokenSet => ({
  colors: [],
  typography: { families: [], sizes: [], weights: [] },
  spacing: [],
  radius: [],
  shadows: [],
  motion: [],
})

describe('analyzeWithWallace', () => {
  it('extracts colors and fonts from real CSS values.* shape', () => {
    const css = `
      body { color: #0f172a; background: #f8fafc; font-family: "Inter", sans-serif; font-size: 16px; }
      h1 { color: #0f172a; font-size: 48px; border-radius: 12px; }
      .card { box-shadow: 0 8px 24px rgba(15,23,42,0.08); border-radius: 16px; }
    `
    const { curated, meta } = analyzeWithWallace(css)

    expect(meta.engine).toBe('project-wallace')
    expect(meta.declarations).toBeGreaterThan(0)
    expect(curated.colors.length).toBeGreaterThan(0)
    expect(curated.typography.families.length).toBeGreaterThan(0)
    expect(curated.typography.sizes.length).toBeGreaterThan(0)
    expect(curated.radius.length).toBeGreaterThan(0)
  })

  it('handles empty CSS without throwing', () => {
    const { curated, meta } = analyzeWithWallace('')
    expect(meta.engine).toBe('project-wallace')
    expect(curated.colors).toEqual([])
  })
})

describe('mergeCuratedSets', () => {
  it('prefers higher-usage duplicates and marks merged metadata', () => {
    const primary = emptySet()
    primary.colors = [
      {
        name: 'color-a',
        value: '#111111',
        usage: 2,
        confidence: 60,
        percentage: 20,
        category: 'color',
      },
    ]

    const secondary = emptySet()
    secondary.colors = [
      {
        name: 'color-b',
        value: '#111111',
        usage: 9,
        confidence: 90,
        percentage: 80,
        category: 'color',
      },
      {
        name: 'color-c',
        value: '#eeeeee',
        usage: 3,
        confidence: 70,
        percentage: 30,
        category: 'color',
      },
    ]

    const merged = mergeCuratedSets(primary, secondary)
    expect(merged.metadata?.merged).toBe(true)
    expect(merged.colors).toHaveLength(2)
    expect(merged.colors[0]?.value).toBe('#111111')
    expect(merged.colors[0]?.usage).toBe(9)
  })
})
