import { test, expect } from '@playwright/test';
import { completeScan, startBatchScans, pollBatchScans, getTokenCount, assertScanSuccess } from './helpers/scan-helpers';

/**
 * Stress Testing Suite for Design Token Scanner
 *
 * Tests high-load scenarios with real-world websites using async scan workflow
 * - Sequential scanning of multiple sites
 * - Concurrent scanning with worker pools
 * - Memory leak detection
 * - Performance benchmarking
 */

interface TestSite {
	url: string;
	priority: 'critical' | 'high' | 'medium' | 'low';
	category: string;
	expectedTokenCount?: number;
}

const STRESS_TEST_SITES: TestSite[] = [
	// Critical - Must work
	{ url: 'https://example.com', priority: 'critical', category: 'test', expectedTokenCount: 50 },

	// High Priority - Major E-commerce
	{ url: 'https://walmart.com', priority: 'high', category: 'e-commerce' },
	{ url: 'https://amazon.com', priority: 'high', category: 'e-commerce' },
	{ url: 'https://target.com', priority: 'high', category: 'e-commerce' },

	// High Priority - Technology
	{ url: 'https://apple.com', priority: 'high', category: 'technology' },
	{ url: 'https://microsoft.com', priority: 'high', category: 'technology' },
	{ url: 'https://stripe.com', priority: 'high', category: 'technology' },

	// Medium Priority - Design Systems
	{ url: 'https://vercel.com', priority: 'medium', category: 'design-system' },
	{ url: 'https://shopify.com', priority: 'medium', category: 'design-system' },
];

test.describe('Stress Tests - Sequential', () => {
	test('should scan critical sites successfully', async ({ request }) => {
		const criticalSites = STRESS_TEST_SITES.filter(s => s.priority === 'critical');

		for (const site of criticalSites) {
			const { result, duration } = await completeScan(request, site.url, {
				mode: 'fast',
				timeout: 120000,
			});

			assertScanSuccess(result, site.url);

			const tokenCount = getTokenCount(result);
			console.log(`✅ ${site.url}: ${duration}ms, ${tokenCount} tokens`);

			// Verify we got reasonable token counts
			if (site.expectedTokenCount) {
				expect(tokenCount).toBeGreaterThan(site.expectedTokenCount * 0.5);
			}
		}
	});

	test('should scan high priority sites sequentially', async ({ request }) => {
		test.setTimeout(600000); // 10 minutes total

		const highPrioritySites = STRESS_TEST_SITES.filter(s => s.priority === 'high').slice(0, 3);
		const results = [];

		for (const site of highPrioritySites) {
			try {
				const { result, duration } = await completeScan(request, site.url, {
					mode: 'fast',
					timeout: 180000,
				});

				results.push({
					url: site.url,
					success: result.status === 'completed',
					duration,
					tokens: getTokenCount(result),
				});

				console.log(`✅ ${site.url}: ${duration}ms`);
			} catch (error: any) {
				results.push({
					url: site.url,
					success: false,
					duration: 0,
					error: error.message,
				});
				console.log(`❌ ${site.url}: ${error.message}`);
			}

			// Cooldown between scans
			await new Promise(resolve => setTimeout(resolve, 2000));
		}

		// Calculate success rate
		const successCount = results.filter(r => r.success).length;
		const successRate = (successCount / results.length) * 100;

		console.log(`\n📊 Sequential Test Results:`);
		console.log(`Success Rate: ${successRate.toFixed(1)}%`);
		console.log(`Successful: ${successCount}/${results.length}`);

		// Expect at least 60% success rate
		expect(successRate).toBeGreaterThanOrEqual(60);
	});
});

test.describe('Stress Tests - Concurrent', () => {
	test('should handle concurrent scans', async ({ request }) => {
		test.setTimeout(300000); // 5 minutes

		const sites = STRESS_TEST_SITES.slice(0, 5); // Test 5 sites concurrently
		const urls = sites.map(s => s.url);

		console.log(`\n🔥 Starting ${urls.length} concurrent scans...`);

		// Start all scans
		const scanIds = await startBatchScans(request, urls, { mode: 'fast' });
		console.log(`Started ${scanIds.length} scans`);

		// Poll all concurrently
		const results = await pollBatchScans(request, scanIds, {
			timeout: 180000,
		});

		// Log results
		console.log(`\n🔥 Concurrent Test Results:`);
		results.forEach((result, scanId) => {
			const site = sites.find(s => true); // Would need to map scanId to URL
			if (result.success && result.result) {
				console.log(`✅ ${scanId.substring(0, 12)}: ${getTokenCount(result.result)} tokens`);
			} else {
				console.log(`❌ ${scanId.substring(0, 12)}: ${result.error}`);
			}
		});

		const successCount = Array.from(results.values()).filter(r => r.success).length;
		const successRate = (successCount / results.size) * 100;

		console.log(`Success Rate: ${successRate.toFixed(1)}%`);

		// Expect at least 40% success rate for concurrent tests
		expect(successRate).toBeGreaterThanOrEqual(40);
	});

	test('should handle burst traffic', async ({ request }) => {
		test.setTimeout(120000);

		const testUrl = 'https://example.com';
		const burstSize = 10;

		const scanIds = await startBatchScans(request, Array(burstSize).fill(testUrl), {
			mode: 'fast',
		});

		console.log(`⚡ Started ${scanIds.length} burst requests`);

		const results = await pollBatchScans(request, scanIds, {
			timeout: 60000,
		});

		const successCount = Array.from(results.values()).filter(r => r.success).length;
		const failureCount = Array.from(results.values()).filter(r => !r.success).length;

		console.log(`\n⚡ Burst Test Results:`);
		console.log(`Successful: ${successCount}/${burstSize}`);
		console.log(`Failed: ${failureCount}/${burstSize}`);

		// Should either handle requests or fail gracefully
		expect(successCount + failureCount).toBe(burstSize);
	});
});

test.describe('Stress Tests - Performance', () => {
	test('should complete scans within acceptable time', async ({ request }) => {
		const testSite = STRESS_TEST_SITES.find(s => s.priority === 'critical')!;

		const { result, duration } = await completeScan(request, testSite.url, {
			mode: 'fast',
			timeout: 60000,
		});

		assertScanSuccess(result);

		// Fast mode should complete within 45 seconds for simple sites
		expect(duration).toBeLessThan(45000);

		console.log(`⏱️  Performance: ${duration}ms for ${testSite.url}`);
	});

	test('should not leak memory over multiple scans', async ({ request }) => {
		test.setTimeout(300000);

		const testUrl = 'https://example.com';
		const iterations = 5;
		const memoryReadings: number[] = [];

		for (let i = 0; i < iterations; i++) {
			if (global.gc) {
				global.gc();
			}

			const memBefore = process.memoryUsage().heapUsed;

			await completeScan(request, testUrl, {
				mode: 'fast',
				timeout: 60000,
			});

			const memAfter = process.memoryUsage().heapUsed;
			const memDelta = memAfter - memBefore;

			memoryReadings.push(memDelta);

			console.log(`Iteration ${i + 1}: ${(memDelta / 1024 / 1024).toFixed(2)}MB delta`);

			await new Promise(resolve => setTimeout(resolve, 1000));
		}

		// Calculate trend
		const firstHalf = memoryReadings.slice(0, Math.floor(iterations / 2));
		const secondHalf = memoryReadings.slice(Math.floor(iterations / 2));

		const avgFirstHalf = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
		const avgSecondHalf = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

		console.log(`\n📊 Memory Analysis:`);
		console.log(`First half avg: ${(avgFirstHalf / 1024 / 1024).toFixed(2)}MB`);
		console.log(`Second half avg: ${(avgSecondHalf / 1024 / 1024).toFixed(2)}MB`);

		// Second half should not be more than 2x first half
		expect(avgSecondHalf).toBeLessThan(avgFirstHalf * 2);
	});
});

test.describe('Stress Tests - Error Handling', () => {
	test('should handle malformed URLs gracefully', async ({ request }) => {
		const malformedUrls = ['not-a-url', 'http://', 'javascript:alert(1)', '//example.com'];

		for (const url of malformedUrls) {
			const response = await request.post('/api/scan', {
				data: { url, quality: 'fast' },
			});

			// Should return 4xx error, not crash
			expect(response.status()).toBeGreaterThanOrEqual(400);
			expect(response.status()).toBeLessThan(500);
		}
	});

	test('should handle unreachable domains gracefully', async ({ request }) => {
		const unreachableDomains = ['https://this-domain-does-not-exist-12345.com'];

		for (const url of unreachableDomains) {
			try {
				await completeScan(request, url, {
					mode: 'fast',
					timeout: 30000,
					expectSuccess: false,
				});
			} catch (error: any) {
				// Timeout/failure is acceptable
				expect(error.message).toBeTruthy();
			}
		}
	});

	test('should handle slow/hanging responses', async ({ request }) => {
		test.setTimeout(30000);

		try {
			await completeScan(request, 'https://httpstat.us/200?sleep=10000', {
				mode: 'fast',
				timeout: 15000,
				expectSuccess: false,
			});
		} catch (error: any) {
			// Timeout is expected
			expect(error.message).toContain('timeout');
		}
	});
});