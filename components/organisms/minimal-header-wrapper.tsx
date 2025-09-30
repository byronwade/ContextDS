'use client'

import { useState } from 'react'
import { MinimalHeader } from './minimal-header'
import { useStatsStore } from '@/stores/stats-store'

/**
 * MinimalHeaderWrapper - Client Component
 *
 * Wraps MinimalHeader to provide client-side state management.
 * Keeps the header interactive while main content streams.
 */
export function MinimalHeaderWrapper() {
  const [viewMode, setViewMode] = useState<'search' | 'scan'>('search')
  const [query, setQuery] = useState('')
  const { stats } = useStatsStore()

  return (
    <MinimalHeader
      viewMode={viewMode}
      setViewMode={setViewMode}
      query={query}
      setQuery={setQuery}
      caseInsensitive={false}
      setCaseInsensitive={() => {}}
      wholeWords={false}
      setWholeWords={() => {}}
      useRegex={false}
      setUseRegex={() => {}}
      scanLoading={false}
      onScan={() => {}}
      onClearResults={() => {}}
      stats={stats}
    />
  )
}