"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ChevronDown, GitBranch, Clock, History } from 'lucide-react'
import { cn } from '@/lib/utils'

interface TokenVersion {
  id: string
  versionNumber: number
  createdAt: string
  tokenCount: number
  changeCount?: number
  isCurrent: boolean
}

interface VersionSelectorProps {
  domain: string
  versions: TokenVersion[]
  selectedVersion: string
  onVersionSelect: (versionId: string) => void
  onCompare: (v1: string, v2: string) => void
}

export function VersionSelector({
  domain,
  versions,
  selectedVersion,
  onVersionSelect,
  onCompare
}: VersionSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [compareMode, setCompareMode] = useState(false)
  const [compareWith, setCompareWith] = useState<string | null>(null)

  const selected = versions.find(v => v.id === selectedVersion)

  return (
    <div className="relative">
      {/* Selector Button - Grep Style */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="h-9 px-3 rounded-md border border-grep-4 bg-grep-0 hover:bg-grep-1 hover:border-grep-5 transition-colors flex items-center gap-2 font-mono text-[13px]"
      >
        <GitBranch className="h-3.5 w-3.5 text-grep-9" />
        <span className="text-foreground">
          v{selected?.versionNumber || 1}
        </span>
        <span className="text-grep-7">·</span>
        <span className="text-grep-9 text-xs">
          {selected?.tokenCount || 0} tokens
        </span>
        <ChevronDown className={cn(
          "h-3.5 w-3.5 text-grep-9 transition-transform",
          isOpen && "rotate-180"
        )} />
      </button>

      {/* Dropdown - Grep Style */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown Content */}
          <div className="absolute top-full left-0 mt-2 w-[420px] z-50 rounded-md border border-grep-2 bg-grep-0 shadow-lg overflow-hidden">
            {/* Header */}
            <div className="px-4 py-2.5 border-b border-grep-2 bg-background">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-semibold uppercase tracking-wide text-grep-9">
                  Version History
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setCompareMode(!compareMode)}
                  className="h-6 px-2 text-xs font-mono text-grep-9 hover:text-foreground"
                >
                  {compareMode ? 'Cancel' : 'Compare'}
                </Button>
              </div>
            </div>

            {/* Version List */}
            <div className="max-h-[400px] overflow-y-auto divide-y divide-grep-2">
              {versions.map((version) => (
                <button
                  key={version.id}
                  onClick={() => {
                    if (compareMode) {
                      if (!compareWith) {
                        setCompareWith(version.id)
                      } else {
                        onCompare(compareWith, version.id)
                        setCompareMode(false)
                        setCompareWith(null)
                        setIsOpen(false)
                      }
                    } else {
                      onVersionSelect(version.id)
                      setIsOpen(false)
                    }
                  }}
                  className={cn(
                    "w-full px-4 py-3 text-left hover:bg-background transition-colors font-mono text-[13px]",
                    version.id === selectedVersion && !compareMode && "bg-background",
                    compareWith === version.id && "bg-blue-50 dark:bg-blue-950/20"
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={cn(
                          "font-semibold",
                          version.isCurrent ? "text-emerald-600 dark:text-emerald-400" : "text-foreground"
                        )}>
                          v{version.versionNumber}
                        </span>
                        {version.isCurrent && (
                          <Badge variant="secondary" className="h-4 px-1.5 text-[9px] font-mono">
                            current
                          </Badge>
                        )}
                        {compareWith === version.id && (
                          <Badge className="h-4 px-1.5 text-[9px] font-mono">
                            selected
                          </Badge>
                        )}
                      </div>

                      <div className="flex items-center gap-3 text-xs text-grep-9">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatTimestamp(version.createdAt)}
                        </span>
                        <span>·</span>
                        <span>{version.tokenCount} tokens</span>
                        {version.changeCount !== undefined && version.changeCount > 0 && (
                          <>
                            <span>·</span>
                            <span className="text-blue-600 dark:text-blue-400">
                              {version.changeCount} changes
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    {compareMode && (
                      <div className="text-xs text-grep-7">
                        {compareWith === version.id ? 'base' : 'click to compare'}
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>

            {/* Footer */}
            <div className="px-4 py-2.5 border-t border-grep-2 bg-background text-center">
              <span className="text-xs text-grep-9 font-mono">
                {versions.length} versions tracked
              </span>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function formatTimestamp(iso: string): string {
  const date = new Date(iso)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) {
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    if (diffHours === 0) {
      const diffMins = Math.floor(diffMs / (1000 * 60))
      return `${diffMins}m ago`
    }
    return `${diffHours}h ago`
  }

  if (diffDays < 7) return `${diffDays}d ago`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}