import { describe, expect, it } from 'vitest'
import { contractDownloadPath, ensureAbsoluteUrl, normalizeDomain } from '@/lib/domain'

describe('normalizeDomain', () => {
  it('strips protocol, www, and path', () => {
    expect(normalizeDomain('https://www.Example.com/path?q=1')).toBe('example.com')
    expect(normalizeDomain('example.com')).toBe('example.com')
    expect(normalizeDomain('WWW.stripe.com')).toBe('stripe.com')
  })
})

describe('ensureAbsoluteUrl', () => {
  it('adds https when missing', () => {
    expect(ensureAbsoluteUrl('example.com')).toBe('https://example.com')
    expect(ensureAbsoluteUrl('https://example.com')).toBe('https://example.com')
  })
})

describe('contractDownloadPath', () => {
  it('builds a download URL for the normalized domain', () => {
    expect(contractDownloadPath('https://www.example.com')).toBe(
      '/api/contracts/download?domain=example.com'
    )
  })
})
