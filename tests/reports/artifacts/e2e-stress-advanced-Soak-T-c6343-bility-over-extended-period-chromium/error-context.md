# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: e2e/stress-advanced.spec.ts >> Soak Testing - Long-Running Stability >> should maintain stability over extended period
- Location: tests/e2e/stress-advanced.spec.ts:99:6

# Error details

```
Error: expect(received).toBeGreaterThanOrEqual(expected)

Expected: >= 70
Received:    0
```

# Test source

```ts
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
  94  | 		expect(overallSuccessRate).toBeGreaterThanOrEqual(70);
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
> 183 | 		expect(successRate).toBeGreaterThanOrEqual(70);
      |                       ^ Error: expect(received).toBeGreaterThanOrEqual(expected)
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
  195 | 		const spikeDuration = 10000; // 10 seconds
  196 | 
  197 | 		console.log(`\n⚡ Spike Test: ${normalLoad} → ${spikeLoad} concurrent requests`);
  198 | 
  199 | 		// Phase 1: Normal load
  200 | 		console.log('\n📊 Phase 1: Normal load (30s)');
  201 | 		const normalResults = await runLoadPhase(request, testUrl, normalLoad, 30000);
  202 | 		const normalSuccessRate = (normalResults.filter(r => r.success).length / normalResults.length) * 100;
  203 | 		console.log(`  Normal Success Rate: ${normalSuccessRate.toFixed(1)}%`);
  204 | 
  205 | 		// Phase 2: Spike
  206 | 		console.log('\n⚡ Phase 2: Traffic spike (10s)');
  207 | 		const spikeResults = await runLoadPhase(request, testUrl, spikeLoad, spikeDuration);
  208 | 		const spikeSuccessRate = (spikeResults.filter(r => r.success).length / spikeResults.length) * 100;
  209 | 		console.log(`  Spike Success Rate: ${spikeSuccessRate.toFixed(1)}%`);
  210 | 
  211 | 		// Phase 3: Recovery
  212 | 		console.log('\n🔄 Phase 3: Recovery period (30s)');
  213 | 		const recoveryResults = await runLoadPhase(request, testUrl, normalLoad, 30000);
  214 | 		const recoverySuccessRate = (recoveryResults.filter(r => r.success).length / recoveryResults.length) * 100;
  215 | 		console.log(`  Recovery Success Rate: ${recoverySuccessRate.toFixed(1)}%`);
  216 | 
  217 | 		console.log(`\n📊 Spike Test Summary:`);
  218 | 		console.log(`  Normal: ${normalSuccessRate.toFixed(1)}%`);
  219 | 		console.log(`  Spike: ${spikeSuccessRate.toFixed(1)}%`);
  220 | 		console.log(`  Recovery: ${recoverySuccessRate.toFixed(1)}%`);
  221 | 
  222 | 		// System should maintain some success during spike and recover after
  223 | 		expect(spikeSuccessRate).toBeGreaterThan(30); // At least 30% during spike
  224 | 		expect(recoverySuccessRate).toBeGreaterThan(normalSuccessRate * 0.8); // Recovery within 80%
  225 | 	});
  226 | 
  227 | 	test('should handle multiple consecutive spikes', async ({ request }) => {
  228 | 		test.setTimeout(300000);
  229 | 
  230 | 		const testUrl = 'https://example.com';
  231 | 		const spikes = [10, 15, 20];
  232 | 
  233 | 		const spikeResults = [];
  234 | 
  235 | 		for (let i = 0; i < spikes.length; i++) {
  236 | 			console.log(`\n⚡ Spike ${i + 1}: ${spikes[i]} concurrent requests`);
  237 | 			const results = await runLoadPhase(request, testUrl, spikes[i], 5000);
  238 | 			const successRate = (results.filter(r => r.success).length / results.length) * 100;
  239 | 			spikeResults.push(successRate);
  240 | 			console.log(`  Success Rate: ${successRate.toFixed(1)}%`);
  241 | 
  242 | 			// Recovery period between spikes
  243 | 			await new Promise(resolve => setTimeout(resolve, 5000));
  244 | 		}
  245 | 
  246 | 		// Should handle escalating spikes gracefully
  247 | 		expect(spikeResults.every(rate => rate > 20)).toBeTruthy();
  248 | 	});
  249 | });
  250 | 
  251 | test.describe('Chaos Testing - Failure Scenarios', () => {
  252 | 	test('should handle invalid URLs gracefully under load', async ({ request }) => {
  253 | 		test.setTimeout(120000);
  254 | 
  255 | 		const invalidUrls = [
  256 | 			'not-a-url',
  257 | 			'http://',
  258 | 			'https://',
  259 | 			'javascript:alert(1)',
  260 | 			'//example.com',
  261 | 			'ftp://invalid.com',
  262 | 			'<script>alert(1)</script>',
  263 | 			'https://this-domain-does-not-exist-12345.com',
  264 | 		];
  265 | 
  266 | 		const results = await Promise.all(
  267 | 			invalidUrls.map(async url => {
  268 | 				try {
  269 | 					const response = await request.post('/api/scan', {
  270 | 						data: { url, quality: 'fast' },
  271 | 						timeout: 10000,
  272 | 					});
  273 | 					return {
  274 | 						url,
  275 | 						statusCode: response.status(),
  276 | 						handled: response.status() >= 400 && response.status() < 500,
  277 | 					};
  278 | 				} catch (error: any) {
  279 | 					return {
  280 | 						url,
  281 | 						error: error.message,
  282 | 						handled: true, // Timeout/network errors are acceptable
  283 | 					};
```