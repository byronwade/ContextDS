# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: e2e/stress-advanced.spec.ts >> Spike Testing - Sudden Traffic Bursts >> should recover from traffic spikes
- Location: tests/e2e/stress-advanced.spec.ts:189:6

# Error details

```
Error: expect(received).toBeGreaterThan(expected)

Expected: > 30
Received:   0
```

# Test source

```ts
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
> 223 | 		expect(spikeSuccessRate).toBeGreaterThan(30); // At least 30% during spike
      |                            ^ Error: expect(received).toBeGreaterThan(expected)
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
  284 | 				}
  285 | 			})
  286 | 		);
  287 | 
  288 | 		console.log('\n🔥 Chaos Test - Invalid URLs:');
  289 | 		results.forEach(r => {
  290 | 			const status = r.statusCode ? `HTTP ${r.statusCode}` : r.error;
  291 | 			console.log(`  ${r.handled ? '✅' : '❌'} ${r.url}: ${status}`);
  292 | 		});
  293 | 
  294 | 		// All invalid URLs should be handled gracefully
  295 | 		const allHandled = results.every(r => r.handled);
  296 | 		expect(allHandled).toBeTruthy();
  297 | 	});
  298 | 
  299 | 	test('should handle mixed valid/invalid requests', async ({ request }) => {
  300 | 		test.setTimeout(180000);
  301 | 
  302 | 		const mixedUrls = [
  303 | 			{ url: 'https://example.com', valid: true },
  304 | 			{ url: 'not-a-url', valid: false },
  305 | 			{ url: 'https://stripe.com', valid: true },
  306 | 			{ url: 'javascript:void(0)', valid: false },
  307 | 			{ url: 'https://vercel.com', valid: true },
  308 | 			{ url: 'http://', valid: false },
  309 | 		];
  310 | 
  311 | 		const results = await Promise.all(
  312 | 			mixedUrls.map(async ({ url, valid }) => {
  313 | 				try {
  314 | 					const response = await request.post('/api/scan', {
  315 | 						data: { url, quality: 'fast', mode: 'fast' },
  316 | 						timeout: 30000,
  317 | 					});
  318 | 
  319 | 					return {
  320 | 						url,
  321 | 						valid,
  322 | 						success: response.ok(),
  323 | 						statusCode: response.status(),
```