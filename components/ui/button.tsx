import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-1.5 whitespace-nowrap font-medium outline-none transition-[background-color,box-shadow,transform] duration-120 ease-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ui-focus)] disabled:pointer-events-none disabled:opacity-50 aria-invalid:outline-destructive [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-3.5 active:translate-y-px",
  {
    variants: {
      variant: {
        default:
          "bg-[var(--ui-accent)] text-[var(--ui-paper)] shadow-[var(--shadow-control-primary)] hover:bg-[var(--ui-accent-hover)]",
        destructive:
          "bg-[var(--ui-danger)] text-[var(--ui-paper)] shadow-[var(--shadow-control-primary)] hover:brightness-95",
        outline:
          "bg-[var(--ui-paper)] text-[var(--ui-ink)] shadow-[var(--shadow-control)] hover:bg-[var(--ui-paper-hover)] hover:shadow-[var(--shadow-control-hover)]",
        secondary:
          "bg-[var(--ui-paper-subtle)] text-[var(--ui-ink)] shadow-[var(--shadow-control)] hover:bg-[var(--ui-paper-hover)]",
        ghost:
          "bg-transparent text-[var(--ui-ink-secondary)] shadow-none hover:bg-[var(--ui-paper-hover)] hover:text-[var(--ui-ink)] active:translate-y-0",
        link: "bg-transparent text-[var(--ui-accent)] shadow-none underline-offset-4 hover:underline active:translate-y-0",
      },
      size: {
        default: "h-8 min-h-8 rounded-[7px] px-2.5 text-[13px]",
        xs: "h-7 min-h-7 gap-1 rounded-[7px] px-2 text-xs [&_svg:not([class*='size-'])]:size-3",
        sm: "h-7 min-h-7 gap-1 rounded-[7px] px-2 text-xs",
        lg: "h-9 min-h-9 rounded-[7px] px-3.5 text-sm",
        icon: "size-8 min-h-8 rounded-[7px]",
        "icon-xs": "size-7 min-h-7 rounded-[7px] [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-7 min-h-7 rounded-[7px]",
        "icon-lg": "size-9 min-h-9 rounded-[7px]",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
