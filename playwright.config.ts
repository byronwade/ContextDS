import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright Configuration for ContextDS Scanner Testing
 *
 * Testing Strategy:
 * 1. E2E tests - Full user flows through the UI
 * 2. API tests - Direct endpoint validation
 * 3. Stress tests - Concurrent load testing with real websites
 * 4. Visual regression - Screenshot comparison for consistency
 */
export default defineConfig({
	testDir: './tests/e2e',
	fullyParallel: true,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 2 : 0,
	workers: process.env.CI ? 2 : undefined,
	reporter: [
		['html', { outputFolder: 'tests/reports/html' }],
		['json', { outputFile: 'tests/reports/results.json' }],
		['junit', { outputFile: 'tests/reports/junit.xml' }],
		['list'],
	],

	use: {
		baseURL: process.env.BASE_URL || 'http://localhost:3000',
		trace: 'retain-on-failure',
		screenshot: 'only-on-failure',
		video: 'retain-on-failure',
		actionTimeout: 30000,
	},

	projects: [
		// Desktop browsers
		{
			name: 'chromium',
			use: { ...devices['Desktop Chrome'] },
		},
		{
			name: 'firefox',
			use: { ...devices['Desktop Firefox'] },
		},
		{
			name: 'webkit',
			use: { ...devices['Desktop Safari'] },
		},

		// Mobile devices
		{
			name: 'mobile-chrome',
			use: { ...devices['Pixel 5'] },
		},
		{
			name: 'mobile-safari',
			use: { ...devices['iPhone 13'] },
		},

		// Stress testing project with extended timeouts
		{
			name: 'stress-test',
			testMatch: /.*stress.*\.spec\.ts|.*performance.*\.spec\.ts/,
			use: {
				...devices['Desktop Chrome'],
				actionTimeout: 300000, // 5 minutes for large sites
				navigationTimeout: 300000,
			},
			retries: 0, // Don't retry stress tests
			timeout: 1800000, // 30 minutes per test (for soak tests)
		},

		// API-only testing (no browser)
		{
			name: 'api',
			testMatch: /.*api\.spec\.ts/,
			use: {
				baseURL: process.env.BASE_URL || 'http://localhost:3000',
			},
		},
	],

	// Web server for development testing
	webServer: {
		command: 'bun dev',
		url: 'http://localhost:3000',
		reuseExistingServer: !process.env.CI,
		timeout: 120000,
		env: {
			NODE_ENV: 'test',
		},
	},

	// Output settings
	outputDir: 'tests/reports/artifacts',
	preserveOutput: 'failures-only',

	// Global timeout
	timeout: 120000,
	expect: {
		timeout: 10000,
	},
});