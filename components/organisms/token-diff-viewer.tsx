"use client"

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Plus, Minus, Pencil, ChevronDown, Download, Copy } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useState } from 'react'
import type { TokenDiff, TokenChange } from '@/lib/analyzers/version-diff'

interface TokenDiffViewerProps {
  diff: TokenDiff
  oldVersion: number
  newVersion: number
  domain: string
  onCopy?: (content: string) => void
  onExport?: () => void
}

export function TokenDiffViewer({
  diff,
  oldVersion,
  newVersion,
  domain,
  onCopy,
  onExport
}: TokenDiffViewerProps) {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(Object.keys(diff.summary.categories))
  )
  const [selectedChangeTypes, setSelectedChangeTypes] = useState<Set<string>>(
    new Set(['added', 'removed', 'modified'])
  )

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev)
      if (next.has(category)) next.delete(category)
      else next.add(category)
      return next
    })
  }

  const toggleChangeType = (type: string) => {
    setSelectedChangeTypes(prev => {
      const next = new Set(prev)
      if (next.has(type)) next.delete(type)
      else next.add(type)
      return next
    })
  }

  const categories = Object.keys(diff.summary.categories).sort()

  return (
    <div className="space-y-4">

      {/* Header - Grep Style */}
      <div className="rounded-md border border-grep-2 bg-grep-0 overflow-hidden">
        <div className="px-4 py-3 bg-background border-b border-grep-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h2 className="text-base font-mono font-semibold text-foreground">
                {domain}
              </h2>
              <span className="text-grep-7">·</span>
              <div className="flex items-center gap-2 font-mono text-xs text-grep-9">
                <Badge variant="outline" className="h-5 font-mono text-[10px]">
                  v{oldVersion}
                </Badge>
                <span>→</span>
                <Badge variant="default" className="h-5 font-mono text-[10px]">
                  v{newVersion}
                </Badge>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {onCopy && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onCopy(JSON.stringify(diff, null, 2))}
                  className="h-7 px-2 text-xs font-mono text-grep-9 hover:text-foreground"
                >
                  <Copy className="h-3.5 w-3.5 mr-1" />
                  copy
                </Button>
              )}
              {onExport && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onExport}
                  className="h-7 px-2 text-xs font-mono text-grep-9 hover:text-foreground"
                >
                  <Download className="h-3.5 w-3.5 mr-1" />
                  export
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-3 divide-x divide-grep-2 font-mono text-[13px]">
          <div className="px-4 py-3 flex items-center justify-between">
            <span className="text-grep-9">Added</span>
            <span className="text-green-600 dark:text-green-400 font-semibold tabular-nums">
              +{diff.summary.addedCount}
            </span>
          </div>
          <div className="px-4 py-3 flex items-center justify-between">
            <span className="text-grep-9">Removed</span>
            <span className="text-red-600 dark:text-red-400 font-semibold tabular-nums">
              -{diff.summary.removedCount}
            </span>
          </div>
          <div className="px-4 py-3 flex items-center justify-between">
            <span className="text-grep-9">Modified</span>
            <span className="text-blue-600 dark:text-blue-400 font-semibold tabular-nums">
              ~{diff.summary.modifiedCount}
            </span>
          </div>
        </div>
      </div>

      {/* Filter Toggles - Grep Style */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-grep-9 font-mono mr-2">Filter:</span>
        <button
          onClick={() => toggleChangeType('added')}
          className={cn(
            "h-6 px-2.5 rounded text-xs font-mono transition-colors border",
            selectedChangeTypes.has('added')
              ? "bg-green-50 dark:bg-green-950/20 border-green-300 dark:border-green-900 text-green-700 dark:text-green-400"
              : "bg-grep-0 border-grep-3 text-grep-9 hover:border-grep-4"
          )}
        >
          + Added ({diff.summary.addedCount})
        </button>
        <button
          onClick={() => toggleChangeType('removed')}
          className={cn(
            "h-6 px-2.5 rounded text-xs font-mono transition-colors border",
            selectedChangeTypes.has('removed')
              ? "bg-red-50 dark:bg-red-950/20 border-red-300 dark:border-red-900 text-red-700 dark:text-red-400"
              : "bg-grep-0 border-grep-3 text-grep-9 hover:border-grep-4"
          )}
        >
          - Removed ({diff.summary.removedCount})
        </button>
        <button
          onClick={() => toggleChangeType('modified')}
          className={cn(
            "h-6 px-2.5 rounded text-xs font-mono transition-colors border",
            selectedChangeTypes.has('modified')
              ? "bg-blue-50 dark:bg-blue-950/20 border-blue-300 dark:border-blue-900 text-blue-700 dark:text-blue-400"
              : "bg-grep-0 border-grep-3 text-grep-9 hover:border-grep-4"
          )}
        >
          ~ Modified ({diff.summary.modifiedCount})
        </button>
      </div>

      {/* Changes by Category - Grep Style */}
      <div className="space-y-3">
        {categories.map(category => {
          const categoryChanges = diff.summary.categories[category]
          const isExpanded = expandedCategories.has(category)

          // Filter changes by selected types
          const filteredAdded = selectedChangeTypes.has('added') ? diff.added.filter(c => c.category === category) : []
          const filteredRemoved = selectedChangeTypes.has('removed') ? diff.removed.filter(c => c.category === category) : []
          const filteredModified = selectedChangeTypes.has('modified') ? diff.modified.filter(c => c.category === category) : []

          const hasVisibleChanges = filteredAdded.length + filteredRemoved.length + filteredModified.length > 0

          if (!hasVisibleChanges) return null

          return (
            <div key={category} className="rounded-md border border-grep-2 bg-grep-0 overflow-hidden">
              {/* Category Header */}
              <button
                onClick={() => toggleCategory(category)}
                className="w-full px-4 py-2.5 bg-background hover:bg-grep-1 transition-colors flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <ChevronDown className={cn(
                    "h-4 w-4 text-grep-9 transition-transform",
                    !isExpanded && "-rotate-90"
                  )} />
                  <span className="text-xs font-mono font-semibold uppercase tracking-wide text-foreground">
                    {category}
                  </span>
                  <Badge variant="secondary" className="h-5 font-mono text-[10px]">
                    {categoryChanges.total} changes
                  </Badge>
                </div>

                <div className="flex items-center gap-2 text-xs font-mono">
                  {categoryChanges.added > 0 && (
                    <span className="text-green-600 dark:text-green-400">+{categoryChanges.added}</span>
                  )}
                  {categoryChanges.removed > 0 && (
                    <span className="text-red-600 dark:text-red-400">-{categoryChanges.removed}</span>
                  )}
                  {categoryChanges.modified > 0 && (
                    <span className="text-blue-600 dark:text-blue-400">~{categoryChanges.modified}</span>
                  )}
                </div>
              </button>

              {/* Changes List */}
              {isExpanded && (
                <div className="divide-y divide-grep-2 font-mono text-[13px]">
                  {/* Added Tokens */}
                  {filteredAdded.map(change => (
                    <TokenChangeRow
                      key={`added-${change.path}`}
                      change={change}
                      onCopy={onCopy}
                    />
                  ))}

                  {/* Removed Tokens */}
                  {filteredRemoved.map(change => (
                    <TokenChangeRow
                      key={`removed-${change.path}`}
                      change={change}
                      onCopy={onCopy}
                    />
                  ))}

                  {/* Modified Tokens */}
                  {filteredModified.map(change => (
                    <TokenChangeRow
                      key={`modified-${change.path}`}
                      change={change}
                      onCopy={onCopy}
                    />
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function TokenChangeRow({ change, onCopy }: { change: TokenChange; onCopy?: (content: string) => void }) {
  const [isHovered, setIsHovered] = useState(false)

  return (
    <div
      className={cn(
        "px-4 py-3 transition-colors hover:bg-background group",
        change.changeType === 'added' && "bg-green-50/30 dark:bg-green-950/10 border-l-2 border-green-500",
        change.changeType === 'removed' && "bg-red-50/30 dark:bg-red-950/10 border-l-2 border-red-500",
        change.changeType === 'modified' && "bg-blue-50/30 dark:bg-blue-950/10 border-l-2 border-blue-500"
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className="mt-0.5">
          {change.changeType === 'added' && <Plus className="h-4 w-4 text-green-600 dark:text-green-400" />}
          {change.changeType === 'removed' && <Minus className="h-4 w-4 text-red-600 dark:text-red-400" />}
          {change.changeType === 'modified' && <Pencil className="h-4 w-4 text-blue-600 dark:text-blue-400" />}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <code className="text-sm text-foreground block truncate">
            {change.path}
          </code>

          {/* Values */}
          {change.changeType === 'added' && (
            <div className="mt-1 text-xs">
              <span className="text-green-700 dark:text-green-300 font-medium">
                {change.displayNew}
              </span>
            </div>
          )}

          {change.changeType === 'removed' && (
            <div className="mt-1 text-xs">
              <span className="text-red-700 dark:text-red-300 line-through">
                {change.displayOld}
              </span>
            </div>
          )}

          {change.changeType === 'modified' && (
            <div className="mt-1 flex items-center gap-2 text-xs">
              <span className="text-red-700 dark:text-red-300 line-through">
                {change.displayOld}
              </span>
              <span className="text-grep-7">→</span>
              <span className="text-green-700 dark:text-green-300">
                {change.displayNew}
              </span>
            </div>
          )}
        </div>

        {/* Copy Button */}
        {onCopy && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onCopy(change.changeType === 'modified' ? change.displayNew! : change.displayNew || change.displayOld || '')}
            className={cn(
              "h-6 w-6 p-0 transition-opacity",
              isHovered ? "opacity-100" : "opacity-0"
            )}
          >
            <Copy className="h-3 w-3" />
          </Button>
        )}
      </div>
    </div>
  )
}