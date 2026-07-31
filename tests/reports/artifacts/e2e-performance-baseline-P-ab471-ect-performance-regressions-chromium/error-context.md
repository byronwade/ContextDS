# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: e2e/performance-baseline.spec.ts >> Performance Baselines >> should detect performance regressions
- Location: tests/e2e/performance-baseline.spec.ts:96:6

# Error details

```
Error: expect(received).toBeLessThan(expected)

Expected: < 50
Received:   NaN
```

# Test source

```ts
  24  | 
  25  | 		const testUrl = 'https://example.com';
  26  | 		const iterations = 50;
  27  | 		const metrics: PerformanceMetric[] = [];
  28  | 
  29  | 		console.log(`\n📊 Running ${iterations} iterations for baseline...`);
  30  | 
  31  | 		for (let i = 0; i < iterations; i++) {
  32  | 			const startTime = Date.now();
  33  | 
  34  | 			try {
  35  | 				const response = await request.post('/api/scan', {
  36  | 					data: { url: testUrl, quality: 'standard', mode: 'fast' },
  37  | 					timeout: 120000,
  38  | 				});
  39  | 
  40  | 				const duration = Date.now() - startTime;
  41  | 				const data = response.ok() ? await response.json() : null;
  42  | 
  43  | 				metrics.push({
  44  | 					name: `iteration-${i + 1}`,
  45  | 					duration,
  46  | 					timestamp: Date.now(),
  47  | 					success: response.ok(),
  48  | 					tokenCount: data?.summary?.tokensExtracted || 0,
  49  | 				});
  50  | 
  51  | 				if ((i + 1) % 10 === 0) {
  52  | 					console.log(`  Completed ${i + 1}/${iterations} iterations`);
  53  | 				}
  54  | 			} catch (error: any) {
  55  | 				metrics.push({
  56  | 					name: `iteration-${i + 1}`,
  57  | 					duration: Date.now() - startTime,
  58  | 					timestamp: Date.now(),
  59  | 					success: false,
  60  | 				});
  61  | 			}
  62  | 
  63  | 			// Brief pause between iterations
  64  | 			await new Promise(resolve => setTimeout(resolve, 1000));
  65  | 		}
  66  | 
  67  | 		// Calculate percentiles
  68  | 		const successfulMetrics = metrics.filter(m => m.success);
  69  | 		const durations = successfulMetrics.map(m => m.duration).sort((a, b) => a - b);
  70  | 
  71  | 		const p50 = durations[Math.floor(durations.length * 0.5)];
  72  | 		const p95 = durations[Math.floor(durations.length * 0.95)];
  73  | 		const p99 = durations[Math.floor(durations.length * 0.99)];
  74  | 		const avg = durations.reduce((sum, d) => sum + d, 0) / durations.length;
  75  | 		const min = Math.min(...durations);
  76  | 		const max = Math.max(...durations);
  77  | 
  78  | 		console.log(`\n📈 Performance Baseline Results:`);
  79  | 		console.log(`  Total Iterations: ${iterations}`);
  80  | 		console.log(`  Successful: ${successfulMetrics.length}`);
  81  | 		console.log(`  Success Rate: ${((successfulMetrics.length / iterations) * 100).toFixed(1)}%`);
  82  | 		console.log(`\n  Response Times:`);
  83  | 		console.log(`    Min: ${min}ms`);
  84  | 		console.log(`    P50 (median): ${p50}ms`);
  85  | 		console.log(`    P95: ${p95}ms`);
  86  | 		console.log(`    P99: ${p99}ms`);
  87  | 		console.log(`    Max: ${max}ms`);
  88  | 		console.log(`    Average: ${avg.toFixed(0)}ms`);
  89  | 
  90  | 		// Performance assertions
  91  | 		expect(p50).toBeLessThan(30000); // P50 under 30s
  92  | 		expect(p95).toBeLessThan(60000); // P95 under 60s
  93  | 		expect(successfulMetrics.length / iterations).toBeGreaterThan(0.9); // 90%+ success rate
  94  | 	});
  95  | 
  96  | 	test('should detect performance regressions', async ({ request }) => {
  97  | 		test.setTimeout(300000);
  98  | 
  99  | 		const testUrl = 'https://example.com';
  100 | 
  101 | 		// Run baseline (first 10 requests)
  102 | 		console.log('\n📊 Establishing baseline...');
  103 | 		const baselineMetrics = await runPerformanceTest(request, testUrl, 10);
  104 | 		const baselineAvg =
  105 | 			baselineMetrics.filter(m => m.success).reduce((sum, m) => sum + m.duration, 0) / baselineMetrics.filter(m => m.success).length;
  106 | 
  107 | 		console.log(`  Baseline Avg: ${baselineAvg.toFixed(0)}ms`);
  108 | 
  109 | 		// Wait and run comparison test
  110 | 		await new Promise(resolve => setTimeout(resolve, 30000));
  111 | 
  112 | 		console.log('\n🔄 Running comparison test...');
  113 | 		const comparisonMetrics = await runPerformanceTest(request, testUrl, 10);
  114 | 		const comparisonAvg =
  115 | 			comparisonMetrics.filter(m => m.success).reduce((sum, m) => sum + m.duration, 0) / comparisonMetrics.filter(m => m.success).length;
  116 | 
  117 | 		console.log(`  Comparison Avg: ${comparisonAvg.toFixed(0)}ms`);
  118 | 
  119 | 		const regression = ((comparisonAvg - baselineAvg) / baselineAvg) * 100;
  120 | 		console.log(`\n📉 Regression Analysis:`);
  121 | 		console.log(`  Change: ${regression > 0 ? '+' : ''}${regression.toFixed(1)}%`);
  122 | 
  123 | 		// Alert if performance degrades by more than 50%
> 124 | 		expect(regression).toBeLessThan(50);
      |                      ^ Error: expect(received).toBeLessThan(expected)
  125 | 	});
  126 | 
  127 | 	test('should measure throughput capacity', async ({ request }) => {
  128 | 		test.setTimeout(300000);
  129 | 
  130 | 		const testUrl = 'https://example.com';
  131 | 		const testDuration = 60000; // 1 minute
  132 | 		const concurrency = 5;
  133 | 
  134 | 		console.log(`\n🚀 Throughput Test: ${concurrency} concurrent for ${testDuration / 1000}s`);
  135 | 
  136 | 		const startTime = Date.now();
  137 | 		let completedRequests = 0;
  138 | 		let successfulRequests = 0;
  139 | 		const durations: number[] = [];
  140 | 
  141 | 		while (Date.now() - startTime < testDuration) {
  142 | 			const batchPromises = Array.from({ length: concurrency }, async () => {
  143 | 				const reqStart = Date.now();
  144 | 				try {
  145 | 					const response = await request.post('/api/scan', {
  146 | 						data: { url: testUrl, quality: 'fast', mode: 'fast' },
  147 | 						timeout: 30000,
  148 | 					});
  149 | 
  150 | 					const duration = Date.now() - reqStart;
  151 | 					completedRequests++;
  152 | 					if (response.ok()) {
  153 | 						successfulRequests++;
  154 | 						durations.push(duration);
  155 | 					}
  156 | 					return response.ok();
  157 | 				} catch (error) {
  158 | 					completedRequests++;
  159 | 					return false;
  160 | 				}
  161 | 			});
  162 | 
  163 | 			await Promise.all(batchPromises);
  164 | 			await new Promise(resolve => setTimeout(resolve, 2000));
  165 | 		}
  166 | 
  167 | 		const actualDuration = (Date.now() - startTime) / 1000;
  168 | 		const throughput = completedRequests / actualDuration;
  169 | 		const successfulThroughput = successfulRequests / actualDuration;
  170 | 		const avgDuration = durations.reduce((sum, d) => sum + d, 0) / durations.length;
  171 | 
  172 | 		console.log(`\n📊 Throughput Results:`);
  173 | 		console.log(`  Duration: ${actualDuration.toFixed(1)}s`);
  174 | 		console.log(`  Total Requests: ${completedRequests}`);
  175 | 		console.log(`  Successful: ${successfulRequests}`);
  176 | 		console.log(`  Throughput: ${throughput.toFixed(2)} req/s`);
  177 | 		console.log(`  Successful Throughput: ${successfulThroughput.toFixed(2)} req/s`);
  178 | 		console.log(`  Avg Response Time: ${avgDuration.toFixed(0)}ms`);
  179 | 
  180 | 		// Should achieve reasonable throughput
  181 | 		expect(throughput).toBeGreaterThan(0.1); // At least 0.1 req/s
  182 | 	});
  183 | });
  184 | 
  185 | test.describe('Bottleneck Detection', () => {
  186 | 	test('should identify slow response patterns', async ({ request }) => {
  187 | 		test.setTimeout(300000);
  188 | 
  189 | 		const testUrls = [
  190 | 			{ url: 'https://example.com', category: 'simple' },
  191 | 			{ url: 'https://stripe.com', category: 'medium' },
  192 | 			{ url: 'https://amazon.com', category: 'complex' },
  193 | 		];
  194 | 
  195 | 		const results = [];
  196 | 
  197 | 		for (const site of testUrls) {
  198 | 			console.log(`\n🔍 Testing ${site.url} (${site.category})...`);
  199 | 			const iterations = 5;
  200 | 			const durations: number[] = [];
  201 | 
  202 | 			for (let i = 0; i < iterations; i++) {
  203 | 				const startTime = Date.now();
  204 | 				try {
  205 | 					const response = await request.post('/api/scan', {
  206 | 						data: { url: site.url, quality: 'standard', mode: 'fast' },
  207 | 						timeout: 180000,
  208 | 					});
  209 | 
  210 | 					if (response.ok()) {
  211 | 						durations.push(Date.now() - startTime);
  212 | 					}
  213 | 				} catch (error) {
  214 | 					// Skip failures
  215 | 				}
  216 | 
  217 | 				await new Promise(resolve => setTimeout(resolve, 2000));
  218 | 			}
  219 | 
  220 | 			if (durations.length > 0) {
  221 | 				const avg = durations.reduce((sum, d) => sum + d, 0) / durations.length;
  222 | 				const min = Math.min(...durations);
  223 | 				const max = Math.max(...durations);
  224 | 				const variance = max - min;
```