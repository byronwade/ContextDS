import { afterEach, describe, expect, it } from 'vitest'
import { getScannerServiceUrl, isBrowserServiceConfigured } from '@/lib/scanner/browser-service'

describe('browser-service env helpers', () => {
  const previous = process.env.SCANNER_SERVICE_URL

  afterEach(() => {
    if (previous === undefined) delete process.env.SCANNER_SERVICE_URL
    else process.env.SCANNER_SERVICE_URL = previous
  })

  it('returns null when SCANNER_SERVICE_URL is unset', () => {
    delete process.env.SCANNER_SERVICE_URL
    expect(getScannerServiceUrl()).toBeNull()
    expect(isBrowserServiceConfigured()).toBe(false)
  })

  it('normalizes trailing slashes', () => {
    process.env.SCANNER_SERVICE_URL = 'http://localhost:4040/'
    expect(getScannerServiceUrl()).toBe('http://localhost:4040')
    expect(isBrowserServiceConfigured()).toBe(true)
  })
})
