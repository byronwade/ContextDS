import { describe, expect, it } from 'vitest'
import {
  buildStudioContractPack,
  DEFAULT_STUDIO_SYSTEM,
  studioSystemToPackInput,
} from '@/lib/contracts/authored-contract'

describe('Studio → Design Contract pack', () => {
  it('maps authored tokens into pack input', () => {
    const input = studioSystemToPackInput(DEFAULT_STUDIO_SYSTEM)
    expect(input.domain).toContain('.studio')
    expect(input.profile).toBe('web-marketing')
    expect(input.curatedTokens.colors?.length).toBeGreaterThanOrEqual(5)
    expect(input.curatedTokens.typography?.families?.length).toBe(3)
    expect(input.driftObservations?.[0]?.kind).toBe('authored-studio')
  })

  it('builds a zip with DESIGN.md, skills, and engine façade files', () => {
    const { pack, zip, fileName } = buildStudioContractPack({
      ...DEFAULT_STUDIO_SYSTEM,
      name: 'Hardcore Studio',
      slug: 'hardcore-studio',
      philosophyNote: 'Dense operational chrome with calm paper surfaces.',
    })

    expect(fileName).toBe('hardcore-studio-design-contract.zip')
    expect(zip.byteLength).toBeGreaterThan(800)
    expect(pack.files.some((file) => file.path === 'DESIGN.md')).toBe(true)
    expect(pack.files.some((file) => file.path === 'AGENTS.md')).toBe(true)
    expect(
      pack.files.some((file) => file.path.includes('SKILL.md') || file.path.includes('skills/'))
    ).toBe(true)
    expect(pack.designMd.markdown).toContain('Hardcore Studio')
    expect(pack.installCommand).toMatch(/--profile/)
    expect(pack.installCommand).toMatch(/--app-type/)
  })

  it('keeps authored DESIGN.md prose instead of scanner boilerplate', () => {
    const system = {
      ...DEFAULT_STUDIO_SYSTEM,
      name: 'Authored Voice',
      slug: 'authored-voice',
      philosophyNote: 'UNIQUE_STUDIO_SIGNATURE_LINE',
    }
    const { pack } = buildStudioContractPack(system)
    const design = pack.files.find((file) => file.path === 'DESIGN.md')
    expect(design?.content).toContain('UNIQUE_STUDIO_SIGNATURE_LINE')
  })

  it('accepts profile / app-type pack options for web-app recipes', () => {
    const { pack } = buildStudioContractPack(DEFAULT_STUDIO_SYSTEM, {
      profile: 'web-app',
      appType: 'saas-workbench',
      driftKind: 'recipe-preset',
    })
    expect(pack.installCommand).toContain('--profile web-app')
    expect(pack.installCommand).toContain('--app-type saas-workbench')
    const input = studioSystemToPackInput(DEFAULT_STUDIO_SYSTEM, {
      appType: 'admin-console',
    })
    expect(input.profile).toBe('web-app')
    expect(input.appType).toBe('admin-console')
  })
})
