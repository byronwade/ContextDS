# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: e2e/stress.spec.ts >> Stress Tests - Concurrent >> should handle burst traffic
- Location: tests/e2e/stress.spec.ts:148:6

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: 10
Received: 0
```

# Test source

```ts
  72  | 					timeout: 180000,
  73  | 				});
  74  | 
  75  | 				results.push({
  76  | 					url: site.url,
  77  | 					success: result.status === 'completed',
  78  | 					duration,
  79  | 					tokens: getTokenCount(result),
  80  | 				});
  81  | 
  82  | 				console.log(`✅ ${site.url}: ${duration}ms`);
  83  | 			} catch (error: any) {
  84  | 				results.push({
  85  | 					url: site.url,
  86  | 					success: false,
  87  | 					duration: 0,
  88  | 					error: error.message,
  89  | 				});
  90  | 				console.log(`❌ ${site.url}: ${error.message}`);
  91  | 			}
  92  | 
  93  | 			// Cooldown between scans
  94  | 			await new Promise(resolve => setTimeout(resolve, 2000));
  95  | 		}
  96  | 
  97  | 		// Calculate success rate
  98  | 		const successCount = results.filter(r => r.success).length;
  99  | 		const successRate = (successCount / results.length) * 100;
  100 | 
  101 | 		console.log(`\n📊 Sequential Test Results:`);
  102 | 		console.log(`Success Rate: ${successRate.toFixed(1)}%`);
  103 | 		console.log(`Successful: ${successCount}/${results.length}`);
  104 | 
  105 | 		// Expect at least 60% success rate
  106 | 		expect(successRate).toBeGreaterThanOrEqual(60);
  107 | 	});
  108 | });
  109 | 
  110 | test.describe('Stress Tests - Concurrent', () => {
  111 | 	test('should handle concurrent scans', async ({ request }) => {
  112 | 		test.setTimeout(300000); // 5 minutes
  113 | 
  114 | 		const sites = STRESS_TEST_SITES.slice(0, 5); // Test 5 sites concurrently
  115 | 		const urls = sites.map(s => s.url);
  116 | 
  117 | 		console.log(`\n🔥 Starting ${urls.length} concurrent scans...`);
  118 | 
  119 | 		// Start all scans
  120 | 		const scanIds = await startBatchScans(request, urls, { mode: 'fast' });
  121 | 		console.log(`Started ${scanIds.length} scans`);
  122 | 
  123 | 		// Poll all concurrently
  124 | 		const results = await pollBatchScans(request, scanIds, {
  125 | 			timeout: 180000,
  126 | 		});
  127 | 
  128 | 		// Log results
  129 | 		console.log(`\n🔥 Concurrent Test Results:`);
  130 | 		results.forEach((result, scanId) => {
  131 | 			const site = sites.find(s => true); // Would need to map scanId to URL
  132 | 			if (result.success && result.result) {
  133 | 				console.log(`✅ ${scanId.substring(0, 12)}: ${getTokenCount(result.result)} tokens`);
  134 | 			} else {
  135 | 				console.log(`❌ ${scanId.substring(0, 12)}: ${result.error}`);
  136 | 			}
  137 | 		});
  138 | 
  139 | 		const successCount = Array.from(results.values()).filter(r => r.success).length;
  140 | 		const successRate = (successCount / results.size) * 100;
  141 | 
  142 | 		console.log(`Success Rate: ${successRate.toFixed(1)}%`);
  143 | 
  144 | 		// Expect at least 40% success rate for concurrent tests
  145 | 		expect(successRate).toBeGreaterThanOrEqual(40);
  146 | 	});
  147 | 
  148 | 	test('should handle burst traffic', async ({ request }) => {
  149 | 		test.setTimeout(120000);
  150 | 
  151 | 		const testUrl = 'https://example.com';
  152 | 		const burstSize = 10;
  153 | 
  154 | 		const scanIds = await startBatchScans(request, Array(burstSize).fill(testUrl), {
  155 | 			mode: 'fast',
  156 | 		});
  157 | 
  158 | 		console.log(`⚡ Started ${scanIds.length} burst requests`);
  159 | 
  160 | 		const results = await pollBatchScans(request, scanIds, {
  161 | 			timeout: 60000,
  162 | 		});
  163 | 
  164 | 		const successCount = Array.from(results.values()).filter(r => r.success).length;
  165 | 		const failureCount = Array.from(results.values()).filter(r => !r.success).length;
  166 | 
  167 | 		console.log(`\n⚡ Burst Test Results:`);
  168 | 		console.log(`Successful: ${successCount}/${burstSize}`);
  169 | 		console.log(`Failed: ${failureCount}/${burstSize}`);
  170 | 
  171 | 		// Should either handle requests or fail gracefully
> 172 | 		expect(successCount + failureCount).toBe(burstSize);
      |                                       ^ Error: expect(received).toBe(expected) // Object.is equality
  173 | 	});
  174 | });
  175 | 
  176 | test.describe('Stress Tests - Performance', () => {
  177 | 	test('should complete scans within acceptable time', async ({ request }) => {
  178 | 		const testSite = STRESS_TEST_SITES.find(s => s.priority === 'critical')!;
  179 | 
  180 | 		const { result, duration } = await completeScan(request, testSite.url, {
  181 | 			mode: 'fast',
  182 | 			timeout: 60000,
  183 | 		});
  184 | 
  185 | 		assertScanSuccess(result);
  186 | 
  187 | 		// Fast mode should complete within 45 seconds for simple sites
  188 | 		expect(duration).toBeLessThan(45000);
  189 | 
  190 | 		console.log(`⏱️  Performance: ${duration}ms for ${testSite.url}`);
  191 | 	});
  192 | 
  193 | 	test('should not leak memory over multiple scans', async ({ request }) => {
  194 | 		test.setTimeout(300000);
  195 | 
  196 | 		const testUrl = 'https://example.com';
  197 | 		const iterations = 5;
  198 | 		const memoryReadings: number[] = [];
  199 | 
  200 | 		for (let i = 0; i < iterations; i++) {
  201 | 			if (global.gc) {
  202 | 				global.gc();
  203 | 			}
  204 | 
  205 | 			const memBefore = process.memoryUsage().heapUsed;
  206 | 
  207 | 			await completeScan(request, testUrl, {
  208 | 				mode: 'fast',
  209 | 				timeout: 60000,
  210 | 			});
  211 | 
  212 | 			const memAfter = process.memoryUsage().heapUsed;
  213 | 			const memDelta = memAfter - memBefore;
  214 | 
  215 | 			memoryReadings.push(memDelta);
  216 | 
  217 | 			console.log(`Iteration ${i + 1}: ${(memDelta / 1024 / 1024).toFixed(2)}MB delta`);
  218 | 
  219 | 			await new Promise(resolve => setTimeout(resolve, 1000));
  220 | 		}
  221 | 
  222 | 		// Calculate trend
  223 | 		const firstHalf = memoryReadings.slice(0, Math.floor(iterations / 2));
  224 | 		const secondHalf = memoryReadings.slice(Math.floor(iterations / 2));
  225 | 
  226 | 		const avgFirstHalf = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
  227 | 		const avgSecondHalf = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
  228 | 
  229 | 		console.log(`\n📊 Memory Analysis:`);
  230 | 		console.log(`First half avg: ${(avgFirstHalf / 1024 / 1024).toFixed(2)}MB`);
  231 | 		console.log(`Second half avg: ${(avgSecondHalf / 1024 / 1024).toFixed(2)}MB`);
  232 | 
  233 | 		// Second half should not be more than 2x first half
  234 | 		expect(avgSecondHalf).toBeLessThan(avgFirstHalf * 2);
  235 | 	});
  236 | });
  237 | 
  238 | test.describe('Stress Tests - Error Handling', () => {
  239 | 	test('should handle malformed URLs gracefully', async ({ request }) => {
  240 | 		const malformedUrls = ['not-a-url', 'http://', 'javascript:alert(1)', '//example.com'];
  241 | 
  242 | 		for (const url of malformedUrls) {
  243 | 			const response = await request.post('/api/scan', {
  244 | 				data: { url, quality: 'fast' },
  245 | 			});
  246 | 
  247 | 			// Should return 4xx error, not crash
  248 | 			expect(response.status()).toBeGreaterThanOrEqual(400);
  249 | 			expect(response.status()).toBeLessThan(500);
  250 | 		}
  251 | 	});
  252 | 
  253 | 	test('should handle unreachable domains gracefully', async ({ request }) => {
  254 | 		const unreachableDomains = ['https://this-domain-does-not-exist-12345.com'];
  255 | 
  256 | 		for (const url of unreachableDomains) {
  257 | 			try {
  258 | 				await completeScan(request, url, {
  259 | 					mode: 'fast',
  260 | 					timeout: 30000,
  261 | 					expectSuccess: false,
  262 | 				});
  263 | 			} catch (error: any) {
  264 | 				// Timeout/failure is acceptable
  265 | 				expect(error.message).toBeTruthy();
  266 | 			}
  267 | 		}
  268 | 	});
  269 | 
  270 | 	test('should handle slow/hanging responses', async ({ request }) => {
  271 | 		test.setTimeout(30000);
  272 | 
```