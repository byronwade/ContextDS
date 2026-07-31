# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: e2e/stress-advanced.spec.ts >> Chaos Testing - Failure Scenarios >> should handle mixed valid/invalid requests
- Location: tests/e2e/stress-advanced.spec.ts:299:6

# Error details

```
Error: expect(received).toBeGreaterThan(expected)

Expected: > 50
Received:   0
```

# Test source

```ts
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
  324 | 					};
  325 | 				} catch (error: any) {
  326 | 					return {
  327 | 						url,
  328 | 						valid,
  329 | 						success: false,
  330 | 						error: error.message,
  331 | 					};
  332 | 				}
  333 | 			})
  334 | 		);
  335 | 
  336 | 		console.log('\n🎲 Chaos Test - Mixed Requests:');
  337 | 		results.forEach(r => {
  338 | 			const status = r.statusCode ? `HTTP ${r.statusCode}` : r.error;
  339 | 			console.log(`  ${r.url} (${r.valid ? 'valid' : 'invalid'}): ${status}`);
  340 | 		});
  341 | 
  342 | 		// Valid URLs should mostly succeed, invalid should fail gracefully
  343 | 		const validResults = results.filter(r => r.valid);
  344 | 		const validSuccessRate = (validResults.filter(r => r.success).length / validResults.length) * 100;
> 345 | 		expect(validSuccessRate).toBeGreaterThan(50);
      |                            ^ Error: expect(received).toBeGreaterThan(expected)
  346 | 	});
  347 | });
  348 | 
  349 | test.describe('Resource Exhaustion Testing', () => {
  350 | 	test('should handle large payloads', async ({ request }) => {
  351 | 		test.setTimeout(120000);
  352 | 
  353 | 		const testUrl = 'https://example.com';
  354 | 		const largePayload = {
  355 | 			url: testUrl,
  356 | 			quality: 'thorough',
  357 | 			mode: 'comprehensive',
  358 | 			metadata: {
  359 | 				user: 'test-user',
  360 | 				tags: Array(1000).fill('test-tag'),
  361 | 				notes: 'x'.repeat(10000),
  362 | 			},
  363 | 		};
  364 | 
  365 | 		const response = await request.post('/api/scan', {
  366 | 			data: largePayload,
  367 | 			timeout: 60000,
  368 | 		});
  369 | 
  370 | 		// Should either handle it or reject gracefully
  371 | 		expect([200, 201, 400, 413]).toContain(response.status());
  372 | 	});
  373 | 
  374 | 	test('should handle concurrent large sites', async ({ request }) => {
  375 | 		test.setTimeout(600000);
  376 | 
  377 | 		const largeSites = ['https://amazon.com', 'https://walmart.com', 'https://target.com'];
  378 | 
  379 | 		const results = await Promise.all(
  380 | 			largeSites.map(async url => {
  381 | 				const startTime = Date.now();
  382 | 				try {
  383 | 					const response = await request.post('/api/scan', {
  384 | 						data: { url, quality: 'standard', mode: 'fast' },
  385 | 						timeout: 180000,
  386 | 					});
  387 | 
  388 | 					return {
  389 | 						url,
  390 | 						success: response.ok(),
  391 | 						duration: Date.now() - startTime,
  392 | 					};
  393 | 				} catch (error: any) {
  394 | 					return {
  395 | 						url,
  396 | 						success: false,
  397 | 						duration: Date.now() - startTime,
  398 | 						error: error.message,
  399 | 					};
  400 | 				}
  401 | 			})
  402 | 		);
  403 | 
  404 | 		console.log('\n📦 Large Sites Test:');
  405 | 		results.forEach(r => {
  406 | 			console.log(`  ${r.success ? '✅' : '❌'} ${r.url}: ${r.duration}ms`);
  407 | 		});
  408 | 
  409 | 		const successRate = (results.filter(r => r.success).length / results.length) * 100;
  410 | 		expect(successRate).toBeGreaterThan(30); // At least 30% success for large sites
  411 | 	});
  412 | });
  413 | 
  414 | test.describe('Rate Limit Testing', () => {
  415 | 	test('should enforce rate limits', async ({ request }) => {
  416 | 		test.setTimeout(120000);
  417 | 
  418 | 		const testUrl = 'https://example.com';
  419 | 		const rapidRequests = 50;
  420 | 
  421 | 		console.log(`\n🚦 Rate Limit Test: ${rapidRequests} rapid requests`);
  422 | 
  423 | 		const results = await Promise.all(
  424 | 			Array.from({ length: rapidRequests }, async (_, i) => {
  425 | 				try {
  426 | 					const response = await request.post('/api/scan', {
  427 | 						data: { url: testUrl, quality: 'fast' },
  428 | 						timeout: 10000,
  429 | 					});
  430 | 					return {
  431 | 						index: i,
  432 | 						statusCode: response.status(),
  433 | 						rateLimited: response.status() === 429,
  434 | 					};
  435 | 				} catch (error: any) {
  436 | 					return {
  437 | 						index: i,
  438 | 						error: error.message,
  439 | 						rateLimited: false,
  440 | 					};
  441 | 				}
  442 | 			})
  443 | 		);
  444 | 
  445 | 		const successCount = results.filter(r => r.statusCode === 200 || r.statusCode === 201).length;
```