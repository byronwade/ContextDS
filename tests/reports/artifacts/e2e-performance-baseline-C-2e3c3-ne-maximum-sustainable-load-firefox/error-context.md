# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: e2e/performance-baseline.spec.ts >> Capacity Planning >> should determine maximum sustainable load
- Location: tests/e2e/performance-baseline.spec.ts:303:6

# Error details

```
Error: expect(received).toBeGreaterThanOrEqual(expected)

Expected: >= 1
Received:    0
```

# Test source

```ts
  270 | 
  271 | 		// Warm requests
  272 | 		console.log('\n🔥 Warm Requests:');
  273 | 		const warmDurations: number[] = [];
  274 | 		for (let i = 0; i < 5; i++) {
  275 | 			const warmStart = Date.now();
  276 | 			try {
  277 | 				await request.post('/api/scan', {
  278 | 					data: { url: testUrl, quality: 'fast', mode: 'fast' },
  279 | 					timeout: 60000,
  280 | 				});
  281 | 				warmDurations.push(Date.now() - warmStart);
  282 | 			} catch (error) {
  283 | 				// Ignore
  284 | 			}
  285 | 			await new Promise(resolve => setTimeout(resolve, 2000));
  286 | 		}
  287 | 
  288 | 		const avgWarm = warmDurations.reduce((sum, d) => sum + d, 0) / warmDurations.length;
  289 | 		console.log(`  Avg Duration: ${avgWarm.toFixed(0)}ms`);
  290 | 
  291 | 		const coldStartPenalty = ((coldDuration - avgWarm) / avgWarm) * 100;
  292 | 		console.log(`\n📊 Cold Start Analysis:`);
  293 | 		console.log(`  Cold: ${coldDuration}ms`);
  294 | 		console.log(`  Warm: ${avgWarm.toFixed(0)}ms`);
  295 | 		console.log(`  Penalty: ${coldStartPenalty.toFixed(0)}%`);
  296 | 
  297 | 		// Warm requests should be somewhat faster or similar
  298 | 		expect(avgWarm).toBeLessThan(coldDuration * 2);
  299 | 	});
  300 | });
  301 | 
  302 | test.describe('Capacity Planning', () => {
  303 | 	test('should determine maximum sustainable load', async ({ request }) => {
  304 | 		test.setTimeout(600000);
  305 | 
  306 | 		const testUrl = 'https://example.com';
  307 | 		const loadLevels = [1, 2, 5, 10, 15, 20];
  308 | 
  309 | 		console.log('\n📈 Capacity Planning Test');
  310 | 		const capacityResults = [];
  311 | 
  312 | 		for (const concurrency of loadLevels) {
  313 | 			console.log(`\n🔹 Testing ${concurrency} concurrent requests...`);
  314 | 			const testDuration = 30000; // 30 seconds per level
  315 | 			const startTime = Date.now();
  316 | 			let completed = 0;
  317 | 			let successful = 0;
  318 | 
  319 | 			while (Date.now() - startTime < testDuration) {
  320 | 				const batchPromises = Array.from({ length: concurrency }, async () => {
  321 | 					try {
  322 | 						const response = await request.post('/api/scan', {
  323 | 							data: { url: testUrl, quality: 'fast', mode: 'fast' },
  324 | 							timeout: 30000,
  325 | 						});
  326 | 						completed++;
  327 | 						if (response.ok()) successful++;
  328 | 						return response.ok();
  329 | 					} catch (error) {
  330 | 						completed++;
  331 | 						return false;
  332 | 					}
  333 | 				});
  334 | 
  335 | 				await Promise.all(batchPromises);
  336 | 				await new Promise(resolve => setTimeout(resolve, 1000));
  337 | 			}
  338 | 
  339 | 			const successRate = (successful / completed) * 100;
  340 | 			capacityResults.push({
  341 | 				concurrency,
  342 | 				completed,
  343 | 				successful,
  344 | 				successRate,
  345 | 			});
  346 | 
  347 | 			console.log(`  Completed: ${completed}, Success Rate: ${successRate.toFixed(1)}%`);
  348 | 
  349 | 			// If success rate drops below 50%, stop testing higher loads
  350 | 			if (successRate < 50) {
  351 | 				console.log(`  ⚠️  Success rate too low, stopping capacity test`);
  352 | 				break;
  353 | 			}
  354 | 
  355 | 			// Brief recovery period
  356 | 			await new Promise(resolve => setTimeout(resolve, 10000));
  357 | 		}
  358 | 
  359 | 		console.log(`\n📊 Capacity Test Results:`);
  360 | 		capacityResults.forEach(r => {
  361 | 			console.log(`  ${r.concurrency} concurrent: ${r.successRate.toFixed(1)}% (${r.successful}/${r.completed})`);
  362 | 		});
  363 | 
  364 | 		// Find maximum sustainable load (>80% success rate)
  365 | 		const sustainable = capacityResults.filter(r => r.successRate >= 80);
  366 | 		const maxCapacity = sustainable.length > 0 ? Math.max(...sustainable.map(r => r.concurrency)) : 0;
  367 | 
  368 | 		console.log(`\n🎯 Maximum Sustainable Load: ${maxCapacity} concurrent requests`);
  369 | 
> 370 | 		expect(maxCapacity).toBeGreaterThanOrEqual(1);
      |                       ^ Error: expect(received).toBeGreaterThanOrEqual(expected)
  371 | 	});
  372 | });
  373 | 
  374 | // Helper function
  375 | async function runPerformanceTest(request: any, url: string, iterations: number): Promise<PerformanceMetric[]> {
  376 | 	const metrics: PerformanceMetric[] = [];
  377 | 
  378 | 	for (let i = 0; i < iterations; i++) {
  379 | 		const startTime = Date.now();
  380 | 		try {
  381 | 			const response = await request.post('/api/scan', {
  382 | 				data: { url, quality: 'fast', mode: 'fast' },
  383 | 				timeout: 60000,
  384 | 			});
  385 | 
  386 | 			metrics.push({
  387 | 				name: `test-${i}`,
  388 | 				duration: Date.now() - startTime,
  389 | 				timestamp: Date.now(),
  390 | 				success: response.ok(),
  391 | 			});
  392 | 		} catch (error) {
  393 | 			metrics.push({
  394 | 				name: `test-${i}`,
  395 | 				duration: Date.now() - startTime,
  396 | 				timestamp: Date.now(),
  397 | 				success: false,
  398 | 			});
  399 | 		}
  400 | 
  401 | 		await new Promise(resolve => setTimeout(resolve, 1000));
  402 | 	}
  403 | 
  404 | 	return metrics;
  405 | }
```