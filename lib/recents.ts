/**
 * Local recent domains for AppShell sidebar.
 */

const KEY = 'designcontracts:recents'
const MAX = 12

export type RecentDomain = {
  domain: string
  at: number
}

function canUseStorage(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

export function readRecents(): RecentDomain[] {
  if (!canUseStorage()) return []
  try {
    const raw = window.localStorage.getItem(KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as RecentDomain[]
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter((item) => item && typeof item.domain === 'string')
      .slice(0, MAX)
  } catch {
    return []
  }
}

export function pushRecent(domain: string): RecentDomain[] {
  const key = domain
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .split('/')[0]
  if (!key || !canUseStorage()) return readRecents()

  const next: RecentDomain[] = [
    { domain: key, at: Date.now() },
    ...readRecents().filter((item) => item.domain !== key),
  ].slice(0, MAX)

  try {
    window.localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    // ignore quota
  }
  return next
}
