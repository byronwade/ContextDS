import { cn } from '@/lib/utils'

type PageCanvasVariant = 'document' | 'settings' | 'operational' | 'action'

const INNER: Record<PageCanvasVariant, string> = {
  /** Document + rail — reading column ~760px */
  document: 'mx-auto max-w-[760px] px-4 py-8 sm:px-6 sm:py-10',
  /** Settings — 640px */
  settings: 'mx-auto max-w-[640px] px-4 py-8 sm:px-6 sm:py-10',
  /** Full operational canvas */
  operational: 'mx-auto w-full max-w-6xl px-3 py-4 sm:px-4 sm:py-5',
  /** Centered action / agent welcome — 712px */
  action: 'mx-auto max-w-[712px] px-4 py-10 sm:px-6',
}

/**
 * Scrollable main canvas for non-chat product pages inside AppShell.
 * Editorial Cream Workbench — see DESIGN.md.
 */
export function PageCanvas({
  children,
  className,
  innerClassName,
  variant = 'document',
}: {
  children: React.ReactNode
  className?: string
  /** Override inner max-width / padding */
  innerClassName?: string
  variant?: PageCanvasVariant
}) {
  return (
    <div className={cn('min-h-0 flex-1 overflow-y-auto', className)}>
      <div className={cn(INNER[variant], innerClassName)}>{children}</div>
    </div>
  )
}
