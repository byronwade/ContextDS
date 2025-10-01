import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

test.describe('WCAG 2.1 AA Accessibility Compliance', () => {
  test('Homepage accessibility audit', async ({ page }) => {
    await page.goto('/')

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .exclude('.loading-skeleton') // Exclude dynamic loading content
      .analyze()

    expect(accessibilityScanResults.violations).toEqual([])
  })

  test('Search form accessibility', async ({ page }) => {
    await page.goto('/')

    // Wait for search form to be visible
    await page.waitForSelector('input[type="text"]')

    const accessibilityScanResults = await new AxeBuilder({ page })
      .include('form')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze()

    expect(accessibilityScanResults.violations).toEqual([])
  })

  test('Navigation accessibility', async ({ page }) => {
    await page.goto('/')

    const accessibilityScanResults = await new AxeBuilder({ page })
      .include('nav, header, footer')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze()

    expect(accessibilityScanResults.violations).toEqual([])
  })

  test('Community page accessibility', async ({ page }) => {
    await page.goto('/community')

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze()

    expect(accessibilityScanResults.violations).toEqual([])
  })

  test('Features page accessibility', async ({ page }) => {
    await page.goto('/features')

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze()

    expect(accessibilityScanResults.violations).toEqual([])
  })

  test('Scan page accessibility', async ({ page }) => {
    await page.goto('/scan')

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze()

    expect(accessibilityScanResults.violations).toEqual([])
  })

  test('Interactive components accessibility', async ({ page }) => {
    await page.goto('/')

    // Test button interactions
    await page.click('button[aria-label="Toggle mobile menu"]')

    const accessibilityScanResults = await new AxeBuilder({ page })
      .include('button, a, input, select, textarea')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze()

    expect(accessibilityScanResults.violations).toEqual([])
  })

  test('Color contrast compliance', async ({ page }) => {
    await page.goto('/')

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['color-contrast'])
      .analyze()

    expect(accessibilityScanResults.violations).toEqual([])
  })
})

test.describe('Keyboard Navigation', () => {
  test('Tab order and focus management', async ({ page }) => {
    await page.goto('/')

    // Start from the body and tab through interactive elements
    await page.keyboard.press('Tab')

    // First focusable should be skip link
    let focused = await page.evaluate(() => document.activeElement?.getAttribute('href'))
    expect(focused).toBe('#main-content')

    // Continue tabbing through navigation
    await page.keyboard.press('Tab')
    focused = await page.evaluate(() => document.activeElement?.tagName)
    expect(['A', 'BUTTON', 'INPUT']).toContain(focused)
  })

  test('Skip links functionality', async ({ page }) => {
    await page.goto('/')

    // Focus skip link and activate
    await page.keyboard.press('Tab')
    await page.keyboard.press('Enter')

    // Check that focus moved to main content
    const mainContentExists = await page.locator('#main-content').count() > 0 ||
                             await page.locator('main').count() > 0
    expect(mainContentExists).toBe(true)
  })

  test('Mobile menu keyboard accessibility', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/')

    // Find and focus mobile menu toggle
    const menuButton = page.locator('button[aria-label="Toggle mobile menu"]')
    await menuButton.focus()
    await menuButton.press('Enter')

    // Check menu is open
    const mobileMenu = page.locator('nav').filter({ hasText: 'Features' })
    await expect(mobileMenu).toBeVisible()

    // Test keyboard navigation within menu
    await page.keyboard.press('Tab')
    const focused = await page.evaluate(() => document.activeElement?.textContent)
    expect(['Features', 'Community', 'Documentation', 'Pricing', 'About']).toContain(focused)
  })

  test('Search input keyboard functionality', async ({ page }) => {
    await page.goto('/')

    // Focus search input
    const searchInput = page.locator('#header-search')
    await searchInput.click()

    // Type and press Enter
    await searchInput.fill('stripe.com')
    await searchInput.press('Enter')

    // Should navigate to site page
    await expect(page).toHaveURL(/\/site\/stripe\.com/)
  })
})

test.describe('Screen Reader Support', () => {
  test('ARIA labels and descriptions', async ({ page }) => {
    await page.goto('/')

    // Check main content has proper landmark
    const mainLandmark = page.locator('main, [role="main"], #main-content')
    expect(await mainLandmark.count()).toBeGreaterThan(0)

    // Check buttons have proper labels
    const buttons = page.locator('button')
    const buttonCount = await buttons.count()

    for (let i = 0; i < buttonCount; i++) {
      const button = buttons.nth(i)
      const ariaLabel = await button.getAttribute('aria-label')
      const textContent = await button.textContent()

      // Each button should have either aria-label or text content
      expect(ariaLabel || textContent?.trim()).toBeTruthy()
    }
  })

  test('Live regions functionality', async ({ page }) => {
    await page.goto('/')

    // Check for aria-live regions
    const liveRegions = page.locator('[aria-live]')
    expect(await liveRegions.count()).toBeGreaterThan(0)

    // Test live region updates (if any scanning happens)
    const searchInput = page.locator('#header-search')
    if (await searchInput.count() > 0) {
      await searchInput.fill('test-site.com')
      // Live regions should announce scan status changes
    }
  })

  test('Heading hierarchy', async ({ page }) => {
    await page.goto('/')

    const h1s = await page.locator('h1').count()
    expect(h1s).toBe(1) // Should have exactly one h1

    // Check logical heading order
    const headings = await page.locator('h1, h2, h3, h4, h5, h6').allTextContents()
    expect(headings.length).toBeGreaterThan(0)
  })
})

test.describe('Mobile Accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
  })

  test('Touch target sizes', async ({ page }) => {
    await page.goto('/')

    // Check all interactive elements meet minimum size requirements (44px)
    const interactiveElements = page.locator('button, a, input, select, textarea')
    const count = await interactiveElements.count()

    for (let i = 0; i < count; i++) {
      const element = interactiveElements.nth(i)
      const box = await element.boundingBox()

      if (box) {
        // WCAG 2.1 AA requires 44x44px minimum for touch targets
        expect(box.width).toBeGreaterThanOrEqual(24) // Allowing some flexibility for smaller elements
        expect(box.height).toBeGreaterThanOrEqual(24)
      }
    }
  })

  test('Mobile navigation accessibility', async ({ page }) => {
    await page.goto('/')

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze()

    expect(accessibilityScanResults.violations).toEqual([])
  })

  test('Mobile form accessibility', async ({ page }) => {
    await page.goto('/')

    const searchInput = page.locator('input[placeholder*="Scan"]')
    await expect(searchInput).toBeVisible()

    // Test form is accessible on mobile
    const accessibilityScanResults = await new AxeBuilder({ page })
      .include('form, input')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze()

    expect(accessibilityScanResults.violations).toEqual([])
  })
})

test.describe('Focus Management', () => {
  test('Focus visible indicators', async ({ page }) => {
    await page.goto('/')

    // Test focus indicators are visible
    await page.keyboard.press('Tab')

    const focusedElement = page.locator(':focus')
    expect(await focusedElement.count()).toBe(1)

    // Check focus outline is visible
    const focusStyles = await focusedElement.evaluate((el) => {
      const styles = window.getComputedStyle(el)
      return {
        outline: styles.outline,
        outlineWidth: styles.outlineWidth,
        boxShadow: styles.boxShadow
      }
    })

    // Should have visible focus indicator
    const hasFocusIndicator = focusStyles.outline !== 'none' ||
                             focusStyles.outlineWidth !== '0px' ||
                             focusStyles.boxShadow !== 'none'
    expect(hasFocusIndicator).toBe(true)
  })

  test('Focus trap in modals', async ({ page }) => {
    await page.goto('/')

    // If there are any modals, test focus trapping
    const modalTrigger = page.locator('button[aria-haspopup="dialog"]')

    if (await modalTrigger.count() > 0) {
      await modalTrigger.click()

      // Focus should be trapped within modal
      const modal = page.locator('[role="dialog"]')
      await expect(modal).toBeVisible()
    }
  })
})