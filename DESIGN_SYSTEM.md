# ContextDS Design System

A comprehensive design system for the ContextDS design token extraction platform, built with modern principles and accessibility in mind.

## Overview

The ContextDS design system is built around the concept of design tokens themselves, creating a meta-design that reflects our core product offering. The system emphasizes clarity, precision, and professional polish while maintaining approachability for developers and designers.

## Design Principles

### 1. Token-First Design
Every design decision reflects our core mission of design token extraction. Colors, spacing, and typography choices demonstrate the power of systematic design.

### 2. Professional Precision
Clean, technical aesthetics that inspire confidence in our data accuracy and extraction capabilities.

### 3. Developer-Friendly
Intuitive component patterns and clear documentation that developers can quickly understand and implement.

### 4. Accessibility-First
WCAG 2.1 AA compliance built into every component, with support for high contrast mode and reduced motion preferences.

### 5. Performance-Optimized
Lightweight, GPU-accelerated animations and optimized shadow/gradient systems.

## Color System

### Brand Colors

Our color palette uses the OKLCH color space for better perceptual uniformity and accessibility.

```css
/* Light Mode */
--primary: oklch(0.55 0.18 255);        /* Vibrant blue - primary brand */
--chart-2: oklch(0.7 0.15 200);         /* Cyan - for tokens */
--chart-5: oklch(0.58 0.16 280);        /* Purple - for design systems */
--chart-3: oklch(0.6 0.18 140);         /* Green - for success */
--chart-4: oklch(0.75 0.15 70);         /* Yellow - for warnings */
--chart-1: oklch(0.65 0.22 15);         /* Red - for errors */

/* Dark Mode */
--primary: oklch(0.7 0.2 255);          /* Brighter blue for dark mode */
--chart-2: oklch(0.75 0.18 200);        /* Bright cyan */
--chart-5: oklch(0.68 0.18 280);        /* Bright purple */
--chart-3: oklch(0.7 0.2 140);          /* Bright green */
--chart-4: oklch(0.8 0.18 70);          /* Bright yellow */
--chart-1: oklch(0.7 0.22 15);          /* Bright red */
```

### Semantic Colors

```css
--success: oklch(0.6 0.18 140);
--warning: oklch(0.75 0.15 70);
--destructive: oklch(0.65 0.25 15);
```

### Usage Guidelines

- **Primary**: Main brand color for CTAs, links, and key interactive elements
- **Chart Colors**: Data visualization and category differentiation
- **Semantic Colors**: Status indicators and feedback messages

## Typography

### Type Scale

Built with modern proportions and optimized letter spacing:

```css
.text-context-xs    { font-size: 0.75rem; line-height: 1.5; letter-spacing: 0.025em; }
.text-context-sm    { font-size: 0.875rem; line-height: 1.6; letter-spacing: 0.01em; }
.text-context-base  { font-size: 1rem; line-height: 1.6; letter-spacing: 0; }
.text-context-lg    { font-size: 1.125rem; line-height: 1.5; letter-spacing: -0.01em; }
.text-context-xl    { font-size: 1.25rem; line-height: 1.4; letter-spacing: -0.015em; }
.text-context-2xl   { font-size: 1.5rem; line-height: 1.3; letter-spacing: -0.02em; }
.text-context-3xl   { font-size: 1.875rem; line-height: 1.2; letter-spacing: -0.025em; }
.text-context-4xl   { font-size: 2.25rem; line-height: 1.1; letter-spacing: -0.03em; }
.text-context-5xl   { font-size: 3rem; line-height: 1; letter-spacing: -0.035em; }
```

### Semantic Typography

```css
.text-display    /* Large display text (4xl) */
.text-headline   /* Section headlines (3xl) */
.text-title      /* Card/component titles (2xl) */
.text-subtitle   /* Supporting text (lg, muted) */
.text-body       /* Body text (base) */
.text-caption    /* Small supporting text (sm, muted) */
.text-overline   /* Labels and categories (xs, uppercase) */
.text-code       /* Code snippets with ligatures */
```

### Font Features

- **OpenType Features**: cv02, cv03, cv04, cv11 for improved readability
- **Code Typography**: zero, common-ligatures for technical content
- **Text Wrapping**: balance for headings, pretty for body text

## Spacing System

Based on an 8px grid system with consistent ratios:

```css
.space-context-xs   { gap: 0.25rem; }    /* 4px */
.space-context-sm   { gap: 0.5rem; }     /* 8px */
.space-context-md   { gap: 0.75rem; }    /* 12px */
.space-context-lg   { gap: 1rem; }       /* 16px */
.space-context-xl   { gap: 1.5rem; }     /* 24px */
.space-context-2xl  { gap: 2rem; }       /* 32px */
.space-context-3xl  { gap: 3rem; }       /* 48px */
.space-context-4xl  { gap: 4rem; }       /* 64px */
.space-context-5xl  { gap: 6rem; }       /* 96px */
```

## Layout System

### Containers

```css
.container-context         /* Standard container (75rem max) */
.container-context-narrow  /* Narrow content (42rem max) */
.container-context-wide    /* Wide layouts (90rem max) */
```

### Specialized Layouts

```css
.token-grid     /* Auto-fitting grid for token cards */
.search-layout  /* Centered search interface layout */
```

## Component Patterns

### Buttons

Enhanced with micro-interactions and multiple variants:

```tsx
// Standard variants
<Button variant="default">Primary Action</Button>
<Button variant="outline">Secondary Action</Button>
<Button variant="ghost">Tertiary Action</Button>

// Specialized variants
<Button variant="gradient">Premium Feature</Button>
<Button variant="token">Token-related Action</Button>

// Enhanced interactions
<Button className="btn-enhanced">Ripple Effect</Button>
```

### Cards

Interactive cards with hover states and proper depth:

```tsx
<Card className="card-interactive shadow-context-sm hover:shadow-context-md">
  {/* Content */}
</Card>
```

### Search Interface

Enhanced search with focus states and accessibility:

```tsx
<Input className="search-enhanced focus-ring" />
```

## Shadow System

Brand-appropriate shadows with OKLCH color integration:

```css
.shadow-context-sm   /* Subtle elevation */
.shadow-context-md   /* Standard elevation */
.shadow-context-lg   /* High elevation */
.shadow-context-xl   /* Maximum elevation */
.shadow-token        /* Token-specific accent shadow */
.shadow-interactive  /* Hover state shadows */
```

## Animation & Micro-interactions

### Principles

- **Duration**: 200-300ms for micro-interactions, 600-800ms for page transitions
- **Easing**: cubic-bezier(0.4, 0, 0.2, 1) for natural motion
- **Reduced Motion**: Respects prefers-reduced-motion user preference

### Classes

```css
.btn-enhanced        /* Button with ripple effect */
.card-interactive    /* Smooth hover elevation */
.reveal             /* Fade-up entrance animation */
.reveal-delay-[1-3] /* Staggered animation delays */
.float              /* Floating decoration animation */
.pulse-glow         /* Pulsing glow effect */
```

## Accessibility

### Focus Management

- Custom focus rings with brand colors
- High contrast mode support
- Skip links for keyboard navigation
- Screen reader utilities

### Utilities

```css
.focus-ring         /* Standard focus outline */
.focus-ring-inset   /* Inset focus outline */
.sr-only           /* Screen reader only content */
.skip-link         /* Skip to main content */
```

### Guidelines

- Minimum 4.5:1 contrast ratio for normal text
- Minimum 3:1 contrast ratio for large text
- 44px minimum touch target size
- Semantic HTML structure with proper ARIA labels

## Usage Examples

### Token Card Component

```tsx
<TokenCard
  token={{
    name: "primary-blue",
    value: "#3b82f6",
    type: "color",
    confidence: 94,
    usage: 142
  }}
  className="reveal"
/>
```

### Search Interface

```tsx
<div className="search-layout">
  <Input
    className="search-enhanced focus-ring"
    placeholder="Search design tokens..."
  />
  <Button variant="gradient" className="btn-enhanced">
    Search
  </Button>
</div>
```

### Result Cards

```tsx
<Card className="card-interactive shadow-context-sm hover:shadow-context-md">
  <CardContent className="space-context-md">
    <h3 className="text-title">Site Name</h3>
    <p className="text-caption">Description</p>
  </CardContent>
</Card>
```

## Best Practices

### Do's

- Use semantic typography classes for consistent hierarchy
- Apply proper spacing with the context spacing system
- Implement interactive states for all clickable elements
- Test with screen readers and keyboard navigation
- Use the token-grid for displaying collections

### Don'ts

- Don't mix spacing systems (stick to context spacing)
- Don't use arbitrary colors outside the defined palette
- Don't forget hover/focus states on interactive elements
- Don't ignore reduced motion preferences
- Don't use animations longer than 800ms for interface interactions

## Development Guidelines

### CSS Architecture

- Use CSS custom properties for theming
- Leverage Tailwind utilities with design system classes
- Implement proper cascade with @layer directives
- Optimize for performance with will-change and transform3d

### Component Implementation

- Forward refs for composition
- Consistent variant systems with class-variance-authority
- TypeScript-first with proper prop interfaces
- RSC compatibility for Next.js integration

This design system creates a cohesive, professional, and accessible experience that reflects ContextDS's mission of precise design token extraction while providing an excellent user experience for both designers and developers.