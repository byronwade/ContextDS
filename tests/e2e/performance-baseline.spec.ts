import { test, expect } from '@playwright/test';

/**
 * Performance Baseline Testing
 *
 * Establishes and validates performance benchmarks:
 * - Response time percentiles (P50, P95, P99)
 * - Throughput benchmarks
 * - Resource utilization tracking
 * - Performance regression detection
 */

interface PerformanceMetric {
	name: string;
	duration: number;
	timestamp: number;
	success: boolean;
	tokenCount?: number;
}

test.describe('Performance Baselines', () => {
	test('should establish response time baselines', async ({ request }) => {
		test.setTimeout(600000);

		const testUrl = 'https://example.com';
		const iterations = 50;
		const metrics: PerformanceMetric[] = [];

		console.log(`\n📊 Running ${iterations} iterations for baseline...`);

		for (let i = 0; i < iterations; i++) {
			const startTime = Date.now();

			try {
				const response = await request.post('/api/scan', {
					data: { url: testUrl, quality: 'standard', mode: 'fast' },
					timeout: 120000,
				});

				const duration = Date.now() - startTime;
				const data = response.ok() ? await response.json() : null;

				metrics.push({
					name: `iteration-${i + 1}`,
					duration,
					timestamp: Date.now(),
					success: response.ok(),
					tokenCount: data?.summary?.tokensExtracted || 0,
				});

				if ((i + 1) % 10 === 0) {
					console.log(`  Completed ${i + 1}/${iterations} iterations`);
				}
			} catch (error: any) {
				metrics.push({
					name: `iteration-${i + 1}`,
					duration: Date.now() - startTime,
					timestamp: Date.now(),
					success: false,
				});
			}

			// Brief pause between iterations
			await new Promise(resolve => setTimeout(resolve, 1000));
		}

		// Calculate percentiles
		const successfulMetrics = metrics.filter(m => m.success);
		const durations = successfulMetrics.map(m => m.duration).sort((a, b) => a - b);

		const p50 = durations[Math.floor(durations.length * 0.5)];
		const p95 = durations[Math.floor(durations.length * 0.95)];
		const p99 = durations[Math.floor(durations.length * 0.99)];
		const avg = durations.reduce((sum, d) => sum + d, 0) / durations.length;
		const min = Math.min(...durations);
		const max = Math.max(...durations);

		console.log(`\n📈 Performance Baseline Results:`);
		console.log(`  Total Iterations: ${iterations}`);
		console.log(`  Successful: ${successfulMetrics.length}`);
		console.log(`  Success Rate: ${((successfulMetrics.length / iterations) * 100).toFixed(1)}%`);
		console.log(`\n  Response Times:`);
		console.log(`    Min: ${min}ms`);
		console.log(`    P50 (median): ${p50}ms`);
		console.log(`    P95: ${p95}ms`);
		console.log(`    P99: ${p99}ms`);
		console.log(`    Max: ${max}ms`);
		console.log(`    Average: ${avg.toFixed(0)}ms`);

		// Performance assertions
		expect(p50).toBeLessThan(30000); // P50 under 30s
		expect(p95).toBeLessThan(60000); // P95 under 60s
		expect(successfulMetrics.length / iterations).toBeGreaterThan(0.9); // 90%+ success rate
	});

	test('should detect performance regressions', async ({ request }) => {
		test.setTimeout(300000);

		const testUrl = 'https://example.com';

		// Run baseline (first 10 requests)
		console.log('\n📊 Establishing baseline...');
		const baselineMetrics = await runPerformanceTest(request, testUrl, 10);
		const baselineAvg =
			baselineMetrics.filter(m => m.success).reduce((sum, m) => sum + m.duration, 0) / baselineMetrics.filter(m => m.success).length;

		console.log(`  Baseline Avg: ${baselineAvg.toFixed(0)}ms`);

		// Wait and run comparison test
		await new Promise(resolve => setTimeout(resolve, 30000));

		console.log('\n🔄 Running comparison test...');
		const comparisonMetrics = await runPerformanceTest(request, testUrl, 10);
		const comparisonAvg =
			comparisonMetrics.filter(m => m.success).reduce((sum, m) => sum + m.duration, 0) / comparisonMetrics.filter(m => m.success).length;

		console.log(`  Comparison Avg: ${comparisonAvg.toFixed(0)}ms`);

		const regression = ((comparisonAvg - baselineAvg) / baselineAvg) * 100;
		console.log(`\n📉 Regression Analysis:`);
		console.log(`  Change: ${regression > 0 ? '+' : ''}${regression.toFixed(1)}%`);

		// Alert if performance degrades by more than 50%
		expect(regression).toBeLessThan(50);
	});

	test('should measure throughput capacity', async ({ request }) => {
		test.setTimeout(300000);

		const testUrl = 'https://example.com';
		const testDuration = 60000; // 1 minute
		const concurrency = 5;

		console.log(`\n🚀 Throughput Test: ${concurrency} concurrent for ${testDuration / 1000}s`);

		const startTime = Date.now();
		let completedRequests = 0;
		let successfulRequests = 0;
		const durations: number[] = [];

		while (Date.now() - startTime < testDuration) {
			const batchPromises = Array.from({ length: concurrency }, async () => {
				const reqStart = Date.now();
				try {
					const response = await request.post('/api/scan', {
						data: { url: testUrl, quality: 'fast', mode: 'fast' },
						timeout: 30000,
					});

					const duration = Date.now() - reqStart;
					completedRequests++;
					if (response.ok()) {
						successfulRequests++;
						durations.push(duration);
					}
					return response.ok();
				} catch (error) {
					completedRequests++;
					return false;
				}
			});

			await Promise.all(batchPromises);
			await new Promise(resolve => setTimeout(resolve, 2000));
		}

		const actualDuration = (Date.now() - startTime) / 1000;
		const throughput = completedRequests / actualDuration;
		const successfulThroughput = successfulRequests / actualDuration;
		const avgDuration = durations.reduce((sum, d) => sum + d, 0) / durations.length;

		console.log(`\n📊 Throughput Results:`);
		console.log(`  Duration: ${actualDuration.toFixed(1)}s`);
		console.log(`  Total Requests: ${completedRequests}`);
		console.log(`  Successful: ${successfulRequests}`);
		console.log(`  Throughput: ${throughput.toFixed(2)} req/s`);
		console.log(`  Successful Throughput: ${successfulThroughput.toFixed(2)} req/s`);
		console.log(`  Avg Response Time: ${avgDuration.toFixed(0)}ms`);

		// Should achieve reasonable throughput
		expect(throughput).toBeGreaterThan(0.1); // At least 0.1 req/s
	});
});

test.describe('Bottleneck Detection', () => {
	test('should identify slow response patterns', async ({ request }) => {
		test.setTimeout(300000);

		const testUrls = [
			{ url: 'https://example.com', category: 'simple' },
			{ url: 'https://stripe.com', category: 'medium' },
			{ url: 'https://amazon.com', category: 'complex' },
		];

		const results = [];

		for (const site of testUrls) {
			console.log(`\n🔍 Testing ${site.url} (${site.category})...`);
			const iterations = 5;
			const durations: number[] = [];

			for (let i = 0; i < iterations; i++) {
				const startTime = Date.now();
				try {
					const response = await request.post('/api/scan', {
						data: { url: site.url, quality: 'standard', mode: 'fast' },
						timeout: 180000,
					});

					if (response.ok()) {
						durations.push(Date.now() - startTime);
					}
				} catch (error) {
					// Skip failures
				}

				await new Promise(resolve => setTimeout(resolve, 2000));
			}

			if (durations.length > 0) {
				const avg = durations.reduce((sum, d) => sum + d, 0) / durations.length;
				const min = Math.min(...durations);
				const max = Math.max(...durations);
				const variance = max - min;

				results.push({
					...site,
					avg,
					min,
					max,
					variance,
				});

				console.log(`  Avg: ${avg.toFixed(0)}ms`);
				console.log(`  Range: ${min}ms - ${max}ms`);
				console.log(`  Variance: ${variance}ms`);
			}
		}

		console.log(`\n📊 Bottleneck Analysis:`);
		results.forEach(r => {
			console.log(`  ${r.category}: ${r.avg.toFixed(0)}ms avg`);
		});

		// All tests should complete eventually
		expect(results.length).toBeGreaterThan(0);
	});

	test('should measure cold start vs warm performance', async ({ request }) => {
		test.setTimeout(180000);

		const testUrl = 'https://example.com';

		// Cold start - first request
		console.log('\n❄️  Cold Start:');
		const coldStart = Date.now();
		try {
			await request.post('/api/scan', {
				data: { url: testUrl, quality: 'fast', mode: 'fast' },
				timeout: 60000,
			});
		} catch (error) {
			// Ignore
		}
		const coldDuration = Date.now() - coldStart;
		console.log(`  Duration: ${coldDuration}ms`);

		// Wait briefly
		await new Promise(resolve => setTimeout(resolve, 5000));

		// Warm requests
		console.log('\n🔥 Warm Requests:');
		const warmDurations: number[] = [];
		for (let i = 0; i < 5; i++) {
			const warmStart = Date.now();
			try {
				await request.post('/api/scan', {
					data: { url: testUrl, quality: 'fast', mode: 'fast' },
					timeout: 60000,
				});
				warmDurations.push(Date.now() - warmStart);
			} catch (error) {
				// Ignore
			}
			await new Promise(resolve => setTimeout(resolve, 2000));
		}

		const avgWarm = warmDurations.reduce((sum, d) => sum + d, 0) / warmDurations.length;
		console.log(`  Avg Duration: ${avgWarm.toFixed(0)}ms`);

		const coldStartPenalty = ((coldDuration - avgWarm) / avgWarm) * 100;
		console.log(`\n📊 Cold Start Analysis:`);
		console.log(`  Cold: ${coldDuration}ms`);
		console.log(`  Warm: ${avgWarm.toFixed(0)}ms`);
		console.log(`  Penalty: ${coldStartPenalty.toFixed(0)}%`);

		// Warm requests should be somewhat faster or similar
		expect(avgWarm).toBeLessThan(coldDuration * 2);
	});
});

test.describe('Capacity Planning', () => {
	test('should determine maximum sustainable load', async ({ request }) => {
		test.setTimeout(600000);

		const testUrl = 'https://example.com';
		const loadLevels = [1, 2, 5, 10, 15, 20];

		console.log('\n📈 Capacity Planning Test');
		const capacityResults = [];

		for (const concurrency of loadLevels) {
			console.log(`\n🔹 Testing ${concurrency} concurrent requests...`);
			const testDuration = 30000; // 30 seconds per level
			const startTime = Date.now();
			let completed = 0;
			let successful = 0;

			while (Date.now() - startTime < testDuration) {
				const batchPromises = Array.from({ length: concurrency }, async () => {
					try {
						const response = await request.post('/api/scan', {
							data: { url: testUrl, quality: 'fast', mode: 'fast' },
							timeout: 30000,
						});
						completed++;
						if (response.ok()) successful++;
						return response.ok();
					} catch (error) {
						completed++;
						return false;
					}
				});

				await Promise.all(batchPromises);
				await new Promise(resolve => setTimeout(resolve, 1000));
			}

			const successRate = (successful / completed) * 100;
			capacityResults.push({
				concurrency,
				completed,
				successful,
				successRate,
			});

			console.log(`  Completed: ${completed}, Success Rate: ${successRate.toFixed(1)}%`);

			// If success rate drops below 50%, stop testing higher loads
			if (successRate < 50) {
				console.log(`  ⚠️  Success rate too low, stopping capacity test`);
				break;
			}

			// Brief recovery period
			await new Promise(resolve => setTimeout(resolve, 10000));
		}

		console.log(`\n📊 Capacity Test Results:`);
		capacityResults.forEach(r => {
			console.log(`  ${r.concurrency} concurrent: ${r.successRate.toFixed(1)}% (${r.successful}/${r.completed})`);
		});

		// Find maximum sustainable load (>80% success rate)
		const sustainable = capacityResults.filter(r => r.successRate >= 80);
		const maxCapacity = sustainable.length > 0 ? Math.max(...sustainable.map(r => r.concurrency)) : 0;

		console.log(`\n🎯 Maximum Sustainable Load: ${maxCapacity} concurrent requests`);

		expect(maxCapacity).toBeGreaterThanOrEqual(1);
	});
});

// Helper function
async function runPerformanceTest(request: any, url: string, iterations: number): Promise<PerformanceMetric[]> {
	const metrics: PerformanceMetric[] = [];

	for (let i = 0; i < iterations; i++) {
		const startTime = Date.now();
		try {
			const response = await request.post('/api/scan', {
				data: { url, quality: 'fast', mode: 'fast' },
				timeout: 60000,
			});

			metrics.push({
				name: `test-${i}`,
				duration: Date.now() - startTime,
				timestamp: Date.now(),
				success: response.ok(),
			});
		} catch (error) {
			metrics.push({
				name: `test-${i}`,
				duration: Date.now() - startTime,
				timestamp: Date.now(),
				success: false,
			});
		}

		await new Promise(resolve => setTimeout(resolve, 1000));
	}

	return metrics;
}