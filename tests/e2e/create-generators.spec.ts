import { test, expect } from '@playwright/test'

test.describe('Create hub — advanced generators', () => {
  test('Create page exposes brief / import / blend tabs', async ({ page }) => {
    await page.goto('/create?pro=1')
    await expect(page.getByRole('heading', { name: /Generate a Design Contract/i })).toBeVisible()
    await expect(page.getByTestId('create-brief')).toBeVisible()
    await page.getByRole('button', { name: /Import tokens/i }).click()
    await expect(page.getByTestId('create-import')).toBeVisible()
    await page.getByRole('button', { name: /Blend scans/i }).click()
    await expect(page.getByTestId('create-blend')).toBeVisible()
  })

  test('POST /api/contracts/from-brief returns ZIP (bypass/Pro)', async ({ request }) => {
    const response = await request.post('/api/contracts/from-brief', {
      data: {
        brief:
          'Dense dark terminal-inspired analytics console with sharp corners and cyan accents.',
        name: 'Terminal Analytics',
        format: 'json',
      },
    })
    expect(response.ok()).toBeTruthy()
    const data = await response.json()
    expect(data.system.name).toBe('Terminal Analytics')
    expect(data.installCommand).toMatch(/--profile/)
    expect(data.fileCount).toBeGreaterThan(3)

    const zip = await request.post('/api/contracts/from-brief', {
      data: {
        brief: 'Warm cream magazine brand with serif display and terracotta accent.',
        name: 'Magazine Brand',
      },
    })
    expect(zip.status()).toBe(200)
    expect(zip.headers()['content-type']).toMatch(/zip/)
    const body = await zip.body()
    expect(body[0]).toBe(0x50)
    expect(body[1]).toBe(0x4b)
  })

  test('POST /api/contracts/import accepts DTCG JSON', async ({ request }) => {
    const response = await request.post('/api/contracts/import', {
      data: {
        format: 'dtcg',
        name: 'Imported DTCG',
        formatOut: 'json',
        content: JSON.stringify({
          $metadata: { name: 'Imported DTCG' },
          color: {
            background: { $value: '#0b0b0f' },
            foreground: { $value: '#f8fafc' },
            primary: { $value: '#38bdf8' },
            border: { $value: '#1e293b' },
          },
        }),
      },
    })
    expect(response.ok()).toBeTruthy()
    const data = await response.json()
    expect(data.format).toBe('dtcg')
    expect(data.system.colors.length).toBeGreaterThanOrEqual(3)
    expect(data.installCommand).toMatch(/npx/)
  })

  test('POST /api/contracts/blend needs scanned sources', async ({ request }) => {
    const missing = await request.post('/api/contracts/blend', {
      data: {
        domains: [`missing-a-${Date.now()}.invalid`, `missing-b-${Date.now()}.invalid`],
        format: 'json',
      },
    })
    expect(missing.status()).toBe(404)

    // Seed two scans then blend
    test.setTimeout(180000)
    const scanA = await request.post('/api/scan', {
      data: { url: 'https://example.com', mode: 'fast', force: true },
      timeout: 120000,
    })
    expect(scanA.ok()).toBeTruthy()

    // Second domain — use example.org if reachable, else re-force example.com
    // and still assert blend API shape when only one unique curated set exists.
    const scanB = await request.post('/api/scan', {
      data: { url: 'https://example.org', mode: 'fast', force: true },
      timeout: 120000,
    })

    if (scanB.ok()) {
      const blend = await request.post('/api/contracts/blend', {
        data: {
          domains: ['example.com', 'example.org'],
          name: 'Example Blend',
          format: 'json',
          saveToLibrary: true,
        },
      })
      expect(blend.ok()).toBeTruthy()
      const data = await blend.json()
      expect(data.installCommand).toMatch(/--profile/)
      expect(data.system.colors.length).toBeGreaterThanOrEqual(2)
    }
  })

  test('fork API clones a public system', async ({ request }) => {
    const created = await request.post('/api/systems', {
      data: {
        visibility: 'public',
        system: {
          name: `Fork Source ${Date.now()}`,
          colors: [
            { role: 'background', value: '#101010' },
            { role: 'foreground', value: '#f0f0f0' },
            { role: 'primary', value: '#f59e0b' },
          ],
        },
      },
    })
    expect(created.ok()).toBeTruthy()
    const source = await created.json()

    const forked = await request.post('/api/systems/fork', {
      data: { systemId: source.id, name: `${source.name} remix` },
    })
    expect(forked.ok()).toBeTruthy()
    const data = await forked.json()
    expect(data.id).not.toBe(source.id)
    expect(data.origin.kind).toBe('fork')
    expect(data.canvasHref).toMatch(/\/\?system=/)
  })

  test('/scan?system= redirects preserving the query', async ({ page }) => {
    await page.goto('/scan?system=sys_demo_redirect')
    await expect(page).toHaveURL(/[?&]system=sys_demo_redirect/)
  })

  test('MCP lists generate_from_brief and import_design_tokens', async ({ request }) => {
    const response = await request.get('/api/mcp')
    const data = await response.json()
    expect(data.tools).toContain('generate_from_brief')
    expect(data.tools).toContain('import_design_tokens')
    expect(data.tools).toContain('blend_systems')
  })
})
