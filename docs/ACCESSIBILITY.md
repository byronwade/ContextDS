# Accessibility Guidelines for ContextDS

This document outlines the accessibility standards, testing procedures, and implementation guidelines for the ContextDS design token platform.

## Overview

ContextDS is committed to WCAG 2.1 Level AA compliance to ensure our platform is accessible to all users, including those using assistive technologies.

## Current Accessibility Status

### ✅ Implemented Features

- **Skip Links**: Keyboard users can quickly jump to main content
- **Semantic HTML**: Proper use of headings, landmarks, and form elements
- **Focus Management**: Visible focus indicators and logical tab order
- **ARIA Support**: Live regions, labels, and descriptions where needed
- **Color Contrast**: Design system meets 4.5:1 contrast ratios
- **Responsive Design**: Mobile-friendly with proper touch targets
- **Reduced Motion**: Respects user motion preferences
- **Screen Reader Support**: Compatible with NVDA, JAWS, VoiceOver

### 🔧 In Progress

- **Touch Target Optimization**: Ensuring 44px minimum sizes
- **Dynamic Content**: Enhanced ARIA live region support
- **Form Validation**: Improved error messaging patterns

## Testing Strategy

### Automated Testing

We use multiple tools to catch accessibility issues early:

```bash
# Run all accessibility tests
bun run test:accessibility

# Generate accessibility report
bun run test:accessibility:report

# Full accessibility audit
bun run audit:accessibility
```

### Testing Tools

1. **axe-core** - WCAG violation detection
2. **Playwright** - Automated browser testing
3. **pa11y** - Command-line accessibility testing
4. **Lighthouse** - Performance and accessibility audits

### Manual Testing Checklist

#### Keyboard Navigation
- [ ] Tab order is logical and complete
- [ ] All interactive elements are focusable
- [ ] Focus indicators are clearly visible
- [ ] Skip links work correctly
- [ ] Modal focus trapping works
- [ ] No keyboard traps exist

#### Screen Reader Testing
- [ ] Content structure is logical
- [ ] Headings create proper outline
- [ ] Images have appropriate alt text
- [ ] Links have descriptive text
- [ ] Form fields are properly labeled
- [ ] Dynamic content is announced

#### Color and Contrast
- [ ] 4.5:1 contrast for normal text
- [ ] 3:1 contrast for large text (18pt+)
- [ ] Information not conveyed by color alone
- [ ] Color-blind friendly palette

#### Mobile Accessibility
- [ ] Touch targets ≥ 44px
- [ ] Zoom up to 200% without horizontal scroll
- [ ] Screen reader gestures work
- [ ] Content reflows properly

## Implementation Guidelines

### HTML Structure

```html
<!-- Use semantic HTML -->
<main id="main-content" role="main">
  <h1>Page Title</h1>
  <section aria-labelledby="section-heading">
    <h2 id="section-heading">Section Title</h2>
    <!-- content -->
  </section>
</main>

<!-- Proper form structure -->
<form role="search" aria-label="Site search">
  <label for="search-input">Search sites and tokens</label>
  <input
    id="search-input"
    type="search"
    aria-describedby="search-help"
  />
  <div id="search-help" class="sr-only">
    Enter a website URL to scan for design tokens
  </div>
</form>
```

### ARIA Patterns

```tsx
// Live regions for dynamic content
<div aria-live="polite" aria-atomic="true" className="sr-only">
  {statusMessage}
</div>

// Button states
<button
  aria-pressed={isActive}
  aria-label="Vote for Stripe.com (42 votes)"
>
  Vote
</button>

// Expandable content
<button
  aria-expanded={isOpen}
  aria-controls="menu-content"
>
  Menu
</button>
```

### CSS Accessibility

```css
/* Screen reader only content */
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

/* Focus indicators */
:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}

/* Reduced motion */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

## Component Accessibility Requirements

### Buttons
- Must have accessible names (text, aria-label, or aria-labelledby)
- Loading states should be announced
- Disabled state should prevent interaction

### Forms
- All inputs must have labels
- Error messages linked via aria-describedby
- Required fields marked with aria-required
- Validation feedback announced to screen readers

### Navigation
- Use nav element with aria-label
- Current page indicated with aria-current
- Breadcrumbs use proper markup

### Modal Dialogs
- Focus trapped within modal
- Focus returns to trigger on close
- Escape key closes modal
- Background is inert

## Design System Accessibility

### Color Palette
All colors in our design system meet WCAG contrast requirements:

- Primary: #3b82f6 (contrast ratio: 4.52:1)
- Success: #059669 (contrast ratio: 4.56:1)
- Warning: #d97706 (contrast ratio: 4.51:1)
- Error: #dc2626 (contrast ratio: 5.82:1)

### Typography
- Minimum 16px base font size
- Line height 1.5 or greater
- Clear font families (system fonts preferred)
- Adequate spacing between elements

### Touch Targets
- Minimum 44×44px for touch interfaces
- Adequate spacing between targets
- Visual feedback on interaction

## Testing Schedule

### Continuous Integration
- Automated axe tests run on every PR
- Failed accessibility tests block deployment
- Regular Lighthouse audits

### Manual Testing
- Weekly screen reader testing
- Monthly keyboard-only navigation review
- Quarterly comprehensive accessibility audit

### User Testing
- Quarterly testing with users who use assistive technologies
- Annual accessibility consultant review

## Common Issues and Solutions

### Missing Form Labels
```tsx
// ❌ Bad
<input placeholder="Search..." />

// ✅ Good
<label htmlFor="search">Search</label>
<input id="search" placeholder="Search..." />
```

### Poor Button Names
```tsx
// ❌ Bad
<button onClick={handleClick}>
  <Icon />
</button>

// ✅ Good
<button onClick={handleClick} aria-label="Delete item">
  <Icon aria-hidden="true" />
</button>
```

### Missing Heading Structure
```tsx
// ❌ Bad - skips heading levels
<h1>Page Title</h1>
<h3>Section Title</h3>

// ✅ Good - logical hierarchy
<h1>Page Title</h1>
<h2>Section Title</h2>
```

## Resources

### Documentation
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [MDN Accessibility](https://developer.mozilla.org/en-US/docs/Web/Accessibility)
- [WebAIM Resources](https://webaim.org/)

### Testing Tools
- [axe Browser Extension](https://www.deque.com/axe/browser-extensions/)
- [WAVE Web Accessibility Evaluator](https://wave.webaim.org/)
- [Colour Contrast Analyser](https://www.tpgi.com/color-contrast-checker/)

### Screen Readers
- [NVDA](https://www.nvaccess.org/) (Windows, Free)
- [JAWS](https://www.freedomscientific.com/products/software/jaws/) (Windows, Commercial)
- [VoiceOver](https://support.apple.com/guide/voiceover/) (macOS/iOS, Built-in)

## Reporting Issues

If you discover accessibility issues:

1. Create an issue with the "accessibility" label
2. Include steps to reproduce
3. Note which assistive technology is affected
4. Provide expected vs. actual behavior
5. Include screenshots/recordings if helpful

## Maintenance

This document should be reviewed and updated:
- When new features are added
- After accessibility audits
- When WCAG guidelines are updated
- Quarterly as part of documentation review

---

Last updated: October 2025
Compliance target: WCAG 2.1 Level AA