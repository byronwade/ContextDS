/**
 * Lightweight SSRF guards for the Playwright scanner microservice
 * and any server-side URL fetch that must stay on the public internet.
 */

export function isPrivateIPv4(ip: string): boolean {
  const parts = ip.split('.').map(Number)
  if (parts.length !== 4 || parts.some((p) => Number.isNaN(p) || p < 0 || p > 255)) {
    return true
  }

  return (
    parts[0] === 10 ||
    parts[0] === 127 ||
    (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) ||
    (parts[0] === 192 && parts[1] === 168) ||
    parts[0] === 0 ||
    (parts[0] === 169 && parts[1] === 254) ||
    parts[0] === 255
  )
}

export function isPrivateIPv6(ip: string): boolean {
  const lower = ip.toLowerCase()
  return (
    lower === '::1' ||
    lower.startsWith('::1') ||
    lower.startsWith('fe80:') ||
    lower.startsWith('fc00:') ||
    lower.startsWith('fd00:')
  )
}

export function assertPublicScanUrl(rawUrl: string): URL {
  let url: URL
  try {
    url = new URL(rawUrl)
  } catch {
    throw new Error('Invalid URL')
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error('Only http(s) URLs are allowed')
  }

  const hostname = url.hostname.toLowerCase()
  const port = url.port || (url.protocol === 'https:' ? '443' : '80')
  const allowedPorts = new Set(['80', '443', '8080'])

  if (!allowedPorts.has(port)) {
    throw new Error('Only ports 80, 443, and 8080 are allowed')
  }

  if (
    hostname === 'localhost' ||
    hostname.endsWith('.localhost') ||
    hostname.endsWith('.local') ||
    hostname.endsWith('.internal') ||
    hostname === 'metadata.google.internal' ||
    hostname === 'metadata.azure.com' ||
    hostname === '169.254.169.254'
  ) {
    throw new Error('Cannot scan local or metadata hosts')
  }

  const ipv4 = /^\d{1,3}(?:\.\d{1,3}){3}$/.test(hostname)
  if (ipv4 && isPrivateIPv4(hostname)) {
    throw new Error('Cannot scan private IP addresses')
  }

  if (hostname.includes(':') && isPrivateIPv6(hostname)) {
    throw new Error('Cannot scan private IPv6 addresses')
  }

  return url
}
