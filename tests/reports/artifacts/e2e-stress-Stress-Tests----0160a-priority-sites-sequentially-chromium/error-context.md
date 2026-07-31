# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: e2e/stress.spec.ts >> Stress Tests - Sequential >> should scan high priority sites sequentially
- Location: tests/e2e/stress.spec.ts:62:6

# Error details

```
Error: expect(received).toBeGreaterThanOrEqual(expected)

Expected: >= 60
Received:    0
```

# Test source

```ts
  6   |  *
  7   |  * Tests high-load scenarios with real-world websites using async scan workflow
  8   |  * - Sequential scanning of multiple sites
  9   |  * - Concurrent scanning with worker pools
  10  |  * - Memory leak detection
  11  |  * - Performance benchmarking
  12  |  */
  13  | 
  14  | interface TestSite {
  15  | 	url: string;
  16  | 	priority: 'critical' | 'high' | 'medium' | 'low';
  17  | 	category: string;
  18  | 	expectedTokenCount?: number;
  19  | }
  20  | 
  21  | const STRESS_TEST_SITES: TestSite[] = [
  22  | 	// Critical - Must work
  23  | 	{ url: 'https://example.com', priority: 'critical', category: 'test', expectedTokenCount: 50 },
  24  | 
  25  | 	// High Priority - Major E-commerce
  26  | 	{ url: 'https://walmart.com', priority: 'high', category: 'e-commerce' },
  27  | 	{ url: 'https://amazon.com', priority: 'high', category: 'e-commerce' },
  28  | 	{ url: 'https://target.com', priority: 'high', category: 'e-commerce' },
  29  | 
  30  | 	// High Priority - Technology
  31  | 	{ url: 'https://apple.com', priority: 'high', category: 'technology' },
  32  | 	{ url: 'https://microsoft.com', priority: 'high', category: 'technology' },
  33  | 	{ url: 'https://stripe.com', priority: 'high', category: 'technology' },
  34  | 
  35  | 	// Medium Priority - Design Systems
  36  | 	{ url: 'https://vercel.com', priority: 'medium', category: 'design-system' },
  37  | 	{ url: 'https://shopify.com', priority: 'medium', category: 'design-system' },
  38  | ];
  39  | 
  40  | test.describe('Stress Tests - Sequential', () => {
  41  | 	test('should scan critical sites successfully', async ({ request }) => {
  42  | 		const criticalSites = STRESS_TEST_SITES.filter(s => s.priority === 'critical');
  43  | 
  44  | 		for (const site of criticalSites) {
  45  | 			const { result, duration } = await completeScan(request, site.url, {
  46  | 				mode: 'fast',
  47  | 				timeout: 120000,
  48  | 			});
  49  | 
  50  | 			assertScanSuccess(result, site.url);
  51  | 
  52  | 			const tokenCount = getTokenCount(result);
  53  | 			console.log(`✅ ${site.url}: ${duration}ms, ${tokenCount} tokens`);
  54  | 
  55  | 			// Verify we got reasonable token counts
  56  | 			if (site.expectedTokenCount) {
  57  | 				expect(tokenCount).toBeGreaterThan(site.expectedTokenCount * 0.5);
  58  | 			}
  59  | 		}
  60  | 	});
  61  | 
  62  | 	test('should scan high priority sites sequentially', async ({ request }) => {
  63  | 		test.setTimeout(600000); // 10 minutes total
  64  | 
  65  | 		const highPrioritySites = STRESS_TEST_SITES.filter(s => s.priority === 'high').slice(0, 3);
  66  | 		const results = [];
  67  | 
  68  | 		for (const site of highPrioritySites) {
  69  | 			try {
  70  | 				const { result, duration } = await completeScan(request, site.url, {
  71  | 					mode: 'fast',
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
> 106 | 		expect(successRate).toBeGreaterThanOrEqual(60);
      |                       ^ Error: expect(received).toBeGreaterThanOrEqual(expected)
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
  172 | 		expect(successCount + failureCount).toBe(burstSize);
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
```