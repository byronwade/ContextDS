/**
 * Component Pattern Definitions
 * All 58 component types with multi-strategy detection
 */

import type { ComponentPattern } from './types'
import {
  matchesSelector,
  hasAria,
  isElement,
  hasStyle,
  scoreMatches,
  hasPaddingRatio,
  hasRoundedCorners,
  hasElevation,
  hasInteractiveTransition,
  hasFocusRing,
  matchesTypographyScale,
  isFlexContainer,
  matchesSpacingScale,
  hasAspectRatio,
  hasTruncation,
  scoreFrameworkMatch,
  scoreBehavioralPatterns
} from './types'

// Accordion Pattern
export const accordion: ComponentPattern = {
  cssSelector: (el) => scoreMatches([
    matchesSelector(el.selector, ['accordion', 'collapse', 'expand']),
    matchesSelector(el.selector, ['accordion-item', 'accordion-trigger', 'accordion-content'])
  ]),
  ariaPattern: (el) => scoreMatches([
    hasAria(el, 'role', 'region') || hasAria(el, 'role', 'button'),
    hasAria(el, 'ariaExpanded'),
    hasAria(el, 'ariaControls')
  ]),
  semanticHtml: (el) => scoreMatches([
    isElement(el, ['details', 'summary', 'div'])
  ]),
  computedStyle: (el) => scoreMatches([
    hasStyle(el, 'overflow', v => v === 'hidden' || v === 'auto')
  ]),
  visualSignature: (el) => scoreMatches([
    // Transitions for expand/collapse
    hasInteractiveTransition(el),
    // Consistent spacing
    matchesSpacingScale(el, 8) || matchesSpacingScale(el, 16),
    // Often flex containers
    isFlexContainer(el, 'column')
  ]),
  frameworkPattern: (el) => scoreFrameworkMatch(el, 'shadcn/ui', 'Radix UI', 'Material UI', 'Chakra UI', 'Ant Design', 'Mantine'),
  behavioralAnalysis: (el) => scoreBehavioralPatterns(el, 'accordion')
}

// Alert Pattern
export const alert: ComponentPattern = {
  cssSelector: (el) => scoreMatches([
    matchesSelector(el.selector, ['alert', 'notification', 'banner', 'message']),
    matchesSelector(el.selector, ['alert-title', 'alert-description'])
  ]),
  ariaPattern: (el) => scoreMatches([
    hasAria(el, 'role', 'alert') || hasAria(el, 'role', 'status'),
    hasAria(el, 'ariaLive'),
    hasAria(el, 'ariaAtomic')
  ]),
  computedStyle: (el) => scoreMatches([
    hasStyle(el, 'padding', v => v && v !== '0px'),
    hasStyle(el, 'borderRadius', v => v && v !== '0px'),
    hasStyle(el, 'backgroundColor', v => v && v !== 'transparent')
  ]),
  visualSignature: (el) => scoreMatches([
    // Rounded corners
    hasRoundedCorners(el, 'rounded'),
    // Consistent padding
    matchesSpacingScale(el, 8) || matchesSpacingScale(el, 16),
    // Often flex containers for icon + text layout
    isFlexContainer(el, 'row')
  ]),
  frameworkPattern: (el) => scoreFrameworkMatch(el, 'shadcn/ui', 'Material UI', 'Chakra UI', 'Ant Design', 'Mantine'),
  behavioralAnalysis: (el) => scoreBehavioralPatterns(el, 'alert')
}

// Alert Dialog Pattern
export const alertDialog: ComponentPattern = {
  cssSelector: (el) => scoreMatches([
    matchesSelector(el.selector, ['alert-dialog', 'modal-alert', 'confirm']),
    matchesSelector(el.selector, ['dialog', 'overlay'])
  ]),
  ariaPattern: (el) => scoreMatches([
    hasAria(el, 'role', 'alertdialog'),
    hasAria(el, 'ariaModal', 'true'),
    hasAria(el, 'ariaLabelledBy')
  ]),
  semanticHtml: (el) => scoreMatches([
    isElement(el, ['dialog', 'div'])
  ]),
  computedStyle: (el) => scoreMatches([
    hasStyle(el, 'position', v => v === 'fixed' || v === 'absolute'),
    hasStyle(el, 'zIndex', v => v && parseInt(v) > 1000)
  ]),
  visualSignature: (el) => scoreMatches([
    // Very high elevation
    hasElevation(el, 'high'),
    // Rounded corners
    hasRoundedCorners(el, 'rounded'),
    // Fixed positioning
    hasStyle(el, 'position', v => v === 'fixed'),
    // Modal animations
    hasInteractiveTransition(el)
  ]),
  frameworkPattern: (el) => scoreFrameworkMatch(el, 'shadcn/ui', 'Radix UI', 'Material UI', 'Chakra UI'),
  behavioralAnalysis: (el) => scoreBehavioralPatterns(el, 'alert-dialog')
}

// Aspect Ratio Pattern
export const aspectRatio: ComponentPattern = {
  cssSelector: (el) => scoreMatches([
    matchesSelector(el.selector, ['aspect-ratio', 'ratio', 'embed-responsive'])
  ]),
  computedStyle: (el) => scoreMatches([
    hasStyle(el, 'aspectRatio', v => !!v),
    hasStyle(el, 'paddingBottom', v => v && v.includes('%'))
  ]),
  visualSignature: (el) => scoreMatches([
    // Common video/image ratios
    hasAspectRatio(el, '16:9') || hasAspectRatio(el, '4:3') || hasAspectRatio(el, '1:1')
  ]),
  frameworkPattern: (el) => scoreFrameworkMatch(el, 'shadcn/ui', 'Radix UI'),
  behavioralAnalysis: (el) => scoreBehavioralPatterns(el, 'aspect-ratio')
}

// Avatar Pattern
export const avatar: ComponentPattern = {
  cssSelector: (el) => scoreMatches([
    matchesSelector(el.selector, ['avatar', 'profile-pic', 'user-image'])
  ]),
  computedStyle: (el) => scoreMatches([
    hasStyle(el, 'borderRadius', v => v === '50%' || v === '9999px'),
    hasStyle(el, 'width', v => v === el.computedStyle?.height),
    hasStyle(el, 'overflow', v => v === 'hidden')
  ]),
  semanticHtml: (el) => scoreMatches([
    isElement(el, ['img', 'div', 'span'])
  ]),
  visualSignature: (el) => scoreMatches([
    // Perfect circle shape
    hasRoundedCorners(el, 'circle'),
    // Square aspect ratio (1:1)
    hasAspectRatio(el, '1:1'),
    // Typically small and consistent sizes
    hasStyle(el, 'width', v => {
      const size = parseFloat(v)
      return size >= 24 && size <= 96 // Common avatar sizes
    })
  ]),
  frameworkPattern: (el) => scoreFrameworkMatch(el, 'shadcn/ui', 'Radix UI', 'Material UI', 'Chakra UI', 'Ant Design', 'Mantine', 'NextUI', 'Ark UI', 'PrimeReact'),
  behavioralAnalysis: (el) => scoreBehavioralPatterns(el, 'avatar')
}

// Badge Pattern
export const badge: ComponentPattern = {
  cssSelector: (el) => scoreMatches([
    matchesSelector(el.selector, ['badge', 'tag', 'pill', 'label', 'chip'])
  ]),
  computedStyle: (el) => scoreMatches([
    hasStyle(el, 'display', v => v === 'inline-block' || v === 'inline-flex'),
    hasStyle(el, 'padding', v => v && v !== '0px'),
    hasStyle(el, 'borderRadius', v => v && v !== '0px'),
    hasStyle(el, 'fontSize', v => v && parseFloat(v) < 14)
  ]),
  visualSignature: (el) => scoreMatches([
    // Small, compact typography
    matchesTypographyScale(el, 'caption'),
    // Pill or rounded shape
    hasRoundedCorners(el, 'pill') || hasRoundedCorners(el, 'rounded'),
    // Tight, consistent padding
    hasPaddingRatio(el, { x: 2, y: 1 }) || hasPaddingRatio(el, { x: 3, y: 2 }),
    // Inline display
    hasStyle(el, 'display', v => v?.includes('inline'))
  ]),
  frameworkPattern: (el) => scoreFrameworkMatch(el, 'shadcn/ui', 'Radix UI', 'Material UI', 'Chakra UI', 'Ant Design', 'Mantine', 'NextUI', 'PrimeReact'),
  behavioralAnalysis: (el) => scoreBehavioralPatterns(el, 'badge')
}

// Breadcrumb Pattern
export const breadcrumb: ComponentPattern = {
  cssSelector: (el) => scoreMatches([
    matchesSelector(el.selector, ['breadcrumb', 'breadcrumbs'])
  ]),
  ariaPattern: (el) => scoreMatches([
    hasAria(el, 'role', 'navigation'),
    hasAria(el, 'ariaLabel', 'breadcrumb')
  ]),
  semanticHtml: (el) => scoreMatches([
    isElement(el, ['nav', 'ol', 'ul'])
  ]),
  visualSignature: (el) => scoreMatches([
    // Horizontal flex layout
    isFlexContainer(el, 'row'),
    // Small caption typography
    matchesTypographyScale(el, 'caption') || matchesTypographyScale(el, 'body')
  ]),
  frameworkPattern: (el) => scoreFrameworkMatch(el, 'shadcn/ui', 'Radix UI', 'Material UI', 'Chakra UI', 'Ant Design', 'Mantine', 'PrimeReact'),
  behavioralAnalysis: (el) => scoreBehavioralPatterns(el, 'breadcrumb')
}

// Button Pattern
export const button: ComponentPattern = {
  cssSelector: (el) => scoreMatches([
    matchesSelector(el.selector, ['button', 'btn']),
    !matchesSelector(el.selector, ['link', 'anchor'])
  ]),
  ariaPattern: (el) => scoreMatches([
    hasAria(el, 'role', 'button') || !el.role,
    !hasAria(el, 'ariaDisabled') || hasAria(el, 'ariaDisabled', 'false')
  ]),
  semanticHtml: (el) => scoreMatches([
    isElement(el, ['button', 'a', 'div'])
  ]),
  computedStyle: (el) => scoreMatches([
    hasStyle(el, 'cursor', v => v === 'pointer'),
    hasStyle(el, 'display', v => v === 'inline-flex' || v === 'flex' || v === 'inline-block'),
    hasStyle(el, 'padding', v => v && v !== '0px'),
    hasStyle(el, 'userSelect', v => v === 'none')
  ]),
  visualSignature: (el) => scoreMatches([
    // Common button padding ratios (2:1 or 3:1 horizontal to vertical)
    hasPaddingRatio(el, { x: 2, y: 1 }) || hasPaddingRatio(el, { x: 3, y: 1 }),
    // Rounded corners (pill or subtle rounding)
    hasRoundedCorners(el, 'pill') || hasRoundedCorners(el, 'rounded'),
    // Interactive transitions
    hasInteractiveTransition(el),
    // Focus ring for accessibility
    hasFocusRing(el),
    // Flex container for centering content
    isFlexContainer(el),
    // Follows spacing scale (4px or 8px grid)
    matchesSpacingScale(el, 4) || matchesSpacingScale(el, 8)
  ]),
  frameworkPattern: (el) => scoreFrameworkMatch(el, 'shadcn/ui', 'Radix UI', 'Material UI', 'Chakra UI', 'Ant Design', 'Mantine', 'NextUI', 'PrimeReact'),
  behavioralAnalysis: (el) => scoreBehavioralPatterns(el, 'button')
}

// Calendar Pattern
export const calendar: ComponentPattern = {
  cssSelector: (el) => scoreMatches([
    matchesSelector(el.selector, ['calendar', 'datepicker', 'date-picker'])
  ]),
  ariaPattern: (el) => scoreMatches([
    hasAria(el, 'role', 'grid'),
    hasAria(el, 'role', 'gridcell')
  ]),
  computedStyle: (el) => scoreMatches([
    hasStyle(el, 'display', v => v === 'grid')
  ]),
  visualSignature: (el) => scoreMatches([
    // Grid layout for days
    hasStyle(el, 'display', v => v === 'grid'),
    // Rounded corners
    hasRoundedCorners(el, 'rounded'),
    // Spacing scale
    matchesSpacingScale(el, 4) || matchesSpacingScale(el, 8)
  ]),
  frameworkPattern: (el) => scoreFrameworkMatch(el, 'shadcn/ui', 'Radix UI', 'Ant Design', 'Mantine', 'PrimeReact'),
  behavioralAnalysis: (el) => scoreBehavioralPatterns(el, 'calendar')
}

// Card Pattern
export const card: ComponentPattern = {
  cssSelector: (el) => scoreMatches([
    matchesSelector(el.selector, ['card', 'panel', 'box']),
    matchesSelector(el.selector, ['card-header', 'card-body', 'card-footer'])
  ]),
  computedStyle: (el) => scoreMatches([
    hasStyle(el, 'borderRadius', v => v && v !== '0px'),
    hasStyle(el, 'padding', v => v && v !== '0px'),
    hasStyle(el, 'backgroundColor', v => v && v !== 'transparent'),
    hasStyle(el, 'boxShadow', v => v && v !== 'none')
  ]),
  visualSignature: (el) => scoreMatches([
    // Cards typically have elevation shadows
    hasElevation(el, 'low') || hasElevation(el, 'medium'),
    // Rounded corners for modern cards
    hasRoundedCorners(el, 'rounded'),
    // Consistent padding following spacing scale
    matchesSpacingScale(el, 8) || matchesSpacingScale(el, 16),
    // Often flex or block containers
    hasStyle(el, 'display', v => v === 'flex' || v === 'block')
  ]),
  frameworkPattern: (el) => scoreFrameworkMatch(el, 'shadcn/ui', 'Radix UI', 'Material UI', 'Chakra UI', 'Ant Design', 'Mantine', 'NextUI', 'PrimeReact'),
  behavioralAnalysis: (el) => scoreBehavioralPatterns(el, 'card')
}

// Carousel Pattern
export const carousel: ComponentPattern = {
  cssSelector: (el) => scoreMatches([
    matchesSelector(el.selector, ['carousel', 'slider', 'swiper', 'slideshow'])
  ]),
  ariaPattern: (el) => scoreMatches([
    hasAria(el, 'role', 'region'),
    hasAria(el, 'ariaRoleDescription', 'carousel')
  ]),
  computedStyle: (el) => scoreMatches([
    hasStyle(el, 'overflow', v => v === 'hidden'),
    hasStyle(el, 'position', v => v === 'relative')
  ]),
  visualSignature: (el) => scoreMatches([
    // Smooth transitions
    hasInteractiveTransition(el),
    // Overflow hidden for slides
    hasStyle(el, 'overflow', v => v === 'hidden'),
    // Flex container
    isFlexContainer(el, 'row')
  ]),
  frameworkPattern: (el) => scoreFrameworkMatch(el, 'shadcn/ui', 'Radix UI', 'Ant Design', 'Mantine', 'PrimeReact'),
  behavioralAnalysis: (el) => scoreBehavioralPatterns(el, 'carousel')
}

// Chart Pattern
export const chart: ComponentPattern = {
  cssSelector: (el) => scoreMatches([
    matchesSelector(el.selector, ['chart', 'graph', 'visualization'])
  ]),
  semanticHtml: (el) => scoreMatches([
    isElement(el, ['svg', 'canvas', 'div'])
  ]),
  ariaPattern: (el) => scoreMatches([
    hasAria(el, 'role', 'img') || hasAria(el, 'role', 'figure')
  ]),
  visualSignature: (el) => scoreMatches([
    // SVG or canvas elements
    isElement(el, ['svg', 'canvas']),
    // Common aspect ratios
    hasAspectRatio(el, '16:9') || hasAspectRatio(el, '4:3')
  ]),
  frameworkPattern: (el) => scoreFrameworkMatch(el, 'shadcn/ui', 'Radix UI'),
  behavioralAnalysis: (el) => scoreBehavioralPatterns(el, 'chart')
}

// Checkbox Pattern
export const checkbox: ComponentPattern = {
  cssSelector: (el) => scoreMatches([
    matchesSelector(el.selector, ['checkbox', 'check'])
  ]),
  ariaPattern: (el) => scoreMatches([
    hasAria(el, 'role', 'checkbox'),
    hasAria(el, 'ariaChecked')
  ]),
  semanticHtml: (el) => scoreMatches([
    isElement(el, ['input']) && el.type === 'checkbox'
  ]),
  visualSignature: (el) => scoreMatches([
    // Square aspect ratio
    hasAspectRatio(el, '1:1'),
    // Rounded corners
    hasRoundedCorners(el, 'rounded'),
    // Interactive transitions
    hasInteractiveTransition(el),
    // Small size
    hasStyle(el, 'width', v => {
      const size = parseFloat(v)
      return size >= 16 && size <= 24
    })
  ]),
  frameworkPattern: (el) => scoreFrameworkMatch(el, 'shadcn/ui', 'Radix UI', 'Material UI', 'Chakra UI', 'Ant Design', 'Mantine', 'NextUI', 'Ark UI', 'PrimeReact'),
  behavioralAnalysis: (el) => scoreBehavioralPatterns(el, 'checkbox')
}

// Collapsible Pattern
export const collapsible: ComponentPattern = {
  cssSelector: (el) => scoreMatches([
    matchesSelector(el.selector, ['collapsible', 'expandable'])
  ]),
  ariaPattern: (el) => scoreMatches([
    hasAria(el, 'ariaExpanded')
  ]),
  visualSignature: (el) => scoreMatches([
    // Expand/collapse transitions
    hasInteractiveTransition(el),
    // Spacing scale
    matchesSpacingScale(el, 8) || matchesSpacingScale(el, 16)
  ]),
  frameworkPattern: (el) => scoreFrameworkMatch(el, 'shadcn/ui', 'Radix UI'),
  behavioralAnalysis: (el) => scoreBehavioralPatterns(el, 'collapsible')
}

// Combobox Pattern
export const combobox: ComponentPattern = {
  cssSelector: (el) => scoreMatches([
    matchesSelector(el.selector, ['combobox', 'autocomplete'])
  ]),
  ariaPattern: (el) => scoreMatches([
    hasAria(el, 'role', 'combobox'),
    hasAria(el, 'ariaExpanded'),
    hasAria(el, 'ariaAutocomplete')
  ]),
  visualSignature: (el) => scoreMatches([
    // Focus ring
    hasFocusRing(el),
    // Rounded corners
    hasRoundedCorners(el, 'rounded'),
    // Interactive transitions
    hasInteractiveTransition(el)
  ]),
  frameworkPattern: (el) => scoreFrameworkMatch(el, 'shadcn/ui', 'Radix UI', 'Headless UI', 'Mantine', 'Ark UI'),
  behavioralAnalysis: (el) => scoreBehavioralPatterns(el, 'combobox')
}

// Command Pattern
export const command: ComponentPattern = {
  cssSelector: (el) => scoreMatches([
    matchesSelector(el.selector, ['command', 'command-palette', 'cmdk'])
  ]),
  ariaPattern: (el) => scoreMatches([
    hasAria(el, 'role', 'dialog'),
    hasAria(el, 'ariaModal')
  ]),
  visualSignature: (el) => scoreMatches([
    // High elevation
    hasElevation(el, 'high'),
    // Rounded corners
    hasRoundedCorners(el, 'rounded'),
    // Fixed positioning
    hasStyle(el, 'position', v => v === 'fixed')
  ]),
  frameworkPattern: (el) => scoreFrameworkMatch(el, 'shadcn/ui', 'Radix UI'),
  behavioralAnalysis: (el) => scoreBehavioralPatterns(el, 'command')
}

// Context Menu Pattern
export const contextMenu: ComponentPattern = {
  cssSelector: (el) => scoreMatches([
    matchesSelector(el.selector, ['context-menu', 'contextmenu'])
  ]),
  ariaPattern: (el) => scoreMatches([
    hasAria(el, 'role', 'menu')
  ]),
  computedStyle: (el) => scoreMatches([
    hasStyle(el, 'position', v => v === 'fixed' || v === 'absolute')
  ]),
  visualSignature: (el) => scoreMatches([
    // Medium elevation
    hasElevation(el, 'medium'),
    // Rounded corners
    hasRoundedCorners(el, 'rounded'),
    // Absolute/fixed positioning
    hasStyle(el, 'position', v => v === 'absolute' || v === 'fixed')
  ]),
  frameworkPattern: (el) => scoreFrameworkMatch(el, 'shadcn/ui', 'Radix UI'),
  behavioralAnalysis: (el) => scoreBehavioralPatterns(el, 'context-menu')
}

// Data Table Pattern
export const dataTable: ComponentPattern = {
  cssSelector: (el) => scoreMatches([
    matchesSelector(el.selector, ['data-table', 'grid'])
  ]),
  ariaPattern: (el) => scoreMatches([
    hasAria(el, 'role', 'table'),
    hasAria(el, 'role', 'grid')
  ]),
  semanticHtml: (el) => scoreMatches([
    isElement(el, ['table', 'div'])
  ]),
  visualSignature: (el) => scoreMatches([
    // Spacing scale for cells
    matchesSpacingScale(el, 8) || matchesSpacingScale(el, 16),
    // Often has borders
    hasStyle(el, 'borderWidth', v => !!v && v !== '0px')
  ]),
  frameworkPattern: (el) => scoreFrameworkMatch(el, 'shadcn/ui', 'Radix UI', 'Ant Design', 'PrimeReact'),
  behavioralAnalysis: (el) => scoreBehavioralPatterns(el, 'data-table')
}

// Date Picker Pattern
export const datePicker: ComponentPattern = {
  cssSelector: (el) => scoreMatches([
    matchesSelector(el.selector, ['date-picker', 'datepicker'])
  ]),
  ariaPattern: (el) => scoreMatches([
    hasAria(el, 'role', 'dialog') || hasAria(el, 'role', 'grid')
  ]),
  visualSignature: (el) => scoreMatches([
    // Elevated popover
    hasElevation(el, 'medium') || hasElevation(el, 'high'),
    // Rounded corners
    hasRoundedCorners(el, 'rounded'),
    // Grid layout for calendar
    hasStyle(el, 'display', v => v === 'grid')
  ]),
  frameworkPattern: (el) => scoreFrameworkMatch(el, 'shadcn/ui', 'Radix UI', 'Ant Design', 'Mantine', 'PrimeReact'),
  behavioralAnalysis: (el) => scoreBehavioralPatterns(el, 'date-picker')
}

// Dialog Pattern
export const dialog: ComponentPattern = {
  cssSelector: (el) => scoreMatches([
    matchesSelector(el.selector, ['dialog', 'modal'])
  ]),
  ariaPattern: (el) => scoreMatches([
    hasAria(el, 'role', 'dialog'),
    hasAria(el, 'ariaModal'),
    hasAria(el, 'ariaLabelledBy')
  ]),
  semanticHtml: (el) => scoreMatches([
    isElement(el, ['dialog', 'div'])
  ]),
  computedStyle: (el) => scoreMatches([
    hasStyle(el, 'position', v => v === 'fixed'),
    hasStyle(el, 'zIndex', v => v && parseInt(v) > 1000)
  ]),
  visualSignature: (el) => scoreMatches([
    // High elevation shadow
    hasElevation(el, 'high'),
    // Rounded corners
    hasRoundedCorners(el, 'rounded'),
    // Centered positioning
    hasStyle(el, 'position', v => v === 'fixed'),
    // Entrance/exit animations
    hasInteractiveTransition(el)
  ]),
  frameworkPattern: (el) => scoreFrameworkMatch(el, 'shadcn/ui', 'Radix UI', 'Material UI', 'Headless UI', 'Ark UI', 'PrimeReact'),
  behavioralAnalysis: (el) => scoreBehavioralPatterns(el, 'dialog')
}

// Drawer Pattern
export const drawer: ComponentPattern = {
  cssSelector: (el) => scoreMatches([
    matchesSelector(el.selector, ['drawer', 'sidebar-overlay'])
  ]),
  ariaPattern: (el) => scoreMatches([
    hasAria(el, 'role', 'dialog')
  ]),
  computedStyle: (el) => scoreMatches([
    hasStyle(el, 'position', v => v === 'fixed'),
    hasStyle(el, 'transform', v => v && v.includes('translate'))
  ]),
  visualSignature: (el) => scoreMatches([
    // Slide transitions
    hasInteractiveTransition(el),
    // High elevation
    hasElevation(el, 'high'),
    // Fixed positioning from edge
    hasStyle(el, 'position', v => v === 'fixed')
  ]),
  frameworkPattern: (el) => scoreFrameworkMatch(el, 'shadcn/ui', 'Radix UI', 'Material UI', 'Chakra UI', 'Ant Design', 'Mantine'),
  behavioralAnalysis: (el) => scoreBehavioralPatterns(el, 'drawer')
}

// Dropdown Menu Pattern
export const dropdownMenu: ComponentPattern = {
  cssSelector: (el) => scoreMatches([
    matchesSelector(el.selector, ['dropdown', 'menu', 'dropdown-menu'])
  ]),
  ariaPattern: (el) => scoreMatches([
    hasAria(el, 'role', 'menu'),
    hasAria(el, 'role', 'menuitem')
  ]),
  computedStyle: (el) => scoreMatches([
    hasStyle(el, 'position', v => v === 'absolute' || v === 'fixed')
  ]),
  visualSignature: (el) => scoreMatches([
    // Medium elevation
    hasElevation(el, 'medium'),
    // Rounded corners
    hasRoundedCorners(el, 'rounded'),
    // Spacing scale
    matchesSpacingScale(el, 4) || matchesSpacingScale(el, 8)
  ]),
  frameworkPattern: (el) => scoreFrameworkMatch(el, 'shadcn/ui', 'Radix UI', 'Headless UI', 'Ant Design', 'PrimeReact'),
  behavioralAnalysis: (el) => scoreBehavioralPatterns(el, 'dropdown-menu')
}

// Form Pattern
export const form: ComponentPattern = {
  cssSelector: (el) => scoreMatches([
    matchesSelector(el.selector, ['form'])
  ]),
  semanticHtml: (el) => scoreMatches([
    isElement(el, ['form'])
  ]),
  visualSignature: (el) => scoreMatches([
    // Vertical flex layout
    isFlexContainer(el, 'column'),
    // Consistent spacing
    matchesSpacingScale(el, 16) || matchesSpacingScale(el, 24)
  ]),
  frameworkPattern: (el) => scoreFrameworkMatch(el, 'shadcn/ui', 'Radix UI', 'Material UI', 'Chakra UI', 'Ant Design', 'Mantine', 'PrimeReact'),
  behavioralAnalysis: (el) => scoreBehavioralPatterns(el, 'form')
}

// Hover Card Pattern
export const hoverCard: ComponentPattern = {
  cssSelector: (el) => scoreMatches([
    matchesSelector(el.selector, ['hover-card', 'popover'])
  ]),
  computedStyle: (el) => scoreMatches([
    hasStyle(el, 'position', v => v === 'absolute' || v === 'fixed')
  ]),
  visualSignature: (el) => scoreMatches([
    // Low to medium elevation
    hasElevation(el, 'low') || hasElevation(el, 'medium'),
    // Rounded corners
    hasRoundedCorners(el, 'rounded'),
    // Fade transitions
    hasInteractiveTransition(el)
  ]),
  frameworkPattern: (el) => scoreFrameworkMatch(el, 'shadcn/ui', 'Radix UI', 'Mantine'),
  behavioralAnalysis: (el) => scoreBehavioralPatterns(el, 'hover-card')
}

// Input Pattern
export const input: ComponentPattern = {
  cssSelector: (el) => scoreMatches([
    matchesSelector(el.selector, ['input', 'textfield', 'text-input'])
  ]),
  semanticHtml: (el) => scoreMatches([
    isElement(el, ['input']) && ['text', 'email', 'password', 'number'].includes(el.type)
  ]),
  computedStyle: (el) => scoreMatches([
    hasStyle(el, 'border', v => v && v !== 'none'),
    hasStyle(el, 'padding', v => v && v !== '0px')
  ]),
  visualSignature: (el) => scoreMatches([
    // Focus ring for accessibility
    hasFocusRing(el),
    // Rounded corners (subtle)
    hasRoundedCorners(el, 'rounded'),
    // Interactive transitions
    hasInteractiveTransition(el),
    // Consistent padding following spacing scale
    matchesSpacingScale(el, 4) || matchesSpacingScale(el, 8),
    // Body typography scale
    matchesTypographyScale(el, 'body')
  ]),
  frameworkPattern: (el) => scoreFrameworkMatch(el, 'shadcn/ui', 'Radix UI', 'Material UI', 'Chakra UI', 'Ant Design', 'Mantine', 'NextUI', 'PrimeReact'),
  behavioralAnalysis: (el) => scoreBehavioralPatterns(el, 'input')
}

// Input OTP Pattern
export const inputOtp: ComponentPattern = {
  cssSelector: (el) => scoreMatches([
    matchesSelector(el.selector, ['otp', 'pin', 'verification-code'])
  ]),
  semanticHtml: (el) => scoreMatches([
    isElement(el, ['input']) && (el.maxLength === 1 || el.inputMode === 'numeric')
  ]),
  visualSignature: (el) => scoreMatches([
    // Square or near-square aspect
    hasAspectRatio(el, '1:1'),
    // Focus ring
    hasFocusRing(el),
    // Rounded corners
    hasRoundedCorners(el, 'rounded')
  ]),
  frameworkPattern: (el) => scoreFrameworkMatch(el, 'shadcn/ui', 'Radix UI'),
  behavioralAnalysis: (el) => scoreBehavioralPatterns(el, 'input-otp')
}

// Label Pattern
export const label: ComponentPattern = {
  cssSelector: (el) => scoreMatches([
    matchesSelector(el.selector, ['label', 'form-label'])
  ]),
  semanticHtml: (el) => scoreMatches([
    isElement(el, ['label'])
  ]),
  visualSignature: (el) => scoreMatches([
    // Caption or body typography
    matchesTypographyScale(el, 'caption') || matchesTypographyScale(el, 'body'),
    // Small spacing
    matchesSpacingScale(el, 4) || matchesSpacingScale(el, 8)
  ]),
  frameworkPattern: (el) => scoreFrameworkMatch(el, 'shadcn/ui', 'Radix UI'),
  behavioralAnalysis: (el) => scoreBehavioralPatterns(el, 'label')
}

// Menubar Pattern
export const menubar: ComponentPattern = {
  cssSelector: (el) => scoreMatches([
    matchesSelector(el.selector, ['menubar', 'menu-bar'])
  ]),
  ariaPattern: (el) => scoreMatches([
    hasAria(el, 'role', 'menubar')
  ]),
  visualSignature: (el) => scoreMatches([
    // Horizontal flex layout
    isFlexContainer(el, 'row'),
    // Spacing scale
    matchesSpacingScale(el, 8) || matchesSpacingScale(el, 16)
  ]),
  frameworkPattern: (el) => scoreFrameworkMatch(el, 'shadcn/ui', 'Radix UI', 'PrimeReact'),
  behavioralAnalysis: (el) => scoreBehavioralPatterns(el, 'menubar')
}

// Navigation Menu Pattern
export const navigationMenu: ComponentPattern = {
  cssSelector: (el) => scoreMatches([
    matchesSelector(el.selector, ['nav', 'navigation', 'navbar'])
  ]),
  ariaPattern: (el) => scoreMatches([
    hasAria(el, 'role', 'navigation')
  ]),
  semanticHtml: (el) => scoreMatches([
    isElement(el, ['nav'])
  ]),
  visualSignature: (el) => scoreMatches([
    // Flex layout
    isFlexContainer(el),
    // Consistent spacing
    matchesSpacingScale(el, 16) || matchesSpacingScale(el, 24)
  ]),
  frameworkPattern: (el) => scoreFrameworkMatch(el, 'shadcn/ui', 'Radix UI'),
  behavioralAnalysis: (el) => scoreBehavioralPatterns(el, 'navigation-menu')
}

// Pagination Pattern
export const pagination: ComponentPattern = {
  cssSelector: (el) => scoreMatches([
    matchesSelector(el.selector, ['pagination', 'pager'])
  ]),
  ariaPattern: (el) => scoreMatches([
    hasAria(el, 'role', 'navigation'),
    hasAria(el, 'ariaLabel', 'pagination')
  ]),
  visualSignature: (el) => scoreMatches([
    // Horizontal flex layout
    isFlexContainer(el, 'row'),
    // Spacing scale
    matchesSpacingScale(el, 4) || matchesSpacingScale(el, 8)
  ]),
  frameworkPattern: (el) => scoreFrameworkMatch(el, 'shadcn/ui', 'Radix UI', 'Material UI', 'Chakra UI', 'Ant Design', 'Mantine', 'NextUI', 'PrimeReact'),
  behavioralAnalysis: (el) => scoreBehavioralPatterns(el, 'pagination')
}

// Popover Pattern
export const popover: ComponentPattern = {
  cssSelector: (el) => scoreMatches([
    matchesSelector(el.selector, ['popover', 'tooltip', 'dropdown'])
  ]),
  computedStyle: (el) => scoreMatches([
    hasStyle(el, 'position', v => v === 'absolute' || v === 'fixed')
  ]),
  visualSignature: (el) => scoreMatches([
    // Medium elevation
    hasElevation(el, 'medium'),
    // Rounded corners
    hasRoundedCorners(el, 'rounded'),
    // Fade transitions
    hasInteractiveTransition(el)
  ]),
  frameworkPattern: (el) => scoreFrameworkMatch(el, 'shadcn/ui', 'Radix UI', 'Headless UI', 'Chakra UI', 'Ant Design', 'Mantine', 'Ark UI'),
  behavioralAnalysis: (el) => scoreBehavioralPatterns(el, 'popover')
}

// Progress Pattern
export const progress: ComponentPattern = {
  cssSelector: (el) => scoreMatches([
    matchesSelector(el.selector, ['progress', 'progressbar'])
  ]),
  ariaPattern: (el) => scoreMatches([
    hasAria(el, 'role', 'progressbar'),
    hasAria(el, 'ariaValueNow')
  ]),
  semanticHtml: (el) => scoreMatches([
    isElement(el, ['progress', 'div'])
  ]),
  visualSignature: (el) => scoreMatches([
    // Rounded pill shape
    hasRoundedCorners(el, 'pill') || hasRoundedCorners(el, 'rounded'),
    // Smooth transitions
    hasInteractiveTransition(el),
    // Small height
    hasStyle(el, 'height', v => {
      const height = parseFloat(v)
      return height >= 4 && height <= 12
    })
  ]),
  frameworkPattern: (el) => scoreFrameworkMatch(el, 'shadcn/ui', 'Radix UI', 'Material UI', 'Chakra UI', 'Ant Design', 'Mantine', 'NextUI', 'PrimeReact'),
  behavioralAnalysis: (el) => scoreBehavioralPatterns(el, 'progress')
}

// Radio Group Pattern
export const radioGroup: ComponentPattern = {
  cssSelector: (el) => scoreMatches([
    matchesSelector(el.selector, ['radio', 'radio-group'])
  ]),
  ariaPattern: (el) => scoreMatches([
    hasAria(el, 'role', 'radio'),
    hasAria(el, 'role', 'radiogroup')
  ]),
  semanticHtml: (el) => scoreMatches([
    isElement(el, ['input']) && el.type === 'radio'
  ]),
  visualSignature: (el) => scoreMatches([
    // Circular shape
    hasRoundedCorners(el, 'circle'),
    // Interactive transitions
    hasInteractiveTransition(el),
    // Small size
    hasStyle(el, 'width', v => {
      const size = parseFloat(v)
      return size >= 16 && size <= 24
    })
  ]),
  frameworkPattern: (el) => scoreFrameworkMatch(el, 'shadcn/ui', 'Radix UI', 'Material UI', 'Chakra UI', 'Headless UI', 'Ant Design', 'Mantine', 'NextUI', 'Ark UI', 'PrimeReact'),
  behavioralAnalysis: (el) => scoreBehavioralPatterns(el, 'radio-group')
}

// Resizable Pattern
export const resizable: ComponentPattern = {
  cssSelector: (el) => scoreMatches([
    matchesSelector(el.selector, ['resizable', 'resize'])
  ]),
  computedStyle: (el) => scoreMatches([
    hasStyle(el, 'resize', v => v !== 'none')
  ]),
  visualSignature: (el) => scoreMatches([
    // Resize cursor
    hasStyle(el, 'cursor', v => v?.includes('resize'))
  ]),
  frameworkPattern: (el) => scoreFrameworkMatch(el, 'shadcn/ui', 'Radix UI'),
  behavioralAnalysis: (el) => scoreBehavioralPatterns(el, 'resizable')
}

// Scroll Area Pattern
export const scrollArea: ComponentPattern = {
  cssSelector: (el) => scoreMatches([
    matchesSelector(el.selector, ['scroll', 'scrollbar'])
  ]),
  computedStyle: (el) => scoreMatches([
    hasStyle(el, 'overflow', v => v === 'auto' || v === 'scroll'),
    hasStyle(el, 'overflowY', v => v === 'auto' || v === 'scroll')
  ]),
  visualSignature: (el) => scoreMatches([
    // Overflow behavior
    hasStyle(el, 'overflow', v => v === 'auto' || v === 'scroll'),
    // Rounded corners for modern scroll areas
    hasRoundedCorners(el, 'rounded')
  ]),
  frameworkPattern: (el) => scoreFrameworkMatch(el, 'shadcn/ui', 'Radix UI', 'Mantine'),
  behavioralAnalysis: (el) => scoreBehavioralPatterns(el, 'scroll-area')
}

// Select Pattern
export const select: ComponentPattern = {
  cssSelector: (el) => scoreMatches([
    matchesSelector(el.selector, ['select', 'dropdown'])
  ]),
  ariaPattern: (el) => scoreMatches([
    hasAria(el, 'role', 'combobox') || hasAria(el, 'role', 'listbox')
  ]),
  semanticHtml: (el) => scoreMatches([
    isElement(el, ['select'])
  ]),
  visualSignature: (el) => scoreMatches([
    // Focus ring
    hasFocusRing(el),
    // Rounded corners
    hasRoundedCorners(el, 'rounded'),
    // Interactive transitions
    hasInteractiveTransition(el)
  ]),
  frameworkPattern: (el) => scoreFrameworkMatch(el, 'shadcn/ui', 'Radix UI', 'Material UI', 'Chakra UI', 'Ant Design', 'Mantine', 'NextUI', 'Ark UI', 'PrimeReact'),
  behavioralAnalysis: (el) => scoreBehavioralPatterns(el, 'select')
}

// Separator Pattern
export const separator: ComponentPattern = {
  cssSelector: (el) => scoreMatches([
    matchesSelector(el.selector, ['separator', 'divider', 'hr'])
  ]),
  ariaPattern: (el) => scoreMatches([
    hasAria(el, 'role', 'separator')
  ]),
  semanticHtml: (el) => scoreMatches([
    isElement(el, ['hr', 'div'])
  ]),
  computedStyle: (el) => scoreMatches([
    hasStyle(el, 'height', v => v === '1px' || v === '2px'),
    hasStyle(el, 'width', v => v === '100%')
  ]),
  visualSignature: (el) => scoreMatches([
    // Thin height
    hasStyle(el, 'height', v => parseFloat(v) <= 2),
    // Full or near-full width
    hasStyle(el, 'width', v => v === '100%' || parseFloat(v) > 100)
  ]),
  frameworkPattern: (el) => scoreFrameworkMatch(el, 'shadcn/ui', 'Radix UI'),
  behavioralAnalysis: (el) => scoreBehavioralPatterns(el, 'separator')
}

// Sheet Pattern
export const sheet: ComponentPattern = {
  cssSelector: (el) => scoreMatches([
    matchesSelector(el.selector, ['sheet', 'bottom-sheet'])
  ]),
  ariaPattern: (el) => scoreMatches([
    hasAria(el, 'role', 'dialog')
  ]),
  computedStyle: (el) => scoreMatches([
    hasStyle(el, 'position', v => v === 'fixed')
  ]),
  visualSignature: (el) => scoreMatches([
    // Slide transitions
    hasInteractiveTransition(el),
    // High elevation
    hasElevation(el, 'high'),
    // Fixed positioning
    hasStyle(el, 'position', v => v === 'fixed')
  ]),
  frameworkPattern: (el) => scoreFrameworkMatch(el, 'shadcn/ui', 'Radix UI'),
  behavioralAnalysis: (el) => scoreBehavioralPatterns(el, 'sheet')
}

// Sidebar Pattern
export const sidebar: ComponentPattern = {
  cssSelector: (el) => scoreMatches([
    matchesSelector(el.selector, ['sidebar', 'side-nav'])
  ]),
  ariaPattern: (el) => scoreMatches([
    hasAria(el, 'role', 'navigation') || hasAria(el, 'role', 'complementary')
  ]),
  semanticHtml: (el) => scoreMatches([
    isElement(el, ['aside', 'nav', 'div'])
  ]),
  visualSignature: (el) => scoreMatches([
    // Vertical flex layout
    isFlexContainer(el, 'column'),
    // Consistent spacing
    matchesSpacingScale(el, 16) || matchesSpacingScale(el, 24)
  ]),
  frameworkPattern: (el) => scoreFrameworkMatch(el, 'shadcn/ui', 'Radix UI'),
  behavioralAnalysis: (el) => scoreBehavioralPatterns(el, 'sidebar')
}

// Skeleton Pattern
export const skeleton: ComponentPattern = {
  cssSelector: (el) => scoreMatches([
    matchesSelector(el.selector, ['skeleton', 'loading', 'placeholder'])
  ]),
  ariaPattern: (el) => scoreMatches([
    hasAria(el, 'ariaLabel', 'loading') || hasAria(el, 'ariaBusy', 'true')
  ]),
  computedStyle: (el) => scoreMatches([
    hasStyle(el, 'animation', v => v && v !== 'none')
  ]),
  visualSignature: (el) => scoreMatches([
    // Pulse or shimmer animations
    hasStyle(el, 'animation', v => v && v !== 'none'),
    // Rounded corners
    hasRoundedCorners(el, 'rounded')
  ]),
  frameworkPattern: (el) => scoreFrameworkMatch(el, 'shadcn/ui', 'Radix UI', 'Chakra UI', 'Ant Design', 'Mantine', 'NextUI'),
  behavioralAnalysis: (el) => scoreBehavioralPatterns(el, 'skeleton')
}

// Slider Pattern
export const slider: ComponentPattern = {
  cssSelector: (el) => scoreMatches([
    matchesSelector(el.selector, ['slider', 'range'])
  ]),
  ariaPattern: (el) => scoreMatches([
    hasAria(el, 'role', 'slider'),
    hasAria(el, 'ariaValueNow')
  ]),
  semanticHtml: (el) => scoreMatches([
    isElement(el, ['input']) && el.type === 'range'
  ]),
  visualSignature: (el) => scoreMatches([
    // Interactive transitions
    hasInteractiveTransition(el),
    // Rounded pill track
    hasRoundedCorners(el, 'pill')
  ]),
  frameworkPattern: (el) => scoreFrameworkMatch(el, 'shadcn/ui', 'Radix UI', 'Material UI', 'Chakra UI', 'Ant Design', 'Mantine', 'NextUI', 'Ark UI', 'PrimeReact'),
  behavioralAnalysis: (el) => scoreBehavioralPatterns(el, 'slider')
}

// Sonner (Toast) Pattern
export const sonner: ComponentPattern = {
  cssSelector: (el) => scoreMatches([
    matchesSelector(el.selector, ['sonner', 'toast', 'notification'])
  ]),
  ariaPattern: (el) => scoreMatches([
    hasAria(el, 'role', 'status') || hasAria(el, 'role', 'alert')
  ]),
  computedStyle: (el) => scoreMatches([
    hasStyle(el, 'position', v => v === 'fixed')
  ]),
  visualSignature: (el) => scoreMatches([
    // Medium elevation
    hasElevation(el, 'medium'),
    // Rounded corners
    hasRoundedCorners(el, 'rounded'),
    // Slide/fade transitions
    hasInteractiveTransition(el)
  ]),
  frameworkPattern: (el) => scoreFrameworkMatch(el, 'shadcn/ui', 'Radix UI'),
  behavioralAnalysis: (el) => scoreBehavioralPatterns(el, 'sonner')
}

// Switch Pattern
export const switchPattern: ComponentPattern = {
  cssSelector: (el) => scoreMatches([
    matchesSelector(el.selector, ['switch', 'toggle'])
  ]),
  ariaPattern: (el) => scoreMatches([
    hasAria(el, 'role', 'switch'),
    hasAria(el, 'ariaChecked')
  ]),
  visualSignature: (el) => scoreMatches([
    // Pill shape
    hasRoundedCorners(el, 'pill'),
    // Interactive transitions
    hasInteractiveTransition(el),
    // Compact size
    hasStyle(el, 'width', v => {
      const width = parseFloat(v)
      return width >= 32 && width <= 56
    })
  ]),
  frameworkPattern: (el) => scoreFrameworkMatch(el, 'shadcn/ui', 'Radix UI', 'Material UI', 'Chakra UI', 'Headless UI', 'Ant Design', 'Mantine', 'NextUI', 'Ark UI', 'PrimeReact'),
  behavioralAnalysis: (el) => scoreBehavioralPatterns(el, 'switch')
}

// Table Pattern
export const table: ComponentPattern = {
  cssSelector: (el) => scoreMatches([
    matchesSelector(el.selector, ['table'])
  ]),
  ariaPattern: (el) => scoreMatches([
    hasAria(el, 'role', 'table')
  ]),
  semanticHtml: (el) => scoreMatches([
    isElement(el, ['table'])
  ]),
  visualSignature: (el) => scoreMatches([
    // Spacing scale for cells
    matchesSpacingScale(el, 8) || matchesSpacingScale(el, 16),
    // Borders
    hasStyle(el, 'borderWidth', v => !!v && v !== '0px')
  ]),
  frameworkPattern: (el) => scoreFrameworkMatch(el, 'shadcn/ui', 'Radix UI', 'Material UI', 'Chakra UI', 'Ant Design', 'Mantine', 'NextUI', 'PrimeReact'),
  behavioralAnalysis: (el) => scoreBehavioralPatterns(el, 'table')
}

// Tabs Pattern
export const tabs: ComponentPattern = {
  cssSelector: (el) => scoreMatches([
    matchesSelector(el.selector, ['tabs', 'tab'])
  ]),
  ariaPattern: (el) => scoreMatches([
    hasAria(el, 'role', 'tab') || hasAria(el, 'role', 'tablist'),
    hasAria(el, 'ariaSelected')
  ]),
  visualSignature: (el) => scoreMatches([
    // Horizontal flex layout
    isFlexContainer(el, 'row'),
    // Interactive transitions
    hasInteractiveTransition(el),
    // Spacing scale
    matchesSpacingScale(el, 8) || matchesSpacingScale(el, 16)
  ]),
  frameworkPattern: (el) => scoreFrameworkMatch(el, 'shadcn/ui', 'Radix UI', 'Material UI', 'Chakra UI', 'Headless UI', 'Ant Design', 'Mantine', 'NextUI', 'Ark UI', 'PrimeReact'),
  behavioralAnalysis: (el) => scoreBehavioralPatterns(el, 'tabs')
}

// Textarea Pattern
export const textarea: ComponentPattern = {
  cssSelector: (el) => scoreMatches([
    matchesSelector(el.selector, ['textarea'])
  ]),
  semanticHtml: (el) => scoreMatches([
    isElement(el, ['textarea'])
  ]),
  computedStyle: (el) => scoreMatches([
    hasStyle(el, 'resize', v => v && v !== 'none')
  ]),
  visualSignature: (el) => scoreMatches([
    // Focus ring
    hasFocusRing(el),
    // Rounded corners
    hasRoundedCorners(el, 'rounded'),
    // Resizable cursor
    hasStyle(el, 'resize', v => v !== 'none'),
    // Spacing scale
    matchesSpacingScale(el, 8) || matchesSpacingScale(el, 12)
  ]),
  frameworkPattern: (el) => scoreFrameworkMatch(el, 'shadcn/ui', 'Radix UI', 'Material UI', 'Chakra UI', 'Ant Design', 'Mantine', 'NextUI', 'PrimeReact'),
  behavioralAnalysis: (el) => scoreBehavioralPatterns(el, 'textarea')
}

// Toast Pattern
export const toast: ComponentPattern = {
  cssSelector: (el) => scoreMatches([
    matchesSelector(el.selector, ['toast', 'notification', 'snackbar'])
  ]),
  ariaPattern: (el) => scoreMatches([
    hasAria(el, 'role', 'status') || hasAria(el, 'role', 'alert'),
    hasAria(el, 'ariaLive')
  ]),
  computedStyle: (el) => scoreMatches([
    hasStyle(el, 'position', v => v === 'fixed')
  ]),
  visualSignature: (el) => scoreMatches([
    // Medium elevation
    hasElevation(el, 'medium'),
    // Rounded corners
    hasRoundedCorners(el, 'rounded'),
    // Slide/fade transitions
    hasInteractiveTransition(el)
  ]),
  frameworkPattern: (el) => scoreFrameworkMatch(el, 'shadcn/ui', 'Radix UI', 'Chakra UI', 'PrimeReact'),
  behavioralAnalysis: (el) => scoreBehavioralPatterns(el, 'toast')
}

// Toggle Pattern
export const toggle: ComponentPattern = {
  cssSelector: (el) => scoreMatches([
    matchesSelector(el.selector, ['toggle'])
  ]),
  ariaPattern: (el) => scoreMatches([
    hasAria(el, 'ariaPressed')
  ]),
  visualSignature: (el) => scoreMatches([
    // Interactive transitions
    hasInteractiveTransition(el),
    // Rounded corners
    hasRoundedCorners(el, 'rounded'),
    // Padding similar to buttons
    hasPaddingRatio(el, { x: 2, y: 1 }) || hasPaddingRatio(el, { x: 3, y: 1 })
  ]),
  frameworkPattern: (el) => scoreFrameworkMatch(el, 'shadcn/ui', 'Radix UI', 'Material UI'),
  behavioralAnalysis: (el) => scoreBehavioralPatterns(el, 'toggle')
}

// Toggle Group Pattern
export const toggleGroup: ComponentPattern = {
  cssSelector: (el) => scoreMatches([
    matchesSelector(el.selector, ['toggle-group'])
  ]),
  ariaPattern: (el) => scoreMatches([
    hasAria(el, 'role', 'group')
  ]),
  visualSignature: (el) => scoreMatches([
    // Horizontal flex layout
    isFlexContainer(el, 'row'),
    // Rounded corners for group
    hasRoundedCorners(el, 'rounded'),
    // Spacing scale
    matchesSpacingScale(el, 4) || matchesSpacingScale(el, 8)
  ]),
  frameworkPattern: (el) => scoreFrameworkMatch(el, 'shadcn/ui', 'Radix UI'),
  behavioralAnalysis: (el) => scoreBehavioralPatterns(el, 'toggle-group')
}

// Tooltip Pattern
export const tooltip: ComponentPattern = {
  cssSelector: (el) => scoreMatches([
    matchesSelector(el.selector, ['tooltip', 'hint'])
  ]),
  ariaPattern: (el) => scoreMatches([
    hasAria(el, 'role', 'tooltip')
  ]),
  computedStyle: (el) => scoreMatches([
    hasStyle(el, 'position', v => v === 'absolute' || v === 'fixed'),
    hasStyle(el, 'fontSize', v => v && parseFloat(v) < 14)
  ]),
  visualSignature: (el) => scoreMatches([
    // Small typography
    matchesTypographyScale(el, 'caption'),
    // Subtle elevation
    hasElevation(el, 'low') || hasElevation(el, 'medium'),
    // Rounded corners
    hasRoundedCorners(el, 'rounded'),
    // Compact padding
    matchesSpacingScale(el, 4),
    // Fade in/out animations
    hasInteractiveTransition(el)
  ]),
  frameworkPattern: (el) => scoreFrameworkMatch(el, 'shadcn/ui', 'Radix UI', 'Material UI', 'Chakra UI', 'Ant Design', 'Mantine', 'NextUI', 'Ark UI', 'PrimeReact'),
  behavioralAnalysis: (el) => scoreBehavioralPatterns(el, 'tooltip')
}

// Typography Pattern
export const typography: ComponentPattern = {
  cssSelector: (el) => scoreMatches([
    matchesSelector(el.selector, ['heading', 'title', 'text', 'paragraph'])
  ]),
  semanticHtml: (el) => scoreMatches([
    isElement(el, ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'span', 'div'])
  ]),
  computedStyle: (el) => scoreMatches([
    hasStyle(el, 'fontFamily', v => !!v),
    hasStyle(el, 'fontSize', v => !!v)
  ]),
  visualSignature: (el) => scoreMatches([
    // Clear typography scale
    matchesTypographyScale(el, 'heading') || matchesTypographyScale(el, 'body') || matchesTypographyScale(el, 'caption'),
    // Truncation for long text
    hasTruncation(el),
    // Line height for readability
    hasStyle(el, 'lineHeight', v => !!v && parseFloat(v) >= 1.2)
  ]),
  frameworkPattern: (el) => scoreFrameworkMatch(el, 'shadcn/ui', 'Radix UI'),
  behavioralAnalysis: (el) => scoreBehavioralPatterns(el, 'typography')
}

// Export all patterns
export const patterns = {
  accordion,
  alert,
  'alert-dialog': alertDialog,
  'aspect-ratio': aspectRatio,
  avatar,
  badge,
  breadcrumb,
  button,
  calendar,
  card,
  carousel,
  chart,
  checkbox,
  collapsible,
  combobox,
  command,
  'context-menu': contextMenu,
  'data-table': dataTable,
  'date-picker': datePicker,
  dialog,
  drawer,
  'dropdown-menu': dropdownMenu,
  form,
  'hover-card': hoverCard,
  input,
  'input-otp': inputOtp,
  label,
  menubar,
  'navigation-menu': navigationMenu,
  pagination,
  popover,
  progress,
  'radio-group': radioGroup,
  resizable,
  'scroll-area': scrollArea,
  select,
  separator,
  sheet,
  sidebar,
  skeleton,
  slider,
  sonner,
  switch: switchPattern,
  table,
  tabs,
  textarea,
  toast,
  toggle,
  'toggle-group': toggleGroup,
  tooltip,
  typography
}
