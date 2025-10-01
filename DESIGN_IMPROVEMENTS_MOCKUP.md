# ContextDS Design Improvements - Visual Mockups

## Critical Accessibility Improvements

### 1. Enhanced Button Component with Accessibility

**Current Implementation Issues:**
- Missing loading states with ARIA attributes
- Insufficient color contrast for secondary variants
- No reduced motion support

**Improved Button Component:**

```typescript
// components/ui/button.tsx - Enhanced version
import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-all duration-200 disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm hover:shadow-md",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
        // NEW: Enhanced semantic variants
        success: "bg-success text-success-foreground hover:bg-success/90 shadow-sm hover:shadow-md",
        warning: "bg-warning text-warning-foreground hover:bg-warning/90 shadow-sm hover:shadow-md",
        loading: "bg-muted text-muted-foreground cursor-not-allowed",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
  loading?: boolean
  loadingText?: string
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({
    className,
    variant,
    size,
    asChild = false,
    loading = false,
    loadingText,
    children,
    disabled,
    ...props
  }, ref) => {
    const Comp = asChild ? Slot : "button"

    const isDisabled = disabled || loading
    const buttonVariant = loading ? "loading" : variant

    return (
      <Comp
        className={cn(buttonVariants({ variant: buttonVariant, size, className }))}
        ref={ref}
        disabled={isDisabled}
        aria-disabled={isDisabled}
        aria-busy={loading}
        {...props}
      >
        {loading && (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
            <span className="sr-only">{loadingText || "Loading..."}</span>
          </>
        )}
        {!loading && children}
      </Comp>
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
```

### 2. Accessible Status Indicators

**Current Issue:** Color-only status indicators fail WCAG 1.4.1

**Improved Implementation:**

```typescript
// components/molecules/status-indicator.tsx
import { cn } from "@/lib/utils"

interface StatusIndicatorProps {
  status: "online" | "offline" | "processing" | "error"
  label: string
  className?: string
  showLabel?: boolean
}

const statusConfig = {
  online: {
    color: "bg-emerald-500",
    icon: "●",
    label: "Online"
  },
  offline: {
    color: "bg-gray-400",
    icon: "○",
    label: "Offline"
  },
  processing: {
    color: "bg-amber-500",
    icon: "⟳",
    label: "Processing"
  },
  error: {
    color: "bg-red-500",
    icon: "⚠",
    label: "Error"
  }
}

export function StatusIndicator({
  status,
  label,
  className,
  showLabel = false
}: StatusIndicatorProps) {
  const config = statusConfig[status]

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div
        className={cn(
          "relative w-2 h-2 rounded-full",
          config.color,
          status === "online" && "animate-pulse"
        )}
        aria-hidden="true"
      >
        <span className="sr-only">{config.icon}</span>
      </div>
      <span className={cn(
        "text-sm font-medium",
        showLabel ? "inline" : "sr-only"
      )}>
        {label}
      </span>
      <span className="sr-only">Status: {config.label}</span>
    </div>
  )
}
```

### 3. Enhanced Touch Targets for Mobile

**Current Issue:** Touch targets below 44px minimum

**Improved Theme Toggle:**

```typescript
// components/atoms/theme-toggle.tsx - Enhanced version
"use client"

import { Moon, Sun, Monitor } from "lucide-react"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()

  return (
    <div className="relative flex h-11 w-[132px] items-center justify-between rounded-full border border-border bg-background">
      {/* Enhanced sliding indicator */}
      <div
        className={cn(
          "absolute h-9 w-9 rounded-full border border-border bg-accent transition-transform duration-200 ease-out",
          theme === "system" && "translate-x-1",
          theme === "light" && "translate-x-[45px]",
          theme === "dark" && "translate-x-[89px]"
        )}
      />

      {/* Enhanced touch targets - minimum 44px */}
      <Button
        variant="ghost"
        size="icon"
        className="relative z-10 h-11 w-11 rounded-full"
        onClick={() => setTheme("system")}
        aria-label="Use system theme"
      >
        <Monitor className="h-4 w-4" />
      </Button>

      <Button
        variant="ghost"
        size="icon"
        className="relative z-10 h-11 w-11 rounded-full"
        onClick={() => setTheme("light")}
        aria-label="Use light theme"
      >
        <Sun className="h-4 w-4" />
      </Button>

      <Button
        variant="ghost"
        size="icon"
        className="relative z-10 h-11 w-11 rounded-full"
        onClick={() => setTheme("dark")}
        aria-label="Use dark theme"
      >
        <Moon className="h-4 w-4" />
      </Button>
    </div>
  )
}
```

## Enhanced Atomic Design Structure

### 4. Proper Molecule: TokenPreviewCard

**New Component for Better Atomic Design:**

```typescript
// components/molecules/token-preview-card.tsx
import { Badge } from "@/components/ui/badge"
import { TokenColorSwatch } from "@/components/atoms/token-color-swatch"
import { ConfidenceMeter } from "@/components/atoms/confidence-meter"

interface TokenPreviewCardProps {
  token: {
    name: string
    value: string
    type: "color" | "spacing" | "typography" | "shadow"
    confidence: number
    usage: number
  }
  className?: string
}

export function TokenPreviewCard({ token, className }: TokenPreviewCardProps) {
  return (
    <div className={cn(
      "group relative rounded-lg border border-border bg-card p-4 transition-all duration-200",
      "hover:shadow-md hover:border-border/80",
      "focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2",
      className
    )}>
      {/* Token preview based on type */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          {token.type === "color" && (
            <TokenColorSwatch color={token.value} size="md" />
          )}
          <div>
            <h3 className="text-sm font-medium text-foreground">{token.name}</h3>
            <p className="text-xs text-muted-foreground font-mono">{token.value}</p>
          </div>
        </div>
        <Badge variant="secondary" className="text-xs">
          {token.type}
        </Badge>
      </div>

      {/* Confidence and usage metrics */}
      <div className="space-y-2">
        <ConfidenceMeter
          confidence={token.confidence}
          size="sm"
          showLabel={false}
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Confidence: {token.confidence}%</span>
          <span>Usage: {token.usage}x</span>
        </div>
      </div>
    </div>
  )
}
```

### 5. Reorganized Header Structure

**Split VercelHeader into focused organisms:**

```typescript
// components/organisms/navigation/main-header.tsx
interface MainHeaderProps {
  className?: string
}

export function MainHeader({ className }: MainHeaderProps) {
  return (
    <header className={cn(
      "sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur-md",
      className
    )}>
      <div className="container flex h-16 items-center justify-between">
        <BrandLogo />
        <MainNavigation />
        <UserActions />
      </div>
    </header>
  )
}

// components/organisms/navigation/search-header.tsx
interface SearchHeaderProps {
  searchValue: string
  onSearchChange: (value: string) => void
  onSubmit: (query: string) => void
  isLoading?: boolean
}

export function SearchHeader({
  searchValue,
  onSearchChange,
  onSubmit,
  isLoading
}: SearchHeaderProps) {
  return (
    <div className="border-b border-border bg-background/95 backdrop-blur-md">
      <div className="container py-4">
        <SearchInput
          value={searchValue}
          onChange={onSearchChange}
          onSubmit={onSubmit}
          loading={isLoading}
          placeholder="Scan any website for design tokens..."
          size="lg"
        />
      </div>
    </div>
  )
}

// components/organisms/stats/live-stats-display.tsx
export function LiveStatsDisplay() {
  const { metrics, isConnected } = useRealtimeStore()

  return (
    <div className="flex items-center space-x-6 text-sm text-muted-foreground font-mono">
      <StatItem
        value={metrics?.totalTokens || 0}
        label="tokens"
        format="compact"
      />
      <StatItem
        value={metrics?.totalSites || 0}
        label="sites"
        format="compact"
      />
      <ConnectionIndicator connected={isConnected} />
    </div>
  )
}
```

## Improved Color Contrast

### 6. WCAG AA Compliant Color Adjustments

**Current Issue:** text-grep-9 fails contrast ratios

**Enhanced Color System:**

```css
/* globals.css - Enhanced contrast ratios */
:root {
  /* Improved muted text - better contrast */
  --muted-foreground: oklch(0.42 0.02 240); /* Was: oklch(0.5 0.02 240) */

  /* Enhanced secondary text */
  --secondary-foreground: oklch(0.35 0.15 280); /* Was: oklch(0.45 0.15 280) */

  /* Better accent contrast */
  --accent-foreground: oklch(0.2 0.08 200); /* Was: oklch(0.25 0.08 200) */
}

.dark {
  /* Enhanced dark mode contrast */
  --muted-foreground: oklch(0.72 0.015 240); /* Was: oklch(0.65 0.015 240) */
  --secondary-foreground: oklch(0.85 0.1 280); /* Was: oklch(0.8 0.1 280) */
  --accent-foreground: oklch(0.88 0.08 200); /* Was: oklch(0.85 0.08 200) */
}

/* Utility classes with guaranteed contrast */
.text-contrast-safe {
  color: oklch(0.35 0.02 240);
}

.dark .text-contrast-safe {
  color: oklch(0.75 0.015 240);
}

/* High contrast mode support */
@media (prefers-contrast: high) {
  :root {
    --muted-foreground: oklch(0.25 0.02 240);
    --border: oklch(0.5 0.005 240);
  }

  .dark {
    --muted-foreground: oklch(0.85 0.015 240);
    --border: oklch(0.6 0.01 240);
  }
}
```

## Performance Optimizations

### 7. Hardware-Accelerated Animations

**Enhanced Animation System:**

```css
/* globals.css - Performance optimized animations */
@layer components {
  /* Hardware-accelerated card interactions */
  .card-interactive {
    transform: translateZ(0); /* Force hardware layer */
    will-change: transform;
    transition: transform 200ms cubic-bezier(0.4, 0, 0.2, 1),
                box-shadow 200ms cubic-bezier(0.4, 0, 0.2, 1);
  }

  .card-interactive:hover {
    transform: translateZ(0) translateY(-2px) scale(1.01);
  }

  /* Optimized scan progress animation */
  .scan-progress {
    contain: layout style paint;
    will-change: transform;
  }

  /* Smooth status transitions */
  .status-transition {
    transition: all 250ms cubic-bezier(0.4, 0, 0.2, 1);
    contain: layout;
  }

  /* Reduced motion support */
  @media (prefers-reduced-motion: reduce) {
    .card-interactive,
    .scan-progress,
    .status-transition {
      transition: none;
      animation: none;
    }

    .card-interactive:hover {
      transform: none;
    }
  }
}
```

## Visual Hierarchy Improvements

### 8. Enhanced Homepage Layout

**Improved Section Structure:**

```typescript
// app/(marketing)/page.tsx - Enhanced structure
export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Skip to content link */}
      <SkipLinks />

      {/* Header with proper landmark */}
      <MainHeader />

      {/* Main content with semantic structure */}
      <main id="main-content" className="flex-1">
        {/* Hero section */}
        <section
          aria-labelledby="hero-heading"
          className="py-16 md:py-24 lg:py-32"
        >
          <div className="container">
            <div className="max-w-3xl mx-auto text-center space-y-8">
              <div className="space-y-4">
                <h1
                  id="hero-heading"
                  className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-foreground"
                >
                  Extract design tokens<br />from any website
                </h1>
                <p className="text-lg sm:text-xl text-contrast-safe max-w-2xl mx-auto leading-relaxed">
                  Scan sites like{" "}
                  <ExampleSiteButton domain="stripe.com" />,{" "}
                  <ExampleSiteButton domain="linear.app" />, and{" "}
                  <ExampleSiteButton domain="github.com" />
                  {" "}to extract colors, typography, spacing across{" "}
                  <RealtimeCounter value={metrics?.totalTokens} />+ tokens.
                </p>
              </div>

              <TokenPreviewGrid />
              <CTASection />
            </div>
          </div>
        </section>

        {/* Metrics section */}
        <section
          aria-labelledby="metrics-heading"
          className="py-16 border-t border-border"
        >
          <div className="container">
            <h2 id="metrics-heading" className="sr-only">
              Platform Statistics
            </h2>
            <MetricsGrid />
          </div>
        </section>

        {/* Examples section */}
        <section
          aria-labelledby="examples-heading"
          className="py-16"
        >
          <div className="container">
            <h2
              id="examples-heading"
              className="text-center text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-8"
            >
              Popular Sites to Try
            </h2>
            <PopularSitesGrid />
          </div>
        </section>
      </main>

      {/* Footer with proper landmark */}
      <footer role="contentinfo" className="border-t border-border">
        <SiteFooter />
      </footer>
    </div>
  )
}
```

These improvements address the critical issues identified in the audit while maintaining the sophisticated design aesthetic of ContextDS. The changes focus on accessibility compliance, atomic design organization, and performance optimization while preserving the platform's modern, developer-focused user experience.