import { describe, expect, it } from 'vitest'
import { restyleToStudioSystem } from '@/lib/analyzers/system-restyle'
import { buildStudioContractPack } from '@/lib/contracts/authored-contract'

describe('system restyle → pack', () => {
  it('applies skin tokens onto structure domain with detected app-type', () => {
    const restyle = restyleToStudioSystem({
      structureDomain: 'app.example.com',
      skinDomain: 'brand.example.com',
      name: 'Restyle Demo',
      layout: {
        containers: { strategy: 'fluid', maxWidth: '1280px' },
        gridSystem: 'css-grid',
        spacingBase: 4,
        breakpoints: [640, 1024, 1280],
        archetypes: [
          { type: 'dashboard', confidence: 0.9 },
          { type: 'settings', confidence: 0.7 },
        ],
        shell: {
          header: { height: 56, sticky: true },
          sidebar: { width: 240, fixed: true },
          footer: null,
        },
        density: {
          elementsInViewport: 420,
          imageAreaRatio: 0.05,
          textChars: 1200,
        },
      },
      skinCurated: {
        colors: [
          { value: '#0b1020', usage: 40 },
          { value: '#f8fafc', usage: 30 },
          { value: '#38bdf8', usage: 20 },
        ],
        typography: {
          families: [{ value: 'IBM Plex Sans' }],
          sizes: [{ value: '14px' }],
        },
        spacing: [{ value: '4px' }, { value: '8px' }, { value: '16px' }],
        radius: [{ value: '6px' }],
        shadows: [],
      },
    })

    expect(restyle.system.name).toBe('Restyle Demo')
    expect(restyle.system.spacingBase).toBe(4)
    expect(restyle.appType.profile).toBe('web-app')
    expect(['saas-workbench', 'admin-console']).toContain(restyle.appType.appType)
    expect(restyle.brief).toContain('app.example.com')
    expect(restyle.brief).toContain('brand.example.com')

    const { pack, zip } = buildStudioContractPack(restyle.system, restyle.packOptions)
    expect(zip.byteLength).toBeGreaterThan(500)
    expect(pack.installCommand).toContain('--profile web-app')
    expect(pack.installCommand).toMatch(/--app-type (saas-workbench|admin-console)/)
  })
})
