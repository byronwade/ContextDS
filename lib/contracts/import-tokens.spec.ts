import { describe, expect, it } from 'vitest'
import { buildStudioContractPack } from '@/lib/contracts/authored-contract'
import {
  importCssVariables,
  importDesignMd,
  importDesignTokens,
  importDtcgTokens,
  importTailwindTheme,
} from '@/lib/contracts/import-tokens'

describe('importDesignTokens', () => {
  it('imports W3C DTCG color + type tokens', () => {
    const result = importDtcgTokens({
      $metadata: { name: 'Acme Tokens' },
      color: {
        background: { $type: 'color', $value: '#0a0a0a' },
        foreground: { $type: 'color', $value: '#fafafa' },
        primary: { $type: 'color', $value: '#22d3ee' },
        border: { $type: 'color', $value: '#27272a' },
      },
      fontFamily: {
        body: { $type: 'fontFamily', $value: 'Inter' },
      },
      radius: {
        md: { $type: 'dimension', $value: '10px' },
      },
    })

    expect(result.format).toBe('dtcg')
    expect(result.system.name).toBe('Acme Tokens')
    expect(result.system.colors.some((c) => c.role === 'primary')).toBe(true)
    expect(result.system.fontBody).toBe('Inter')
    expect(result.system.radius).toBe(10)
    expect(result.tokenCount).toBeGreaterThanOrEqual(5)
  })

  it('imports DESIGN.md YAML front-matter', () => {
    const md = `---
name: Editorial Cream
colors:
  background: "#f7f4ef"
  foreground: "#1c1917"
  primary: "#c2410c"
  muted: "#78716c"
  border: "#e7e5e4"
fonts:
  display: Georgia
  body: Georgia
  mono: Geist Mono
radius: 12px
---

# Editorial Cream
`
    const result = importDesignMd(md)
    expect(result.format).toBe('design-md')
    expect(result.system.name).toBe('Editorial Cream')
    expect(result.system.colors.find((c) => c.role === 'primary')?.value).toBe('#c2410c')
    expect(result.system.fontDisplay).toBe('Georgia')
    expect(result.system.radius).toBe(12)
  })

  it('imports CSS custom properties', () => {
    const css = `:root {
  --color-background: #111111;
  --color-foreground: #eeeeee;
  --color-primary: #84cc16;
  --color-border: #333333;
  --radius-md: 8px;
  --space-2: 8px;
  --font-body: "IBM Plex Sans", sans-serif;
}`
    const result = importCssVariables(css, { name: 'CSS Ops' })
    expect(result.format).toBe('css')
    expect(result.system.name).toBe('CSS Ops')
    expect(result.system.colors.length).toBeGreaterThanOrEqual(3)
    expect(result.system.radius).toBe(8)
  })

  it('imports Tailwind theme snippets', () => {
    const source = `module.exports = {
  theme: {
    extend: {
      colors: {
        background: '#ffffff',
        foreground: '#0f172a',
        primary: '#4f46e5',
        border: '#e2e8f0',
      },
      borderRadius: { md: '12px' },
      fontFamily: { sans: ['Geist', 'sans-serif'] },
    },
  },
}`
    const result = importTailwindTheme(source, { name: 'TW Theme' })
    expect(result.format).toBe('tailwind')
    expect(result.system.colors.some((c) => c.value === '#4f46e5')).toBe(true)
  })

  it('auto-detects JSON and builds an installable pack', () => {
    const raw = JSON.stringify({
      color: {
        background: { $value: '#101010' },
        foreground: { $value: '#f5f5f5' },
        primary: { $value: '#f97316' },
      },
    })
    const imported = importDesignTokens(raw, { name: 'Auto Pack' })
    expect(imported.format).toBe('dtcg')
    const { pack, zip, fileName } = buildStudioContractPack(imported.system)
    expect(fileName).toMatch(/\.zip$/)
    expect(zip.byteLength).toBeGreaterThan(500)
    expect(pack.installCommand).toMatch(/--profile/)
    expect(pack.files.some((f) => f.path === 'DESIGN.md')).toBe(true)
  })
})
