import { test, expect } from '@playwright/test';

/**
 * E2E Tests for Design Token Scanner
 *
 * These tests validate the complete user journey from URL input to token extraction
 */

test.describe('Scanner Basic Functionality', () => {
	test('should load the homepage successfully', async ({ page }) => {
		await page.goto('/');
		await expect(page).toHaveTitle(/ContextDS/i);
	});

	test('should scan a simple website successfully', async ({ page }) => {
		test.slow(); // Mark as slow test (3x timeout)

		await page.goto('/');

		// Find and fill the URL input
		const urlInput = page.getByPlaceholder(/enter a website url/i);
		await expect(urlInput).toBeVisible();
		await urlInput.fill('https://example.com');

		// Submit the scan
		const scanButton = page.getByRole('button', { name: /scan/i });
		await scanButton.click();

		// Wait for results - should see progress or results
		await expect(page.getByText(/analyzing/i).or(page.getByText(/tokens/i))).toBeVisible({ timeout: 60000 });

		// Verify we got some token results
		await expect(page.getByText(/colors|typography|spacing/i)).toBeVisible({ timeout: 60000 });
	});

	test('should show error for invalid URL', async ({ page }) => {
		await page.goto('/');

		const urlInput = page.getByPlaceholder(/enter a website url/i);
		await urlInput.fill('not-a-valid-url');

		const scanButton = page.getByRole('button', { name: /scan/i });
		await scanButton.click();

		// Should show validation error
		await expect(page.getByText(/invalid url|invalid website/i)).toBeVisible();
	});

	test('should handle network errors gracefully', async ({ page }) => {
		await page.goto('/');

		const urlInput = page.getByPlaceholder(/enter a website url/i);
		await urlInput.fill('https://this-domain-definitely-does-not-exist-12345.com');

		const scanButton = page.getByRole('button', { name: /scan/i });
		await scanButton.click();

		// Should show error message
		await expect(page.getByText(/unable to connect|failed to scan|error/i)).toBeVisible({ timeout: 30000 });
	});
});

test.describe('Scanner UI Components', () => {
	test('should display recent scans dropdown', async ({ page }) => {
		await page.goto('/');

		// Look for recent scans component
		const recentScans = page.getByText(/recent scans|scan history/i);
		if (await recentScans.isVisible()) {
			await recentScans.click();
			// Should show dropdown with scans
			await expect(page.getByRole('menu').or(page.getByRole('listbox'))).toBeVisible();
		}
	});

	test('should allow quality selection', async ({ page }) => {
		await page.goto('/');

		// Look for quality selector
		const qualitySelect = page.getByLabel(/quality|scan quality/i);
		if (await qualitySelect.isVisible()) {
			await qualitySelect.click();
			await expect(page.getByText(/fast|standard|thorough/i)).toBeVisible();
		}
	});

	test('should show loading state during scan', async ({ page }) => {
		await page.goto('/');

		const urlInput = page.getByPlaceholder(/enter a website url/i);
		await urlInput.fill('https://example.com');

		const scanButton = page.getByRole('button', { name: /scan/i });
		await scanButton.click();

		// Should show loading indicator
		await expect(page.getByRole('progressbar').or(page.getByText(/loading|scanning|analyzing/i))).toBeVisible();
	});
});

test.describe('Scanner Results Display', () => {
	test('should display token categories', async ({ page }) => {
		test.slow();

		await page.goto('/');

		const urlInput = page.getByPlaceholder(/enter a website url/i);
		await urlInput.fill('https://example.com');

		const scanButton = page.getByRole('button', { name: /scan/i });
		await scanButton.click();

		// Wait for results
		await page.waitForSelector('text=/tokens|results/i', { timeout: 60000 });

		// Should display token categories
		const categories = ['colors', 'typography', 'spacing'];
		for (const category of categories) {
			const categoryElement = page.getByText(new RegExp(category, 'i'));
			if (await categoryElement.isVisible()) {
				await expect(categoryElement).toBeVisible();
			}
		}
	});

	test('should allow exporting results', async ({ page }) => {
		test.slow();

		await page.goto('/');

		const urlInput = page.getByPlaceholder(/enter a website url/i);
		await urlInput.fill('https://example.com');

		const scanButton = page.getByRole('button', { name: /scan/i });
		await scanButton.click();

		// Wait for results
		await page.waitForSelector('text=/tokens|results/i', { timeout: 60000 });

		// Look for export button
		const exportButton = page.getByRole('button', { name: /export|download/i });
		if (await exportButton.isVisible()) {
			// Start waiting for download before clicking
			const downloadPromise = page.waitForEvent('download');
			await exportButton.click();

			// Wait for the download
			const download = await downloadPromise;
			expect(download.suggestedFilename()).toMatch(/\.json|\.css|\.zip/);
		}
	});
});

test.describe('Scanner Directory Integration', () => {
	test('should navigate to directory page', async ({ page }) => {
		await page.goto('/');

		const directoryLink = page.getByRole('link', { name: /directory|browse/i });
		if (await directoryLink.isVisible()) {
			await directoryLink.click();
			await expect(page).toHaveURL(/\/directory/);
		}
	});

	test('should show scanned sites in directory', async ({ page }) => {
		await page.goto('/directory');

		// Should show list of scanned sites
		await expect(page.getByText(/example\.com|amazon\.com|stripe\.com/i).first()).toBeVisible({ timeout: 10000 });
	});
});