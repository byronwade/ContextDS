'use client'

/**
 * Marker — inline conversation status, system note, bordered row, or labeled
 * separator (AI SDK Elements API, warm-paper skin).
 *
 * Composition:
 *   Marker > MarkerIcon? + MarkerContent
 */

import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const markerVariants = cva(
  'flex items-center gap-2 text-[13px] text-[var(--ui-ink-secondary)]',
  {
    variants: {
      variant: {
        default: 'py-0.5',
        border: 'border-b border-[var(--ui-border-soft)] pb-2 pt-0.5',
        separator:
          'justify-center gap-3 py-1 before:h-px before:flex-1 before:bg-[var(--ui-border)] after:h-px after:flex-1 after:bg-[var(--ui-border)]',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
)

export type MarkerProps = React.ComponentProps<'div'> &
  VariantProps<typeof markerVariants> & {
    /** Render as a different element, e.g. render={<a href/>} or render={<button />}. */
    render?: React.ReactElement<Record<string, unknown>>
  }

function Marker({ className, variant, render, children, ...props }: MarkerProps) {
  const classes = cn(
    markerVariants({ variant }),
    render
      ? 'cursor-pointer rounded-[8px] transition-colors hover:text-[var(--ui-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ui-focus)]'
      : undefined,
    className
  )

  if (render) {
    return React.cloneElement(render, {
      'data-slot': 'marker',
      'data-variant': variant ?? 'default',
      className: cn(classes, (render.props as { className?: string }).className),
      children,
      ...props,
    })
  }

  return (
    <div
      data-slot="marker"
      data-variant={variant ?? 'default'}
      className={classes}
      {...props}
    >
      {children}
    </div>
  )
}

function MarkerIcon({ className, ...props }: React.ComponentProps<'span'>) {
  return (
    <span
      data-slot="marker-icon"
      aria-hidden
      className={cn(
        'flex size-4 shrink-0 items-center justify-center text-[var(--ui-ink-muted)] [&_svg]:size-3.5',
        className
      )}
      {...props}
    />
  )
}

function MarkerContent({ className, ...props }: React.ComponentProps<'span'>) {
  return (
    <span
      data-slot="marker-content"
      className={cn('min-w-0 truncate font-medium', className)}
      {...props}
    />
  )
}

export { Marker, MarkerContent, MarkerIcon, markerVariants }
