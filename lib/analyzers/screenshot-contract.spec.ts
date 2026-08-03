import { describe, expect, it } from 'vitest'
import {
  mapVisionDraftToContractInput,
  syntheticUploadDomain,
  type VisionContractDraft,
} from '@/lib/analyzers/screenshot-contract'
import { generateDesignMd } from '@/lib/analyzers/design-md-generator'

const draft: VisionContractDraft = {
  productName: 'Cursor',
  surfaceKind: 'ide',
  distinctiveSignature: 'Dark dense IDE chrome with scarce blue accent and mono labels.',
  polarity: 'dark-leaning',
  colors: {
    bg: '#181818',
    fg: '#E8E8E8',
    primary: '#3B82F6',
    secondary: '#2A2A2A',
    muted: '#8A8A8A',
    border: '#2F2F2F',
    panel: '#141414',
  },
  typography: {
    headlineFont: 'Inter, system-ui, sans-serif',
    bodyFont: 'Inter, system-ui, sans-serif',
    baseSizePx: 13,
    headlineSizePx: 16,
    headlineWeight: 600,
    bodyWeight: 400,
    typeVoice: 'Compact UI sans with mono for code',
  },
  spacingBasePx: 4,
  radius: { controlPx: 6, surfacePx: 8, character: 'slightly rounded' },
  depth: 'hairline',
  density: 'operational',
  shell: {
    hasSidebar: true,
    sidebarWidthPx: 260,
    hasTopBar: true,
    topBarHeightPx: 40,
    chromeNote: 'Activity bar + sidebar + editor',
  },
  components: {
    buttonPrimary: {
      backgroundColor: '#3B82F6',
      textColor: '#FFFFFF',
      roundedPx: 6,
      paddingYPx: 6,
      paddingXPx: 12,
    },
  },
  motionGuess: 'brisk',
  preferred: ['Keep accent scarce', 'Prefer dense operational density', 'Use hairline separators'],
  dos: ['Match panel vs canvas contrast', 'Use compact 13px body', 'Sidebar stays fixed'],
  donts: ['Do not invent marketing heroes', 'Do not use large display type', 'Do not flood blue'],
  overview: 'A dark IDE workbench reconstructed from a product screenshot.',
}

describe('screenshot-contract mapping', () => {
  it('maps vision drafts to web-app packs with measured recipes', () => {
    const domain = syntheticUploadDomain('Cursor')
    expect(domain).toMatch(/cursor-.*\.upload$/)

    const mapped = mapVisionDraftToContractInput({
      draft,
      domain,
      url: `https://${domain}/`,
      preferApp: true,
    })

    expect(mapped.profile).toBe('web-app')
    expect(mapped.appType).toBe('saas-workbench')
    expect(mapped.designMdInput.curatedTokens.colors?.[0]?.value).toBe('#181818')
    expect(mapped.designMdInput.measuredComponents?.['button-primary']?.backgroundColor).toBe(
      '#3B82F6'
    )

    const md = generateDesignMd(mapped.designMdInput)
    expect(md.markdown).toContain('button-primary:')
    expect(md.markdown).toContain('#3B82F6')
    expect(md.markdown).toContain('Dark dense IDE')
    expect(md.summary.aiComposed).toBe(true)
  })
})
