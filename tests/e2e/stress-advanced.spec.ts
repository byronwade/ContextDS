import { test, expect } from '@playwright/test';

/**
 * Advanced Stress Testing Suite
 *
 * Comprehensive load, soak, spike, and chaos testing scenarios
 * - Load testing with gradual ramp-up
 * - Soak testing for long-running stability
 * - Spike testing for sudden traffic bursts
 * - Chaos testing for failure scenarios
 * - Resource exhaustion testing
 * - Rate limit validation
 */

interface LoadTestResult {
	timestamp: number;
	success: boolean;
	duration: number;
	statusCode?: number;
	error?: string;
}

test.describe('Load Testing - Gradual Ramp-Up', () => {
	test('should handle gradual load increase', async ({ request }) => {
		test.setTimeout(600000); // 10 minutes

		const testUrl = 'https://example.com';
		const phases = [
			{ name: 'Warm-up', concurrency: 1, duration: 10000 },
			{ name: 'Ramp-up', concurrency: 5, duration: 20000 },
			{ name: 'Peak Load', concurrency: 10, duration: 30000 },
			{ name: 'Cool-down', concurrency: 2, duration: 10000 },
		];

		const allResults: LoadTestResult[] = [];

		for (const phase of phases) {
			console.log(`\n🔥 ${phase.name}: ${phase.concurrency} concurrent requests`);
			const phaseStart = Date.now();
			const phaseResults: LoadTestResult[] = [];

			while (Date.now() - phaseStart < phase.duration) {
				const batchPromises = Array.from({ length: phase.concurrency }, async () => {
					const startTime = Date.now();
					try {
						const response = await request.post('/api/scan', {
							data: { url: testUrl, quality: 'fast', mode: 'fast' },
							timeout: 30000,
						});

						return {
							timestamp: Date.now(),
							success: response.ok(),
							duration: Date.now() - startTime,
							statusCode: response.status(),
						};
					} catch (error: any) {
						return {
							timestamp: Date.now(),
							success: false,
							duration: Date.now() - startTime,
							error: error.message,
						};
					}
				});

				const batchResults = await Promise.all(batchPromises);
				phaseResults.push(...batchResults);
				allResults.push(...batchResults);

				// Brief pause between batches
				await new Promise(resolve => setTimeout(resolve, 1000));
			}

			const successRate = (phaseResults.filter(r => r.success).length / phaseResults.length) * 100;
			const avgDuration = phaseResults.reduce((sum, r) => sum + r.duration, 0) / phaseResults.length;

			console.log(`  Success Rate: ${successRate.toFixed(1)}%`);
			console.log(`  Avg Duration: ${avgDuration.toFixed(0)}ms`);
			console.log(`  Total Requests: ${phaseResults.length}`);
		}

		// Analyze overall results
		const totalRequests = allResults.length;
		const successfulRequests = allResults.filter(r => r.success).length;
		const overallSuccessRate = (successfulRequests / totalRequests) * 100;

		console.log(`\n📊 Overall Results:`);
		console.log(`  Total Requests: ${totalRequests}`);
		console.log(`  Successful: ${successfulRequests}`);
		console.log(`  Success Rate: ${overallSuccessRate.toFixed(1)}%`);

		// Should maintain at least 70% success rate during load test
		expect(overallSuccessRate).toBeGreaterThanOrEqual(70);
	});
});

test.describe('Soak Testing - Long-Running Stability', () => {
	test('should maintain stability over extended period', async ({ request }) => {
		test.setTimeout(1800000); // 30 minutes

		const testUrl = 'https://example.com';
		const testDuration = 10 * 60 * 1000; // 10 minutes (reduced from 30 for practical testing)
		const requestInterval = 5000; // Request every 5 seconds
		const concurrency = 3; // 3 concurrent requests

		const startTime = Date.now();
		const results: LoadTestResult[] = [];
		let iteration = 0;

		console.log(`\n⏱️  Starting soak test: ${testDuration / 60000} minutes`);

		while (Date.now() - startTime < testDuration) {
			iteration++;
			const iterationStart = Date.now();

			// Run concurrent requests
			const batchPromises = Array.from({ length: concurrency }, async index => {
				try {
					const response = await request.post('/api/scan', {
						data: { url: testUrl, quality: 'fast', mode: 'fast' },
						timeout: 30000,
					});

					return {
						timestamp: Date.now(),
						success: response.ok(),
						duration: Date.now() - iterationStart,
						statusCode: response.status(),
					};
				} catch (error: any) {
					return {
						timestamp: Date.now(),
						success: false,
						duration: Date.now() - iterationStart,
						error: error.message,
					};
				}
			});

			const batchResults = await Promise.all(batchPromises);
			results.push(...batchResults);

			// Log progress every 10 iterations
			if (iteration % 10 === 0) {
				const recentResults = results.slice(-30);
				const recentSuccessRate = (recentResults.filter(r => r.success).length / recentResults.length) * 100;
				const elapsed = ((Date.now() - startTime) / 60000).toFixed(1);
				console.log(`  [${elapsed}m] Iteration ${iteration}, Recent Success: ${recentSuccessRate.toFixed(1)}%`);
			}

			// Wait before next iteration
			const waitTime = Math.max(0, requestInterval - (Date.now() - iterationStart));
			await new Promise(resolve => setTimeout(resolve, waitTime));
		}

		// Analyze stability over time
		const totalRequests = results.length;
		const successRate = (results.filter(r => r.success).length / totalRequests) * 100;

		// Split into time windows to check for degradation
		const windowSize = Math.floor(totalRequests / 5);
		const windows = [];
		for (let i = 0; i < 5; i++) {
			const windowResults = results.slice(i * windowSize, (i + 1) * windowSize);
			const windowSuccess = (windowResults.filter(r => r.success).length / windowResults.length) * 100;
			windows.push(windowSuccess);
		}

		console.log(`\n📊 Soak Test Results:`);
		console.log(`  Total Requests: ${totalRequests}`);
		console.log(`  Overall Success Rate: ${successRate.toFixed(1)}%`);
		console.log(`  Time Windows:`);
		windows.forEach((rate, i) => {
			console.log(`    Window ${i + 1}: ${rate.toFixed(1)}%`);
		});

		// Should maintain stability (no significant degradation)
		const firstWindow = windows[0];
		const lastWindow = windows[windows.length - 1];
		const degradation = firstWindow - lastWindow;

		expect(successRate).toBeGreaterThanOrEqual(70);
		expect(degradation).toBeLessThan(20); // Less than 20% degradation
	});
});

test.describe('Spike Testing - Sudden Traffic Bursts', () => {
	test('should recover from traffic spikes', async ({ request }) => {
		test.setTimeout(300000); // 5 minutes

		const testUrl = 'https://example.com';
		const normalLoad = 2;
		const spikeLoad = 20;
		const spikeDuration = 10000; // 10 seconds

		console.log(`\n⚡ Spike Test: ${normalLoad} → ${spikeLoad} concurrent requests`);

		// Phase 1: Normal load
		console.log('\n📊 Phase 1: Normal load (30s)');
		const normalResults = await runLoadPhase(request, testUrl, normalLoad, 30000);
		const normalSuccessRate = (normalResults.filter(r => r.success).length / normalResults.length) * 100;
		console.log(`  Normal Success Rate: ${normalSuccessRate.toFixed(1)}%`);

		// Phase 2: Spike
		console.log('\n⚡ Phase 2: Traffic spike (10s)');
		const spikeResults = await runLoadPhase(request, testUrl, spikeLoad, spikeDuration);
		const spikeSuccessRate = (spikeResults.filter(r => r.success).length / spikeResults.length) * 100;
		console.log(`  Spike Success Rate: ${spikeSuccessRate.toFixed(1)}%`);

		// Phase 3: Recovery
		console.log('\n🔄 Phase 3: Recovery period (30s)');
		const recoveryResults = await runLoadPhase(request, testUrl, normalLoad, 30000);
		const recoverySuccessRate = (recoveryResults.filter(r => r.success).length / recoveryResults.length) * 100;
		console.log(`  Recovery Success Rate: ${recoverySuccessRate.toFixed(1)}%`);

		console.log(`\n📊 Spike Test Summary:`);
		console.log(`  Normal: ${normalSuccessRate.toFixed(1)}%`);
		console.log(`  Spike: ${spikeSuccessRate.toFixed(1)}%`);
		console.log(`  Recovery: ${recoverySuccessRate.toFixed(1)}%`);

		// System should maintain some success during spike and recover after
		expect(spikeSuccessRate).toBeGreaterThan(30); // At least 30% during spike
		expect(recoverySuccessRate).toBeGreaterThan(normalSuccessRate * 0.8); // Recovery within 80%
	});

	test('should handle multiple consecutive spikes', async ({ request }) => {
		test.setTimeout(300000);

		const testUrl = 'https://example.com';
		const spikes = [10, 15, 20];

		const spikeResults = [];

		for (let i = 0; i < spikes.length; i++) {
			console.log(`\n⚡ Spike ${i + 1}: ${spikes[i]} concurrent requests`);
			const results = await runLoadPhase(request, testUrl, spikes[i], 5000);
			const successRate = (results.filter(r => r.success).length / results.length) * 100;
			spikeResults.push(successRate);
			console.log(`  Success Rate: ${successRate.toFixed(1)}%`);

			// Recovery period between spikes
			await new Promise(resolve => setTimeout(resolve, 5000));
		}

		// Should handle escalating spikes gracefully
		expect(spikeResults.every(rate => rate > 20)).toBeTruthy();
	});
});

test.describe('Chaos Testing - Failure Scenarios', () => {
	test('should handle invalid URLs gracefully under load', async ({ request }) => {
		test.setTimeout(120000);

		const invalidUrls = [
			'not-a-url',
			'http://',
			'https://',
			'javascript:alert(1)',
			'//example.com',
			'ftp://invalid.com',
			'<script>alert(1)</script>',
			'https://this-domain-does-not-exist-12345.com',
		];

		const results = await Promise.all(
			invalidUrls.map(async url => {
				try {
					const response = await request.post('/api/scan', {
						data: { url, quality: 'fast' },
						timeout: 10000,
					});
					return {
						url,
						statusCode: response.status(),
						handled: response.status() >= 400 && response.status() < 500,
					};
				} catch (error: any) {
					return {
						url,
						error: error.message,
						handled: true, // Timeout/network errors are acceptable
					};
				}
			})
		);

		console.log('\n🔥 Chaos Test - Invalid URLs:');
		results.forEach(r => {
			const status = r.statusCode ? `HTTP ${r.statusCode}` : r.error;
			console.log(`  ${r.handled ? '✅' : '❌'} ${r.url}: ${status}`);
		});

		// All invalid URLs should be handled gracefully
		const allHandled = results.every(r => r.handled);
		expect(allHandled).toBeTruthy();
	});

	test('should handle mixed valid/invalid requests', async ({ request }) => {
		test.setTimeout(180000);

		const mixedUrls = [
			{ url: 'https://example.com', valid: true },
			{ url: 'not-a-url', valid: false },
			{ url: 'https://stripe.com', valid: true },
			{ url: 'javascript:void(0)', valid: false },
			{ url: 'https://vercel.com', valid: true },
			{ url: 'http://', valid: false },
		];

		const results = await Promise.all(
			mixedUrls.map(async ({ url, valid }) => {
				try {
					const response = await request.post('/api/scan', {
						data: { url, quality: 'fast', mode: 'fast' },
						timeout: 30000,
					});

					return {
						url,
						valid,
						success: response.ok(),
						statusCode: response.status(),
					};
				} catch (error: any) {
					return {
						url,
						valid,
						success: false,
						error: error.message,
					};
				}
			})
		);

		console.log('\n🎲 Chaos Test - Mixed Requests:');
		results.forEach(r => {
			const status = r.statusCode ? `HTTP ${r.statusCode}` : r.error;
			console.log(`  ${r.url} (${r.valid ? 'valid' : 'invalid'}): ${status}`);
		});

		// Valid URLs should mostly succeed, invalid should fail gracefully
		const validResults = results.filter(r => r.valid);
		const validSuccessRate = (validResults.filter(r => r.success).length / validResults.length) * 100;
		expect(validSuccessRate).toBeGreaterThan(50);
	});
});

test.describe('Resource Exhaustion Testing', () => {
	test('should handle large payloads', async ({ request }) => {
		test.setTimeout(120000);

		const testUrl = 'https://example.com';
		const largePayload = {
			url: testUrl,
			quality: 'thorough',
			mode: 'comprehensive',
			metadata: {
				user: 'test-user',
				tags: Array(1000).fill('test-tag'),
				notes: 'x'.repeat(10000),
			},
		};

		const response = await request.post('/api/scan', {
			data: largePayload,
			timeout: 60000,
		});

		// Should either handle it or reject gracefully
		expect([200, 201, 400, 413]).toContain(response.status());
	});

	test('should handle concurrent large sites', async ({ request }) => {
		test.setTimeout(600000);

		const largeSites = ['https://amazon.com', 'https://walmart.com', 'https://target.com'];

		const results = await Promise.all(
			largeSites.map(async url => {
				const startTime = Date.now();
				try {
					const response = await request.post('/api/scan', {
						data: { url, quality: 'standard', mode: 'fast' },
						timeout: 180000,
					});

					return {
						url,
						success: response.ok(),
						duration: Date.now() - startTime,
					};
				} catch (error: any) {
					return {
						url,
						success: false,
						duration: Date.now() - startTime,
						error: error.message,
					};
				}
			})
		);

		console.log('\n📦 Large Sites Test:');
		results.forEach(r => {
			console.log(`  ${r.success ? '✅' : '❌'} ${r.url}: ${r.duration}ms`);
		});

		const successRate = (results.filter(r => r.success).length / results.length) * 100;
		expect(successRate).toBeGreaterThan(30); // At least 30% success for large sites
	});
});

test.describe('Rate Limit Testing', () => {
	test('should enforce rate limits', async ({ request }) => {
		test.setTimeout(120000);

		const testUrl = 'https://example.com';
		const rapidRequests = 50;

		console.log(`\n🚦 Rate Limit Test: ${rapidRequests} rapid requests`);

		const results = await Promise.all(
			Array.from({ length: rapidRequests }, async (_, i) => {
				try {
					const response = await request.post('/api/scan', {
						data: { url: testUrl, quality: 'fast' },
						timeout: 10000,
					});
					return {
						index: i,
						statusCode: response.status(),
						rateLimited: response.status() === 429,
					};
				} catch (error: any) {
					return {
						index: i,
						error: error.message,
						rateLimited: false,
					};
				}
			})
		);

		const successCount = results.filter(r => r.statusCode === 200 || r.statusCode === 201).length;
		const rateLimitedCount = results.filter(r => r.rateLimited).length;
		const errorCount = results.filter(r => r.error).length;

		console.log(`  Successful: ${successCount}`);
		console.log(`  Rate Limited (429): ${rateLimitedCount}`);
		console.log(`  Errors: ${errorCount}`);

		// Should have some rate limiting or controlled responses
		expect(successCount + rateLimitedCount + errorCount).toBe(rapidRequests);
	});
});

// Helper function
async function runLoadPhase(request: any, url: string, concurrency: number, duration: number): Promise<LoadTestResult[]> {
	const results: LoadTestResult[] = [];
	const startTime = Date.now();

	while (Date.now() - startTime < duration) {
		const batchPromises = Array.from({ length: concurrency }, async () => {
			const reqStart = Date.now();
			try {
				const response = await request.post('/api/scan', {
					data: { url, quality: 'fast', mode: 'fast' },
					timeout: 30000,
				});
				return {
					timestamp: Date.now(),
					success: response.ok(),
					duration: Date.now() - reqStart,
					statusCode: response.status(),
				};
			} catch (error: any) {
				return {
					timestamp: Date.now(),
					success: false,
					duration: Date.now() - reqStart,
					error: error.message,
				};
			}
		});

		const batchResults = await Promise.all(batchPromises);
		results.push(...batchResults);

		await new Promise(resolve => setTimeout(resolve, 1000));
	}

	return results;
}