import { describe, expect, it } from 'vitest'
import { curatedToW3CTokenSet } from '@/lib/analyzers/curated-to-w3c'
import { compareTokenSets, generateChangelog } from '@/lib/analyzers/version-diff'

describe('curatedToW3CTokenSet', () => {
  it('projects curated colors and type into W3C paths', () => {
    const set = curatedToW3CTokenSet({
      colors: [
        { name: 'primary', value: '#ff0000' },
        { name: 'background', value: '#111111' },
      ],
      typography: {
        families: [{ name: 'body', value: 'Geist' }],
        sizes: [{ name: 'md', value: '16px' }],
      },
      spacing: [{ name: 'md', value: '8px' }],
      radius: [{ name: 'md', value: '12px' }],
    })

    const paths = Object.keys((set as { color?: object }).color || {})
    expect(paths).toContain('primary')
    expect(paths).toContain('background')
  })

  it('powers compareTokenSets for version diffs without Postgres', () => {
    const oldSet = curatedToW3CTokenSet({
      colors: [
        { name: 'primary', value: '#111111' },
        { name: 'accent', value: '#00ff00' },
      ],
      typography: { families: [{ name: 'body', value: 'Inter' }] },
    })
    const newSet = curatedToW3CTokenSet({
      colors: [
        { name: 'primary', value: '#222222' },
        { name: 'surface', value: '#eeeeee' },
      ],
      typography: { families: [{ name: 'body', value: 'Geist' }] },
    })

    const diff = compareTokenSets(oldSet, newSet)
    expect(diff.summary.totalChanges).toBeGreaterThan(0)
    expect(diff.removed.some((change) => change.path.includes('accent'))).toBe(true)
    expect(diff.added.some((change) => change.path.includes('surface'))).toBe(true)
    expect(diff.modified.some((change) => change.path.includes('primary'))).toBe(true)

    const changelog = generateChangelog(diff)
    expect(changelog).toContain('Design Token Changes')
    expect(changelog).toContain('Total Changes')
  })
})
