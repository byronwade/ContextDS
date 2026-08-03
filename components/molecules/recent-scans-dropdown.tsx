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
import { ClockIcon as Clock, CaretDownIcon as ChevronDown, TrashIcon as Trash2, ArrowSquareOutIcon as ExternalLink } from '@/lib/phosphor'
import { cn } from '@/lib/utils'

export function RecentScansDropdown() {
  const { scans, removeScan, clearScans, getRecentScans } = useRecentScans()
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const recentScans = getRecentScans(10)

  useEffect(() => {
    setMounted(true)
  }, [])

  const [now, setNow] = useState(0)

  useEffect(() => {
    setNow(Date.now())
    const id = window.setInterval(() => setNow(Date.now()), 60_000)
    return () => window.clearInterval(id)
  }, [])

  const formatTime = (timestamp: number) => {
    if (!mounted || !now) return ''

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
            <DropdownMenuItem
              key={scan.id}
              className="group cursor-default focus:bg-transparent"
              onSelect={(event) => event.preventDefault()}
            >
              <div className="flex w-full items-start justify-between gap-3 px-1 py-1">
                <Link
                  prefetch={false}
                  href={scan.url}
                  className="min-w-0 flex-1 rounded px-2 py-1 hover:bg-grep-1"
                  onClick={() => setOpen(false)}
                >
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 shrink-0 rounded-full bg-green-500" />
                    <code className="truncate text-xs text-foreground">{scan.domain}</code>
                  </div>
                  <div className="mt-1 flex items-center gap-3 text-[10px] text-grep-9">
                    <span>{scan.tokensExtracted} tokens</span>
                    <span>·</span>
                    <span>{scan.confidence}% conf.</span>
                    <span>·</span>
                    <span suppressHydrationWarning>{formatTime(scan.scannedAt)}</span>
                  </div>
                </Link>
                <button
                  type="button"
                  onClick={() => removeScan(scan.id)}
                  className="shrink-0 rounded p-1 opacity-0 transition-opacity hover:bg-grep-2 group-hover:opacity-100"
                  title="Remove from recent scans"
                  aria-label={`Remove ${scan.domain} from recent scans`}
                >
                  <Trash2 className="h-3 w-3 text-grep-9" />
                </button>
              </div>
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