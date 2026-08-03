'use client'

import {
  BookOpenIcon,
  BooksIcon,
  ChatCircleIcon,
  PenNibIcon,
  PlugsIcon,
  PlusIcon,
} from '@phosphor-icons/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command'

const NAV_ITEMS = [
  { href: '/', label: 'Chat', icon: ChatCircleIcon },
  { href: '/create', label: 'Create', icon: PlusIcon },
  { href: '/community', label: 'Library', icon: BooksIcon },
  { href: '/studio', label: 'Studio', icon: PenNibIcon },
  { href: '/mcp', label: 'MCP', icon: PlugsIcon },
  { href: '/docs', label: 'Docs', icon: BookOpenIcon },
] as const

const MORE_ITEMS = [
  { href: '/features', label: 'Features' },
  { href: '/pricing', label: 'Pricing' },
  { href: '/about', label: 'About' },
  { href: '/metrics', label: 'Metrics' },
] as const

/**
 * App-level Cmd/Ctrl+K command menu — mounted from the root providers shell.
 */
export function CommandMenu() {
  const router = useRouter()
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() !== 'k') return
      if (!(event.metaKey || event.ctrlKey)) return
      event.preventDefault()
      setOpen((prev) => !prev)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  const go = (href: string) => {
    setOpen(false)
    router.push(href)
  }

  return (
    <CommandDialog open={open} onOpenChange={setOpen} title="Command menu" description="Jump to a page or action">
      <CommandInput placeholder="Search pages…" />
      <CommandList>
        <CommandEmpty>No matching pages.</CommandEmpty>
        <CommandGroup heading="Primary">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon
            return (
              <CommandItem key={item.href} value={item.label} onSelect={() => go(item.href)}>
                <Icon className="size-4" weight="duotone" />
                <span>{item.label}</span>
              </CommandItem>
            )
          })}
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="More">
          {MORE_ITEMS.map((item) => (
            <CommandItem key={item.href} value={item.label} onSelect={() => go(item.href)}>
              <span>{item.label}</span>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  )
}
