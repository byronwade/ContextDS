import { describe, expect, it } from 'vitest'
import { storedScanToClientResult } from './scan-client-result'

describe('storedScanToClientResult', () => {
  it('hydrates a completed scan without requiring a rescan', () => {
    const result = storedScanToClientResult({
      id: 'scan_abc',
      domain: 'stripe.com',
      url: 'https://stripe.com',
      status: 'completed',
      summary: {
        tokensExtracted: 42,
        confidence: 88,
        completeness: 80,
        reliability: 85,
        processingTime: 1200,
      },
      curatedTokens: { colors: [{ value: '#635BFF' }] },
      metadata: {
        scanId: 'scan_abc',
        tokenSetId: 'tok_1',
        cssSources: 12,
        mode: 'accurate',
        browserEngine: 'vercel-chromium',
      },
      screenshots: [{ label: 'desktop', url: 'https://example.com/shot.png' }],
    })

    expect(result.status).toBe('completed')
    expect(result.domain).toBe('stripe.com')
    expect(result.cacheHit).toBe(true)
    expect(result.metadata?.mode).toBe('accurate')
    expect(result.metadata?.browserEngine).toBe('vercel-chromium')
    expect(result.screenshots?.[0]?.url).toContain('shot.png')
  })
})
