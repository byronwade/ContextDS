import { describe, expect, it } from 'vitest'
import { asScanWidgetPayload, isScanResultToolName } from './scan-result-widget'

describe('scan-result-widget helpers', () => {
  it('recognizes scan tools', () => {
    expect(isScanResultToolName('scan_site')).toBe(true)
    expect(isScanResultToolName('get_tokens')).toBe(true)
    expect(isScanResultToolName('resolve_graph')).toBe(false)
  })

  it('accepts tool payloads with a domain', () => {
    expect(asScanWidgetPayload({ domain: 'stripe.com', status: 'fresh' })).toEqual({
      domain: 'stripe.com',
      status: 'fresh',
    })
  })

  it('rejects empty outputs', () => {
    expect(asScanWidgetPayload(null)).toBeNull()
    expect(asScanWidgetPayload({})).toBeNull()
  })
})
