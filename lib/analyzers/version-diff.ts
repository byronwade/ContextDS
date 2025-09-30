/**
 * Token Version Comparison Engine
 * Calculates diffs between design token sets for version tracking
 */

import type { W3CTokenSet } from './w3c-tokenizer'

export interface TokenDiff {
  added: TokenChange[]
  removed: TokenChange[]
  modified: TokenChange[]
  summary: {
    totalChanges: number
    addedCount: number
    removedCount: number
    modifiedCount: number
    categories: Record<string, CategoryChanges>
  }
}

export interface TokenChange {
  path: string // e.g., 'color.primary.500'
  category: string
  oldValue?: any
  newValue?: any
  changeType: 'added' | 'removed' | 'modified'
  displayOld?: string
  displayNew?: string
}

export interface CategoryChanges {
  added: number
  removed: number
  modified: number
  total: number
}

/**
 * Compare two token sets and generate a comprehensive diff
 */
export function compareTokenSets(
  oldTokens: W3CTokenSet,
  newTokens: W3CTokenSet
): TokenDiff {
  const changes: { added: TokenChange[]; removed: TokenChange[]; modified: TokenChange[] } = {
    added: [],
    removed: [],
    modified: []
  }

  const categoryStats: Record<string, CategoryChanges> = {}

  // Extract all token paths from both sets
  const oldPaths = new Set(extractAllTokenPaths(oldTokens))
  const newPaths = new Set(extractAllTokenPaths(newTokens))

  // Find added tokens (in new but not in old)
  for (const path of newPaths) {
    if (!oldPaths.has(path)) {
      const newValue = getTokenAtPath(newTokens, path)
      const category = getCategoryFromPath(path)

      changes.added.push({
        path,
        category,
        newValue,
        changeType: 'added',
        displayNew: formatTokenValue(newValue)
      })

      updateCategoryStats(categoryStats, category, 'added')
    }
  }

  // Find removed tokens (in old but not in new)
  for (const path of oldPaths) {
    if (!newPaths.has(path)) {
      const oldValue = getTokenAtPath(oldTokens, path)
      const category = getCategoryFromPath(path)

      changes.removed.push({
        path,
        category,
        oldValue,
        changeType: 'removed',
        displayOld: formatTokenValue(oldValue)
      })

      updateCategoryStats(categoryStats, category, 'removed')
    }
  }

  // Find modified tokens (value changed)
  for (const path of oldPaths) {
    if (newPaths.has(path)) {
      const oldValue = getTokenAtPath(oldTokens, path)
      const newValue = getTokenAtPath(newTokens, path)

      if (!areTokensEqual(oldValue, newValue)) {
        const category = getCategoryFromPath(path)

        changes.modified.push({
          path,
          category,
          oldValue,
          newValue,
          changeType: 'modified',
          displayOld: formatTokenValue(oldValue),
          displayNew: formatTokenValue(newValue)
        })

        updateCategoryStats(categoryStats, category, 'modified')
      }
    }
  }

  return {
    ...changes,
    summary: {
      totalChanges: changes.added.length + changes.removed.length + changes.modified.length,
      addedCount: changes.added.length,
      removedCount: changes.removed.length,
      modifiedCount: changes.modified.length,
      categories: categoryStats
    }
  }
}

/**
 * Extract all token paths from a token set
 */
function extractAllTokenPaths(tokens: W3CTokenSet, prefix = ''): string[] {
  const paths: string[] = []

  for (const [key, value] of Object.entries(tokens)) {
    // Skip metadata fields
    if (key.startsWith('$')) continue

    const currentPath = prefix ? `${prefix}.${key}` : key

    if (value && typeof value === 'object' && '$value' in value) {
      // This is a token
      paths.push(currentPath)
    } else if (value && typeof value === 'object') {
      // This is a nested group
      paths.push(...extractAllTokenPaths(value as any, currentPath))
    }
  }

  return paths
}

/**
 * Get token value at a specific path
 */
function getTokenAtPath(tokens: any, path: string): any {
  const parts = path.split('.')
  let current = tokens

  for (const part of parts) {
    if (!current || typeof current !== 'object') return undefined
    current = current[part]
  }

  return current?.$value ?? current
}

/**
 * Get category from token path
 */
function getCategoryFromPath(path: string): string {
  const parts = path.split('.')
  return parts[0] || 'unknown'
}

/**
 * Check if two token values are equal
 */
function areTokensEqual(oldVal: any, newVal: any): boolean {
  // Handle primitives
  if (oldVal === newVal) return true

  // Handle objects/arrays
  return JSON.stringify(oldVal) === JSON.stringify(newVal)
}

/**
 * Format token value for display
 */
function formatTokenValue(value: any): string {
  if (value === undefined || value === null) return '—'

  if (typeof value === 'string') return value
  if (typeof value === 'number') return value.toString()

  if (Array.isArray(value)) {
    return value.join(', ')
  }

  if (typeof value === 'object') {
    // Handle W3C color format
    if ('components' in value && Array.isArray(value.components)) {
      return `rgb(${value.components.join(', ')})`
    }

    return JSON.stringify(value)
  }

  return String(value)
}

/**
 * Update category statistics
 */
function updateCategoryStats(
  stats: Record<string, CategoryChanges>,
  category: string,
  changeType: 'added' | 'removed' | 'modified'
): void {
  if (!stats[category]) {
    stats[category] = { added: 0, removed: 0, modified: 0, total: 0 }
  }

  stats[category][changeType]++
  stats[category].total++
}

/**
 * Generate human-readable changelog from diff
 */
export function generateChangelog(diff: TokenDiff): string {
  const lines: string[] = []

  lines.push(`# Design Token Changes`)
  lines.push(``)
  lines.push(`**Total Changes**: ${diff.summary.totalChanges}`)
  lines.push(`- Added: ${diff.summary.addedCount}`)
  lines.push(`- Removed: ${diff.summary.removedCount}`)
  lines.push(`- Modified: ${diff.summary.modifiedCount}`)
  lines.push(``)

  // Group changes by category
  const categories = Object.keys(diff.summary.categories).sort()

  for (const category of categories) {
    const stats = diff.summary.categories[category]
    lines.push(`## ${category.charAt(0).toUpperCase() + category.slice(1)}`)
    lines.push(``)

    // Added
    const addedInCategory = diff.added.filter(c => c.category === category)
    if (addedInCategory.length > 0) {
      lines.push(`### Added (${addedInCategory.length})`)
      addedInCategory.forEach(change => {
        lines.push(`- \`${change.path}\`: ${change.displayNew}`)
      })
      lines.push(``)
    }

    // Removed
    const removedInCategory = diff.removed.filter(c => c.category === category)
    if (removedInCategory.length > 0) {
      lines.push(`### Removed (${removedInCategory.length})`)
      removedInCategory.forEach(change => {
        lines.push(`- \`${change.path}\`: ~~${change.displayOld}~~`)
      })
      lines.push(``)
    }

    // Modified
    const modifiedInCategory = diff.modified.filter(c => c.category === category)
    if (modifiedInCategory.length > 0) {
      lines.push(`### Modified (${modifiedInCategory.length})`)
      modifiedInCategory.forEach(change => {
        lines.push(`- \`${change.path}\`: ${change.displayOld} → ${change.displayNew}`)
      })
      lines.push(``)
    }
  }

  return lines.join('\n')
}

/**
 * Calculate similarity score between two token sets (0-100)
 */
export function calculateSimilarityScore(
  oldTokens: W3CTokenSet,
  newTokens: W3CTokenSet
): number {
  const oldPaths = new Set(extractAllTokenPaths(oldTokens))
  const newPaths = new Set(extractAllTokenPaths(newTokens))

  const totalUnique = new Set([...oldPaths, ...newPaths]).size
  const commonTokens = [...oldPaths].filter(p => newPaths.has(p)).length

  let matchingValues = 0
  for (const path of oldPaths) {
    if (newPaths.has(path)) {
      const oldVal = getTokenAtPath(oldTokens, path)
      const newVal = getTokenAtPath(newTokens, path)
      if (areTokensEqual(oldVal, newVal)) {
        matchingValues++
      }
    }
  }

  // Score based on both structure and value similarity
  const structureSimilarity = (commonTokens / totalUnique) * 50
  const valueSimilarity = (matchingValues / totalUnique) * 50

  return Math.round(structureSimilarity + valueSimilarity)
}