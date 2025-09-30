"use client"

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRecentScans } from '@/stores/recent-scans-store'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Clock, ChevronDown, Trash2, ExternalLink } from 'lucide-react'
import { cn } from '@/lib/utils'

export function RecentScansDropdown() {
  const { scans, removeScan, clearScans, getRecentScans } = useRecentScans()
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const recentScans = getRecentScans(10)

  useEffect(() => {
    setMounted(true)
  }, [])

  const formatTime = (timestamp: number) => {
    if (!mounted) return ''

    const now = Date.now()
    const diff = now - timestamp
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 1) return 'Just now'
    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    return `${days}d ago`
  }

  if (recentScans.length === 0 || !mounted) {
    return null
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-3 text-xs font-medium text-grep-9 hover:text-foreground gap-1"
        >
          <Clock className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Recent</span>
          <ChevronDown className="h-3 w-3 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[320px] font-mono text-[13px]">
        <DropdownMenuLabel className="text-xs text-grep-9 uppercase tracking-wide font-semibold">
          Recent Scans
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        <div className="max-h-[400px] overflow-y-auto">
          {recentScans.map((scan) => (
            <DropdownMenuItem key={scan.id} asChild className="cursor-pointer">
              <Link
                href={scan.url}
                className="flex items-start justify-between gap-3 px-3 py-2 hover:bg-grep-1"
                onClick={() => setOpen(false)}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500 shrink-0" />
                    <code className="text-xs text-foreground truncate">{scan.domain}</code>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-[10px] text-grep-9">
                    <span>{scan.tokensExtracted} tokens</span>
                    <span>·</span>
                    <span>{scan.confidence}% conf.</span>
                    <span>·</span>
                    <span suppressHydrationWarning>{formatTime(scan.scannedAt)}</span>
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    removeScan(scan.id)
                  }}
                  className="shrink-0 p-1 hover:bg-grep-2 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Remove from recent scans"
                >
                  <Trash2 className="h-3 w-3 text-grep-9" />
                </button>
              </Link>
            </DropdownMenuItem>
          ))}
        </div>

        {recentScans.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <button
                onClick={() => clearScans()}
                className="w-full text-xs text-grep-9 hover:text-red-600 dark:hover:text-red-400 cursor-pointer"
              >
                Clear all recent scans
              </button>
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}