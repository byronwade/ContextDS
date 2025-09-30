/**
 * Expandable Token Section Component
 * Shows top N tokens initially with "Show All" button to expand
 */

'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ExpandableTokenSectionProps {
  title: string
  totalCount: number
  initialShow?: number
  onCopyAll?: () => void
  children: (props: {
    visibleTokens: any[]
    isExpanded: boolean
    isImportant: (index: number) => boolean
  }) => React.ReactNode
  tokens: any[]
}

export function ExpandableTokenSection({
  title,
  totalCount,
  initialShow = 8,
  onCopyAll,
  children,
  tokens
}: ExpandableTokenSectionProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const visibleTokens = isExpanded ? tokens : tokens.slice(0, initialShow)
  const hasMore = tokens.length > initialShow
  const remainingCount = tokens.length - initialShow

  return (
    <div className="rounded-md border border-grep-2 bg-grep-0 font-mono text-[13px] overflow-hidden">
      {/* Header */}
      <div className="px-4 py-2.5 border-b border-grep-2 bg-background flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-grep-9 text-xs uppercase tracking-wide font-semibold">
            {title} ({totalCount})
          </span>
          {hasMore && (
            <span className="text-[10px] text-grep-9 bg-grep-1 px-2 py-0.5 rounded-full">
              {isExpanded ? 'showing all' : `top ${initialShow}`}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {hasMore && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="h-6 px-2 text-xs text-grep-9 hover:text-foreground flex items-center gap-1"
            >
              {isExpanded ? (
                <>
                  <ChevronUp className="h-3 w-3" />
                  show less
                </>
              ) : (
                <>
                  <ChevronDown className="h-3 w-3" />
                  show {remainingCount} more
                </>
              )}
            </Button>
          )}
          {onCopyAll && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onCopyAll}
              className="h-6 px-2 text-xs text-grep-9 hover:text-foreground"
            >
              copy
            </Button>
          )}
        </div>
      </div>

      {/* Content */}
      {children({
        visibleTokens,
        isExpanded,
        isImportant: (index: number) => index < initialShow
      })}
    </div>
  )
}

/**
 * Importance Badge - Visual indicator for token importance
 */
export function ImportanceBadge({ rank }: { rank: number }) {
  if (rank === 0) {
    return (
      <div className="absolute top-1 right-1 px-1.5 py-0.5 rounded bg-blue-500 text-white text-[9px] font-bold">
        #1
      </div>
    )
  }

  if (rank < 3) {
    return (
      <div className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-blue-500" title={`Rank #${rank + 1}`} />
    )
  }

  return null
}