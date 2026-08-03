import { describe, expect, it } from 'vitest'
import { generateDesignMd } from '@/lib/analyzers/design-md-generator'
import { generatePhilosophy } from '@/lib/analyzers/design-philosophy'

describe('generateDesignMd', () => {
  const curated = {
    colors: [
      { name: 'ink', value: '#111111', usage: 40 },
      { name: 'paper', value: '#FAFAF7', usage: 35 },
      { name: 'accent', value: '#F54E00', usage: 12, semantic: 'primary' },
      { name: 'muted', value: '#6B6B6B', usage: 10 },
    ],
    typography: {
      families: [
        { name: 'display', value: 'Inter, sans-serif', usage: 20 },
        { name: 'body', value: 'Inter, sans-serif', usage: 40 },
      ],
      sizes: [
        { name: 'h1', value: '48px', usage: 4 },
        { name: 'h2', value: '32px', usage: 6 },
        { name: 'body', value: '16px', usage: 50 },
        { name: 'label', value: '13px', usage: 12 },
      ],
      weights: [
        { name: 'bold', value: '700', usage: 10 },
        { name: 'regular', value: '400', usage: 40 },
      ],
      lineHeights: [
        { name: 'tight', value: '1.15', usage: 4 },
        { name: 'body', value: '1.5', usage: 30 },
      ],
    },
    spacing: [
      { value: '4px', usage: 10 },
      { value: '8px', usage: 40 },
      { value: '16px', usage: 30 },
      { value: '24px', usage: 20 },
      { value: '32px', usage: 10 },
    ],
    radius: [
      { value: '6px', usage: 10 },
      { value: '8px', usage: 20 },
      { value: '12px', usage: 8 },
      { value: '9999px', usage: 2 },
    ],
    shadows: [{ value: '0 1px 2px rgba(0,0,0,0.08)', usage: 5 }],
    motion: [
      { value: '120ms', usage: 8 },
      { value: '200ms', usage: 4 },
      { value: 'ease-out', usage: 6 },
    ],
  }

  it('emits philosophy-grounded prose, motion tokens, and line heights', () => {
    const philosophy = generatePhilosophy({
      domain: 'example.com',
      curated,
      primaryFont: 'Inter, sans-serif',
      ux: {
        shell: { header: { height: 64, sticky: true }, sidebar: null, footer: null },
        density: { elementsInViewport: 220, imageAreaRatio: 0.2, textChars: 1200 },
        interaction: {
          rules: 4,
          effects: [{ value: 'hover background-color', weight: 3 }],
        },
        keyframeCount: 2,
        pagesAudited: 3,
      },
    })

    const artifact = generateDesignMd({
      domain: 'example.com',
      url: 'https://example.com',
      curatedTokens: curated,
      confidence: 88,
      philosophy,
      uxEvidence: {
        shell: { header: { height: 64, sticky: true }, sidebar: null, footer: null },
        density: { elementsInViewport: 220, imageAreaRatio: 0.2, textChars: 1200 },
        interaction: {
          rules: 4,
          effects: [{ value: 'hover background-color', weight: 3 }],
        },
      },
      layoutDNA: {
        containers: { maxWidth: '1200px', strategy: 'centered' },
        breakpoints: [768, 1024],
        spacingBase: 8,
        archetypes: [{ type: 'marketing-hero', confidence: 0.7 }],
      },
    })

    expect(artifact.summary.hasPhilosophy).toBe(true)
    expect(artifact.summary.hasMotion).toBe(true)
    expect(artifact.markdown).toContain('motion:')
    expect(artifact.markdown).toContain('lineHeight:')
    expect(artifact.markdown).toContain('## Design Principles')
    expect(artifact.markdown).toContain('## Motion')
    expect(artifact.markdown).toContain('sticky')
    expect(artifact.markdown).not.toContain('chromatic-typed-rhythmic')
    expect(artifact.markdown).toContain('64px')
  })

  it('prefers measured component recipes over graph stubs', () => {
    const artifact = generateDesignMd({
      domain: 'example.com',
      url: 'https://example.com',
      curatedTokens: curated,
      confidence: 91,
      measuredComponents: {
        'button-primary': {
          backgroundColor: '#F54E00',
          textColor: '#FFFFFF',
          rounded: '10px',
          padding: '10px 18px',
          fontWeight: '600',
          sampleCount: 4,
          hover: { backgroundColor: '#D94400', transform: 'translateY(-1px)' },
        },
        'surface-card': {
          backgroundColor: '#FAFAF7',
          textColor: '#111111',
          rounded: '14px',
          padding: '20px 20px',
          boxShadow: '0 1px 2px rgba(0,0,0,0.08)',
          sampleCount: 3,
        },
      },
      uxMotion: {
        transitions: [{ value: '160ms ease-out (opacity)', weight: 8 }],
        keyframes: [{ name: 'fade-in' }, { name: 'slide-up' }],
      },
    })

    expect(artifact.markdown).toContain('button-primary:')
    expect(artifact.markdown).toContain('#F54E00')
    expect(artifact.markdown).toContain('10px 18px')
    expect(artifact.markdown).toContain('hover:')
    expect(artifact.markdown).toContain('translateY(-1px)')
    expect(artifact.markdown).toContain('measured from live computed styles')
    expect(artifact.markdown).toContain('160ms')
    expect(artifact.markdown).toContain('fade-in')
  })

  it('prefers AI prose when provided without inventing tokens', () => {
    const artifact = generateDesignMd({
      domain: 'example.com',
      url: 'https://example.com',
      curatedTokens: curated,
      confidence: 90,
      aiProse: {
        distinctiveSignature: 'Scarce orange on cream paper with hairline depth.',
        overview: 'A cream workbench system rebuilt from live CSS.',
        preferred: ['Keep accent scarce on CTAs only.'],
        dos: ['Use YAML colors only.'],
        donts: ['Do not invent Inter if a site font exists.'],
        motionGuidance: 'Motion is near-instant feedback.',
        typeVoice: 'Inter at regular weight for body; heavier for titles.',
      },
    })

    expect(artifact.summary.aiComposed).toBe(true)
    expect(artifact.markdown).toContain('Scarce orange on cream paper')
    expect(artifact.markdown).toContain('A cream workbench system')
    expect(artifact.markdown).toContain('colors:')
    expect(artifact.markdown).toMatch(/primary:\s*"?#/i)
  })
})
