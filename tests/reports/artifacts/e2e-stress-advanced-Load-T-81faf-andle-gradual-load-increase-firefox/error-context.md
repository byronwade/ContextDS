# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: e2e/stress-advanced.spec.ts >> Load Testing - Gradual Ramp-Up >> should handle gradual load increase
- Location: tests/e2e/stress-advanced.spec.ts:24:6

# Error details

```
Error: expect(received).toBeGreaterThanOrEqual(expected)

Expected: >= 70
Received:    0
```

# Test source

```ts
  1   | import { test, expect } from '@playwright/test';
  2   | 
  3   | /**
  4   |  * Advanced Stress Testing Suite
  5   |  *
  6   |  * Comprehensive load, soak, spike, and chaos testing scenarios
  7   |  * - Load testing with gradual ramp-up
  8   |  * - Soak testing for long-running stability
  9   |  * - Spike testing for sudden traffic bursts
  10  |  * - Chaos testing for failure scenarios
  11  |  * - Resource exhaustion testing
  12  |  * - Rate limit validation
  13  |  */
  14  | 
  15  | interface LoadTestResult {
  16  | 	timestamp: number;
  17  | 	success: boolean;
  18  | 	duration: number;
  19  | 	statusCode?: number;
  20  | 	error?: string;
  21  | }
  22  | 
  23  | test.describe('Load Testing - Gradual Ramp-Up', () => {
  24  | 	test('should handle gradual load increase', async ({ request }) => {
  25  | 		test.setTimeout(600000); // 10 minutes
  26  | 
  27  | 		const testUrl = 'https://example.com';
  28  | 		const phases = [
  29  | 			{ name: 'Warm-up', concurrency: 1, duration: 10000 },
  30  | 			{ name: 'Ramp-up', concurrency: 5, duration: 20000 },
  31  | 			{ name: 'Peak Load', concurrency: 10, duration: 30000 },
  32  | 			{ name: 'Cool-down', concurrency: 2, duration: 10000 },
  33  | 		];
  34  | 
  35  | 		const allResults: LoadTestResult[] = [];
  36  | 
  37  | 		for (const phase of phases) {
  38  | 			console.log(`\n🔥 ${phase.name}: ${phase.concurrency} concurrent requests`);
  39  | 			const phaseStart = Date.now();
  40  | 			const phaseResults: LoadTestResult[] = [];
  41  | 
  42  | 			while (Date.now() - phaseStart < phase.duration) {
  43  | 				const batchPromises = Array.from({ length: phase.concurrency }, async () => {
  44  | 					const startTime = Date.now();
  45  | 					try {
  46  | 						const response = await request.post('/api/scan', {
  47  | 							data: { url: testUrl, quality: 'fast', mode: 'fast' },
  48  | 							timeout: 30000,
  49  | 						});
  50  | 
  51  | 						return {
  52  | 							timestamp: Date.now(),
  53  | 							success: response.ok(),
  54  | 							duration: Date.now() - startTime,
  55  | 							statusCode: response.status(),
  56  | 						};
  57  | 					} catch (error: any) {
  58  | 						return {
  59  | 							timestamp: Date.now(),
  60  | 							success: false,
  61  | 							duration: Date.now() - startTime,
  62  | 							error: error.message,
  63  | 						};
  64  | 					}
  65  | 				});
  66  | 
  67  | 				const batchResults = await Promise.all(batchPromises);
  68  | 				phaseResults.push(...batchResults);
  69  | 				allResults.push(...batchResults);
  70  | 
  71  | 				// Brief pause between batches
  72  | 				await new Promise(resolve => setTimeout(resolve, 1000));
  73  | 			}
  74  | 
  75  | 			const successRate = (phaseResults.filter(r => r.success).length / phaseResults.length) * 100;
  76  | 			const avgDuration = phaseResults.reduce((sum, r) => sum + r.duration, 0) / phaseResults.length;
  77  | 
  78  | 			console.log(`  Success Rate: ${successRate.toFixed(1)}%`);
  79  | 			console.log(`  Avg Duration: ${avgDuration.toFixed(0)}ms`);
  80  | 			console.log(`  Total Requests: ${phaseResults.length}`);
  81  | 		}
  82  | 
  83  | 		// Analyze overall results
  84  | 		const totalRequests = allResults.length;
  85  | 		const successfulRequests = allResults.filter(r => r.success).length;
  86  | 		const overallSuccessRate = (successfulRequests / totalRequests) * 100;
  87  | 
  88  | 		console.log(`\n📊 Overall Results:`);
  89  | 		console.log(`  Total Requests: ${totalRequests}`);
  90  | 		console.log(`  Successful: ${successfulRequests}`);
  91  | 		console.log(`  Success Rate: ${overallSuccessRate.toFixed(1)}%`);
  92  | 
  93  | 		// Should maintain at least 70% success rate during load test
> 94  | 		expect(overallSuccessRate).toBeGreaterThanOrEqual(70);
      |                              ^ Error: expect(received).toBeGreaterThanOrEqual(expected)
  95  | 	});
  96  | });
  97  | 
  98  | test.describe('Soak Testing - Long-Running Stability', () => {
  99  | 	test('should maintain stability over extended period', async ({ request }) => {
  100 | 		test.setTimeout(1800000); // 30 minutes
  101 | 
  102 | 		const testUrl = 'https://example.com';
  103 | 		const testDuration = 10 * 60 * 1000; // 10 minutes (reduced from 30 for practical testing)
  104 | 		const requestInterval = 5000; // Request every 5 seconds
  105 | 		const concurrency = 3; // 3 concurrent requests
  106 | 
  107 | 		const startTime = Date.now();
  108 | 		const results: LoadTestResult[] = [];
  109 | 		let iteration = 0;
  110 | 
  111 | 		console.log(`\n⏱️  Starting soak test: ${testDuration / 60000} minutes`);
  112 | 
  113 | 		while (Date.now() - startTime < testDuration) {
  114 | 			iteration++;
  115 | 			const iterationStart = Date.now();
  116 | 
  117 | 			// Run concurrent requests
  118 | 			const batchPromises = Array.from({ length: concurrency }, async index => {
  119 | 				try {
  120 | 					const response = await request.post('/api/scan', {
  121 | 						data: { url: testUrl, quality: 'fast', mode: 'fast' },
  122 | 						timeout: 30000,
  123 | 					});
  124 | 
  125 | 					return {
  126 | 						timestamp: Date.now(),
  127 | 						success: response.ok(),
  128 | 						duration: Date.now() - iterationStart,
  129 | 						statusCode: response.status(),
  130 | 					};
  131 | 				} catch (error: any) {
  132 | 					return {
  133 | 						timestamp: Date.now(),
  134 | 						success: false,
  135 | 						duration: Date.now() - iterationStart,
  136 | 						error: error.message,
  137 | 					};
  138 | 				}
  139 | 			});
  140 | 
  141 | 			const batchResults = await Promise.all(batchPromises);
  142 | 			results.push(...batchResults);
  143 | 
  144 | 			// Log progress every 10 iterations
  145 | 			if (iteration % 10 === 0) {
  146 | 				const recentResults = results.slice(-30);
  147 | 				const recentSuccessRate = (recentResults.filter(r => r.success).length / recentResults.length) * 100;
  148 | 				const elapsed = ((Date.now() - startTime) / 60000).toFixed(1);
  149 | 				console.log(`  [${elapsed}m] Iteration ${iteration}, Recent Success: ${recentSuccessRate.toFixed(1)}%`);
  150 | 			}
  151 | 
  152 | 			// Wait before next iteration
  153 | 			const waitTime = Math.max(0, requestInterval - (Date.now() - iterationStart));
  154 | 			await new Promise(resolve => setTimeout(resolve, waitTime));
  155 | 		}
  156 | 
  157 | 		// Analyze stability over time
  158 | 		const totalRequests = results.length;
  159 | 		const successRate = (results.filter(r => r.success).length / totalRequests) * 100;
  160 | 
  161 | 		// Split into time windows to check for degradation
  162 | 		const windowSize = Math.floor(totalRequests / 5);
  163 | 		const windows = [];
  164 | 		for (let i = 0; i < 5; i++) {
  165 | 			const windowResults = results.slice(i * windowSize, (i + 1) * windowSize);
  166 | 			const windowSuccess = (windowResults.filter(r => r.success).length / windowResults.length) * 100;
  167 | 			windows.push(windowSuccess);
  168 | 		}
  169 | 
  170 | 		console.log(`\n📊 Soak Test Results:`);
  171 | 		console.log(`  Total Requests: ${totalRequests}`);
  172 | 		console.log(`  Overall Success Rate: ${successRate.toFixed(1)}%`);
  173 | 		console.log(`  Time Windows:`);
  174 | 		windows.forEach((rate, i) => {
  175 | 			console.log(`    Window ${i + 1}: ${rate.toFixed(1)}%`);
  176 | 		});
  177 | 
  178 | 		// Should maintain stability (no significant degradation)
  179 | 		const firstWindow = windows[0];
  180 | 		const lastWindow = windows[windows.length - 1];
  181 | 		const degradation = firstWindow - lastWindow;
  182 | 
  183 | 		expect(successRate).toBeGreaterThanOrEqual(70);
  184 | 		expect(degradation).toBeLessThan(20); // Less than 20% degradation
  185 | 	});
  186 | });
  187 | 
  188 | test.describe('Spike Testing - Sudden Traffic Bursts', () => {
  189 | 	test('should recover from traffic spikes', async ({ request }) => {
  190 | 		test.setTimeout(300000); // 5 minutes
  191 | 
  192 | 		const testUrl = 'https://example.com';
  193 | 		const normalLoad = 2;
  194 | 		const spikeLoad = 20;
```