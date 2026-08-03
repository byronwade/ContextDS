import Link from 'next/link'
import { AppShell } from '@/components/organisms/app-shell'
import { Button } from '@/components/ui/button'

export default function NotFound() {
  return (
    <AppShell currentPage="chat">
      <div className="flex min-h-0 flex-1 items-center justify-center px-6 py-16">
        <div className="max-w-md text-center">
          <p className="font-mono text-[12px] uppercase tracking-[0.14em] text-[var(--ui-ink-muted)]">
            404
          </p>
          <h1 className="mt-3 font-serif text-3xl tracking-tight text-[var(--ui-ink)]">
            Page not found
          </h1>
          <p className="mt-3 text-[15px] leading-relaxed text-[var(--ui-ink-secondary)]">
            That route is not in the workbench. Head back to chat or browse the library.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
            <Button asChild>
              <Link prefetch={false} href="/">
                Open chat
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link prefetch={false} href="/community">
                Browse library
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </AppShell>
  )
}
