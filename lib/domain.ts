/**
 * Shared domain / URL normalization for scan, MCP, and storage lookups.
 */

export function normalizeDomain(input: string): string {
  const raw = input.trim().toLowerCase()
  if (!raw) return ''

  try {
    const withProtocol = raw.startsWith('http://') || raw.startsWith('https://') ? raw : `https://${raw}`
    const hostname = new URL(withProtocol).hostname
    return hostname.replace(/^www\./, '')
  } catch {
    return raw
      .replace(/^https?:\/\//, '')
      .replace(/^www\./, '')
      .split('/')[0]
      .split('?')[0]
      .split('#')[0]
  }
}

export function ensureAbsoluteUrl(url: string): string {
  const trimmed = url.trim()
  if (!trimmed) return trimmed
  return trimmed.startsWith('http://') || trimmed.startsWith('https://')
    ? trimmed
    : `https://${trimmed}`
}

export function contractDownloadPath(domain: string): string {
  return `/api/contracts/download?domain=${encodeURIComponent(normalizeDomain(domain))}`
}
