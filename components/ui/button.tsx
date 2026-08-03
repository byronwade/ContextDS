import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-1.5 whitespace-nowrap font-medium outline-none transition-[background-color,border-color,color] duration-120 ease-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ui-focus)] disabled:pointer-events-none disabled:opacity-50 aria-invalid:outline-destructive [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-3.5",
  {
    variants: {
      variant: {
        default:
          "bg-[var(--ui-accent)] text-[var(--ui-on-primary)] hover:bg-[var(--ui-accent-hover)]",
        destructive:
          "bg-[var(--ui-danger)] text-[var(--ui-on-primary)] hover:brightness-95",
        outline:
          "border border-[var(--ui-border-edge)] bg-[var(--ui-paper)] text-[var(--ui-ink)] hover:bg-[var(--ui-paper-hover)]",
        secondary:
          "border border-[var(--ui-border-edge)] bg-[var(--ui-paper)] text-[var(--ui-ink)] hover:bg-[var(--ui-paper-hover)]",
        ghost:
          "bg-transparent text-[var(--ui-ink-secondary)] hover:bg-[var(--ui-paper-hover)] hover:text-[var(--ui-ink)]",
        link: "bg-transparent text-[var(--ui-ink)] underline-offset-4 hover:underline",
        download:
          "bg-[var(--ui-ink)] text-[var(--ui-canvas)] hover:opacity-90",
      },
      size: {
        default: "h-10 min-h-10 rounded-[var(--radius-md)] px-[18px] text-sm",
        xs: "h-7 min-h-7 gap-1 rounded-[var(--radius-md)] px-2 text-xs [&_svg:not([class*='size-'])]:size-3",
        sm: "h-8 min-h-8 gap-1 rounded-[var(--radius-md)] px-3 text-xs",
        lg: "h-11 min-h-11 rounded-[var(--radius-md)] px-5 text-sm",
        icon: "size-10 min-h-10 rounded-[var(--radius-md)]",
        "icon-xs": "size-7 min-h-7 rounded-[var(--radius-md)] [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-8 min-h-8 rounded-[var(--radius-md)]",
        "icon-lg": "size-11 min-h-11 rounded-[var(--radius-md)]",
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
