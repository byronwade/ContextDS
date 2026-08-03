import { describe, expect, it } from 'vitest'
import { generateDesignSkill } from '@/lib/analyzers/design-skill-generator'

describe('generateDesignSkill', () => {
  it('includes philosophy principles and measured component keys', () => {
    const skill = generateDesignSkill({
      domain: 'example.com',
      url: 'https://example.com',
      curatedTokens: {
        colors: [{ value: '#111111' }],
        typography: { families: [{ value: 'Geist Sans' }] },
        spacing: [{ value: '8px' }],
        radius: [{ value: '8px' }],
      },
      philosophy: {
        title: 'Scarce orange workbench',
        statement: 'Cream paper with a scarce orange accent.',
        traits: ['scarce-accent', 'paper-first'],
        principles: [{ title: 'Scarcity', body: 'Accent is expensive.' }],
        motionTempo: 'brisk',
        typeVoice: 'geometric sans',
        shapeCharacter: 'soft',
        depth: 'hairline',
      },
      measuredComponents: ['button-primary', 'surface-card'],
    })

    expect(skill.markdown).toContain('Cream paper with a scarce orange accent')
    expect(skill.markdown).toContain('Scarcity')
    expect(skill.markdown).toContain('button-primary')
    expect(skill.markdown).toContain('brisk')
    expect(skill.markdown).toContain('github:byronwade/Design check')
  })
})
