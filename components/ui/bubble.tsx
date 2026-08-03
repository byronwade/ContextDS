'use client'

/**
 * Bubble — conversational message surface (AI SDK Elements API, warm-paper skin).
 *
 * Composition:
 *   Bubble > BubbleContent (+ BubbleReactions)
 *   BubbleGroup > Bubble*
 */

import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const bubbleVariants = cva('flex w-fit max-w-[80%] flex-col', {
  variants: {
    variant: {
      /** Strong bubble for the current user — warm accent tint, not a loud fill. */
      default: '',
      secondary: '',
      muted: '',
      tinted: '',
      outline: '',
      /** Unframed content for assistant text and rich content — spans the row. */
      ghost: 'max-w-full',
      destructive: '',
    },
    align: {
      start: 'items-start self-start',
      end: 'items-end self-end',
    },
  },
  defaultVariants: {
    variant: 'default',
    align: 'start',
  },
})

const bubbleContentVariants = cva(
  'relative min-w-0 max-w-full whitespace-pre-wrap break-words rounded-[var(--radius-paper)] text-[15px] leading-relaxed outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ui-focus)]',
  {
    variants: {
      variant: {
        default:
          'border border-[var(--ui-border)] bg-[var(--ui-paper-subtle)] px-3.5 py-2.5 text-[var(--ui-ink)]',
        secondary:
          'border border-[var(--ui-border-soft)] bg-[var(--ui-paper)] px-3.5 py-2.5 text-[var(--ui-ink)]',
        muted: 'bg-[var(--ui-paper-subtle)] px-3.5 py-2 text-[var(--ui-ink-secondary)]',
        tinted:
          'bg-[var(--ui-accent-soft)] px-3.5 py-2 text-[var(--ui-ink)]',
        outline:
          'border border-[var(--ui-border)] bg-transparent px-3.5 py-2 text-[var(--ui-ink)]',
        ghost: 'whitespace-normal rounded-none p-0 text-[var(--ui-ink)]',
        destructive:
          'bg-[var(--ui-danger-soft)] px-3.5 py-2 text-[var(--ui-danger)]',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
)

type BubbleContextValue = VariantProps<typeof bubbleContentVariants>
const BubbleContext = React.createContext<BubbleContextValue>({})

export type BubbleProps = React.ComponentProps<'div'> &
  VariantProps<typeof bubbleVariants>

function Bubble({ className, variant, align, ...props }: BubbleProps) {
  return (
    <BubbleContext.Provider value={{ variant }}>
      <div
        data-slot="bubble"
        data-variant={variant ?? 'default'}
        data-align={align ?? 'start'}
        className={cn(bubbleVariants({ variant, align }), className)}
        {...props}
      />
    </BubbleContext.Provider>
  )
}

export type BubbleContentProps = React.ComponentProps<'div'> & {
  /** Render the content as a different element, e.g. render={<button />} or render={<a href/>}. */
  render?: React.ReactElement<Record<string, unknown>>
}

function BubbleContent({ className, render, children, ...props }: BubbleContentProps) {
  const { variant } = React.useContext(BubbleContext)
  const classes = cn(
    bubbleContentVariants({ variant }),
    render ? 'cursor-pointer transition-colors hover:bg-[var(--ui-paper-hover)]' : undefined,
    className
  )

  if (render) {
    return React.cloneElement(render, {
      'data-slot': 'bubble-content',
      className: cn(classes, (render.props as { className?: string }).className),
      children,
      ...props,
    })
  }

  return (
    <div data-slot="bubble-content" className={classes} {...props}>
      {children}
    </div>
  )
}

export type BubbleReactionsProps = React.ComponentProps<'div'> & {
  side?: 'top' | 'bottom'
  align?: 'start' | 'end'
}

function BubbleReactions({
  className,
  side = 'bottom',
  align = 'end',
  ...props
}: BubbleReactionsProps) {
  return (
    <div
      data-slot="bubble-reactions"
      className={cn(
        'z-10 flex items-center gap-0.5 rounded-full border border-[var(--ui-border)] bg-[var(--ui-paper)] px-1.5 py-0.5 text-[12px]',
        side === 'bottom' ? '-mt-2.5' : 'order-first -mb-2.5',
        align === 'end' ? 'self-end mr-2' : 'self-start ml-2',
        className
      )}
      {...props}
    />
  )
}

function BubbleGroup({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="bubble-group"
      className={cn('flex flex-col gap-1', className)}
      {...props}
    />
  )
}

export { Bubble, BubbleContent, BubbleGroup, BubbleReactions, bubbleVariants }
