import { cn } from '@/lib/utils'

/**
 * Scrollable main canvas for non-chat product pages inside AppShell.
 * See DESIGN.md.
 */
export function PageCanvas({
  children,
  className,
  innerClassName,
}: {
  children: React.ReactNode
  className?: string
  /** Override inner max-width / padding */
  innerClassName?: string
}) {
  return (
    <div className={cn('min-h-0 flex-1 overflow-y-auto', className)}>
      <div
        className={cn(
          'mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-12',
          innerClassName
        )}
      >
        {children}
      </div>
    </div>
  )
}
