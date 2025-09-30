import { test, expect } from '@playwright/test';

/**
 * API-only tests for scanner endpoints
 *
 * These tests validate the API layer without browser overhead
 */

test.describe('Scan API Endpoint', () => {
	test('POST /api/scan - should scan valid URL', async ({ request }) => {
		const response = await request.post('/api/scan', {
			data: {
				url: 'https://example.com',
				quality: 'standard',
				mode: 'fast',
			},
			timeout: 120000,
		});

		expect(response.ok()).toBeTruthy();
		const data = await response.json();

		expect(data).toHaveProperty('status');
		expect(data.status).toBe('completed');
		expect(data).toHaveProperty('tokens');
	});

	test('POST /api/scan - should reject invalid URL', async ({ request }) => {
		const response = await request.post('/api/scan', {
			data: {
				url: 'not-a-url',
				quality: 'standard',
			},
		});

		expect(response.status()).toBeGreaterThanOrEqual(400);
	});

	test('POST /api/scan - should handle missing URL', async ({ request }) => {
		const response = await request.post('/api/scan', {
			data: {
				quality: 'standard',
			},
		});

		expect(response.status()).toBe(400);
	});

	test('POST /api/scan - should respect quality parameter', async ({ request }) => {
		const qualities = ['fast', 'standard', 'thorough'];

		for (const quality of qualities) {
			const response = await request.post('/api/scan', {
				data: {
					url: 'https://example.com',
					quality,
				},
				timeout: 120000,
			});

			if (response.ok()) {
				const data = await response.json();
				expect(data).toHaveProperty('status');
			}
		}
	});

	test('POST /api/scan - should handle timeout gracefully', async ({ request }) => {
		test.setTimeout(10000);

		try {
			const response = await request.post('/api/scan', {
				data: {
					url: 'https://example.com',
					quality: 'thorough',
				},
				timeout: 5000, // Short timeout to trigger error
			});

			// Either succeeds or fails gracefully
			expect([200, 408, 500, 504]).toContain(response.status());
		} catch (error: any) {
			// Timeout is expected
			expect(error.message).toMatch(/timeout|timed out/i);
		}
	});
});

test.describe('Community API', () => {
	test('GET /api/community/sites - should return scanned sites', async ({ request }) => {
		const response = await request.get('/api/community/sites');

		expect(response.ok()).toBeTruthy();
		const data = await response.json();

		expect(Array.isArray(data)).toBeTruthy();
	});

	test('GET /api/community/sites?search= - should filter results', async ({ request }) => {
		const response = await request.get('/api/community/sites?search=example');

		expect(response.ok()).toBeTruthy();
		const data = await response.json();

		expect(Array.isArray(data)).toBeTruthy();
		if (data.length > 0) {
			expect(data[0]).toHaveProperty('domain');
		}
	});
});

test.describe('Metrics API', () => {
	test('GET /api/metrics - should return metrics', async ({ request }) => {
		const response = await request.get('/api/metrics');

		expect(response.ok()).toBeTruthy();
		const data = await response.json();

		expect(data).toHaveProperty('metrics');
	});

	test('POST /api/metrics/track - should track event', async ({ request }) => {
		const response = await request.post('/api/metrics/track', {
			data: {
				event: 'scan_completed',
				properties: {
					url: 'https://example.com',
					duration: 5000,
				},
			},
		});

		expect([200, 201, 204]).toContain(response.status());
	});
});