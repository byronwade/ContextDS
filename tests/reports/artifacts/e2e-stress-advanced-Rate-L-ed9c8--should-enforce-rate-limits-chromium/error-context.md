# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: e2e/stress-advanced.spec.ts >> Rate Limit Testing >> should enforce rate limits
- Location: tests/e2e/stress-advanced.spec.ts:415:6

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: 50
Received: 0
```

# Test source

```ts
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
  446 | 		const rateLimitedCount = results.filter(r => r.rateLimited).length;
  447 | 		const errorCount = results.filter(r => r.error).length;
  448 | 
  449 | 		console.log(`  Successful: ${successCount}`);
  450 | 		console.log(`  Rate Limited (429): ${rateLimitedCount}`);
  451 | 		console.log(`  Errors: ${errorCount}`);
  452 | 
  453 | 		// Should have some rate limiting or controlled responses
> 454 | 		expect(successCount + rateLimitedCount + errorCount).toBe(rapidRequests);
      |                                                        ^ Error: expect(received).toBe(expected) // Object.is equality
  455 | 	});
  456 | });
  457 | 
  458 | // Helper function
  459 | async function runLoadPhase(request: any, url: string, concurrency: number, duration: number): Promise<LoadTestResult[]> {
  460 | 	const results: LoadTestResult[] = [];
  461 | 	const startTime = Date.now();
  462 | 
  463 | 	while (Date.now() - startTime < duration) {
  464 | 		const batchPromises = Array.from({ length: concurrency }, async () => {
  465 | 			const reqStart = Date.now();
  466 | 			try {
  467 | 				const response = await request.post('/api/scan', {
  468 | 					data: { url, quality: 'fast', mode: 'fast' },
  469 | 					timeout: 30000,
  470 | 				});
  471 | 				return {
  472 | 					timestamp: Date.now(),
  473 | 					success: response.ok(),
  474 | 					duration: Date.now() - reqStart,
  475 | 					statusCode: response.status(),
  476 | 				};
  477 | 			} catch (error: any) {
  478 | 				return {
  479 | 					timestamp: Date.now(),
  480 | 					success: false,
  481 | 					duration: Date.now() - reqStart,
  482 | 					error: error.message,
  483 | 				};
  484 | 			}
  485 | 		});
  486 | 
  487 | 		const batchResults = await Promise.all(batchPromises);
  488 | 		results.push(...batchResults);
  489 | 
  490 | 		await new Promise(resolve => setTimeout(resolve, 1000));
  491 | 	}
  492 | 
  493 | 	return results;
  494 | }
```