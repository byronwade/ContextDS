import { test, expect } from '@playwright/test';

/**
 * Visual Regression Testing
 *
 * Captures screenshots and compares against baselines
 */

test.describe('Visual Regression - Homepage', () => {
	test('homepage should match baseline', async ({ page }) => {
		await page.goto('/');
		await page.waitForLoadState('networkidle');

		// Take full page screenshot
		await expect(page).toHaveScreenshot('homepage-full.png', {
			fullPage: true,
			mask: [page.locator('[data-dynamic]')], // Mask dynamic content
		});
	});

	test('homepage should match baseline on mobile', async ({ page }) => {
		await page.setViewportSize({ width: 375, height: 667 });
		await page.goto('/');
		await page.waitForLoadState('networkidle');

		await expect(page).toHaveScreenshot('homepage-mobile.png', {
			fullPage: true,
		});
	});
});

test.describe('Visual Regression - Scanner Results', () => {
	test('scanner results should display consistently', async ({ page }) => {
		test.slow();

		await page.goto('/');

		const urlInput = page.getByPlaceholder(/enter a website url/i);
		await urlInput.fill('https://example.com');

		const scanButton = page.getByRole('button', { name: /scan/i });
		await scanButton.click();

		// Wait for results
		await page.waitForSelector('text=/tokens|results/i', { timeout: 60000 });
		await page.waitForLoadState('networkidle');

		// Screenshot just the results area
		const resultsSection = page.locator('[data-testid="scan-results"]').or(page.locator('main'));
		await expect(resultsSection).toHaveScreenshot('scanner-results.png');
	});
});

test.describe('Visual Regression - Directory', () => {
	test('directory page should match baseline', async ({ page }) => {
		await page.goto('/directory');
		await page.waitForLoadState('networkidle');

		await expect(page).toHaveScreenshot('directory-full.png', {
			fullPage: true,
			mask: [
				page.locator('time'), // Mask timestamps
				page.locator('[data-dynamic]'),
			],
		});
	});

	test('directory search should display consistently', async ({ page }) => {
		await page.goto('/directory');

		const searchInput = page.getByPlaceholder(/search/i);
		await searchInput.fill('example');

		await page.waitForLoadState('networkidle');

		await expect(page).toHaveScreenshot('directory-search.png', {
			mask: [page.locator('time')],
		});
	});
});

test.describe('Visual Regression - Components', () => {
	test('font preview component should render consistently', async ({ page }) => {
		await page.goto('/');

		const urlInput = page.getByPlaceholder(/enter a website url/i);
		await urlInput.fill('https://example.com');

		const scanButton = page.getByRole('button', { name: /scan/i });
		await scanButton.click();

		await page.waitForSelector('text=/tokens|results/i', { timeout: 60000 });

		// Find typography section
		const typographySection = page.locator('text=typography').locator('..').locator('..');
		if (await typographySection.isVisible()) {
			await expect(typographySection).toHaveScreenshot('typography-section.png');
		}
	});

	test('color palette should render consistently', async ({ page }) => {
		await page.goto('/');

		const urlInput = page.getByPlaceholder(/enter a website url/i);
		await urlInput.fill('https://example.com');

		const scanButton = page.getByRole('button', { name: /scan/i });
		await scanButton.click();

		await page.waitForSelector('text=/tokens|results/i', { timeout: 60000 });

		// Find colors section
		const colorsSection = page.locator('text=colors').locator('..').locator('..');
		if (await colorsSection.isVisible()) {
			await expect(colorsSection).toHaveScreenshot('colors-section.png');
		}
	});
});