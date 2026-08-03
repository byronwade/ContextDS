import { describe, expect, it } from 'vitest'
import {
  buildDesignContractPackage,
  screenshotPackPath,
  zipDesignContractPackage,
} from '@/lib/contracts/design-contract-package'

/** 1×1 PNG */
const TINY_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='

describe('design-contract-package screenshots', () => {
  it('embeds screenshots as pack-local surfaces and registers path sources', () => {
    const pack = buildDesignContractPackage({
      domain: 'example.com',
      url: 'https://example.com/',
      curatedTokens: {
        colors: [
          { name: 'bg', value: '#111111', usage: 20 },
          { name: 'fg', value: '#eeeeee', usage: 20 },
          { name: 'primary', value: '#3b82f6', usage: 10 },
        ],
        typography: {
          families: [{ name: 'body', value: 'Inter, sans-serif', usage: 10 }],
          sizes: [{ name: 'body', value: '14px', usage: 10 }],
        },
        spacing: [{ value: '8px', usage: 10 }],
        radius: [{ value: '6px', usage: 10 }],
      },
      screenshots: [
        {
          label: 'homepage-desktop',
          mime: 'image/png',
          bytesBase64: TINY_PNG_BASE64,
          note: 'Ground truth homepage',
        },
        {
          label: 'pricing',
          mime: 'image/png',
          bytesBase64: TINY_PNG_BASE64,
        },
      ],
    })

    const surface = pack.files.find((file) =>
      file.path.startsWith('design/references/surfaces/')
    )
    expect(surface?.encoding).toBe('base64')
    expect(surface?.content).toBe(TINY_PNG_BASE64)

    const manifest = pack.files.find((file) => file.path === 'design/references/manifest.json')
    expect(manifest?.content).toContain('"path": "design/references/surfaces/')
    expect(manifest?.content).not.toMatch(/"source": \{\s*"url"/)

    const designMd = pack.files.find((file) => file.path === 'DESIGN.md')?.content || ''
    expect(designMd).toContain('design/references/surfaces/')
    expect(designMd).toContain('Open these images')

    const skill = pack.files.find((file) =>
      file.path.includes('-design-system/SKILL.md')
    )?.content
    expect(skill).toContain('design/references/surfaces/')
    expect(skill).toContain('open when stuck')

    const zip = zipDesignContractPackage(pack)
    expect(zip.byteLength).toBeGreaterThan(500)
  })

  it('builds stable surface paths', () => {
    expect(screenshotPackPath(0, 'Home Page', 'image/jpeg')).toBe(
      'design/references/surfaces/01-home-page.jpg'
    )
  })
})
