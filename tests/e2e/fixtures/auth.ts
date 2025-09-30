import { test as base } from '@playwright/test';

/**
 * Playwright Test Fixtures for Authentication
 *
 * Provides authenticated test contexts for protected routes
 */

type AuthFixtures = {
	authenticatedPage: any;
	authenticatedRequest: any;
};

export const test = base.extend<AuthFixtures>({
	authenticatedPage: async ({ page }, use) => {
		// Setup authentication state
		// This would be customized based on your auth provider
		await page.goto('/');

		// Check if already authenticated
		const isAuthenticated = await page.locator('[data-authenticated]').isVisible().catch(() => false);

		if (!isAuthenticated) {
			// Perform login if needed
			// await page.goto('/login');
			// await page.fill('[name="email"]', 'test@example.com');
			// await page.fill('[name="password"]', 'password');
			// await page.click('button[type="submit"]');
			// await page.waitForURL('/dashboard');
		}

		await use(page);
	},

	authenticatedRequest: async ({ request }, use) => {
		// Setup authenticated API client
		// Add auth headers if needed
		await use(request);
	},
});

export { expect } from '@playwright/test';