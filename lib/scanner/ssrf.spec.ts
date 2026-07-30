import { describe, expect, it } from 'vitest'
import { assertPublicScanUrl, isPrivateIPv4 } from '@/lib/scanner/ssrf'

describe('assertPublicScanUrl', () => {
  it('allows public https URLs', () => {
    expect(assertPublicScanUrl('https://example.com').hostname).toBe('example.com')
  })

  it('blocks localhost and private IPs', () => {
    expect(() => assertPublicScanUrl('http://localhost')).toThrow(/local/i)
    expect(() => assertPublicScanUrl('http://127.0.0.1')).toThrow(/private|local/i)
    expect(() => assertPublicScanUrl('http://192.168.1.10')).toThrow(/private/i)
    expect(() => assertPublicScanUrl('http://169.254.169.254')).toThrow()
  })
})

describe('isPrivateIPv4', () => {
  it('detects RFC1918 ranges', () => {
    expect(isPrivateIPv4('10.0.0.1')).toBe(true)
    expect(isPrivateIPv4('8.8.8.8')).toBe(false)
  })
})
