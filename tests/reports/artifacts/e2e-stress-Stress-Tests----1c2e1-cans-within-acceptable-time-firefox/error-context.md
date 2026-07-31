# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: e2e/stress.spec.ts >> Stress Tests - Performance >> should complete scans within acceptable time
- Location: tests/e2e/stress.spec.ts:177:6

# Error details

```
Error: No scanId returned from scan start
```

# Test source

```ts
  55  | export async function pollScanProgress(request: any, scanId: string, options: PollOptions = {}): Promise<ScanResult> {
  56  | 	const timeout = options.timeout || 120000; // 2 minutes default
  57  | 	const expectSuccess = options.expectSuccess !== false; // Default to expecting success
  58  | 
  59  | 	const startTime = Date.now();
  60  | 
  61  | 	return new Promise(async (resolve, reject) => {
  62  | 		let lastEvent: any = null;
  63  | 		let completed = false;
  64  | 
  65  | 		const checkTimeout = setInterval(() => {
  66  | 			if (Date.now() - startTime > timeout && !completed) {
  67  | 				completed = true;
  68  | 				clearInterval(checkTimeout);
  69  | 				reject(new Error(`Scan timeout after ${timeout}ms. Last event: ${JSON.stringify(lastEvent)}`));
  70  | 			}
  71  | 		}, 1000);
  72  | 
  73  | 		try {
  74  | 			// Fetch the SSE stream
  75  | 			const response = await request.get(`/api/scan/progress?scanId=${scanId}`, {
  76  | 				timeout: timeout + 5000, // Add buffer to timeout
  77  | 			});
  78  | 
  79  | 			if (!response.ok()) {
  80  | 				completed = true;
  81  | 				clearInterval(checkTimeout);
  82  | 				reject(new Error(`Progress endpoint returned ${response.status()}`));
  83  | 				return;
  84  | 			}
  85  | 
  86  | 			// Read the response body as text
  87  | 			const body = await response.text();
  88  | 
  89  | 			// Parse SSE events from the body
  90  | 			const events = body
  91  | 				.split('\n\n')
  92  | 				.filter((chunk: string) => chunk.trim().startsWith('data:'))
  93  | 				.map((chunk: string) => {
  94  | 					try {
  95  | 						const jsonStr = chunk.replace(/^data:\s*/, '').trim();
  96  | 						return JSON.parse(jsonStr);
  97  | 					} catch (e) {
  98  | 						return null;
  99  | 					}
  100 | 				})
  101 | 				.filter((event: unknown): event is Record<string, unknown> => Boolean(event));
  102 | 
  103 | 			// Get the last event (most recent status)
  104 | 			if (events.length > 0) {
  105 | 				lastEvent = events[events.length - 1];
  106 | 
  107 | 				if (lastEvent.status === 'completed') {
  108 | 					completed = true;
  109 | 					clearInterval(checkTimeout);
  110 | 					resolve(lastEvent);
  111 | 					return;
  112 | 				}
  113 | 
  114 | 				if (lastEvent.status === 'failed') {
  115 | 					completed = true;
  116 | 					clearInterval(checkTimeout);
  117 | 					if (expectSuccess) {
  118 | 						reject(new Error(`Scan failed: ${lastEvent.error || 'Unknown error'}`));
  119 | 					} else {
  120 | 						resolve(lastEvent);
  121 | 					}
  122 | 					return;
  123 | 				}
  124 | 			}
  125 | 
  126 | 			// If we got here, the scan is still in progress or we couldn't parse events
  127 | 			// Treat as timeout
  128 | 			completed = true;
  129 | 			clearInterval(checkTimeout);
  130 | 			reject(new Error(`Scan did not complete. Last event: ${JSON.stringify(lastEvent)}`));
  131 | 		} catch (error: any) {
  132 | 			if (!completed) {
  133 | 				completed = true;
  134 | 				clearInterval(checkTimeout);
  135 | 				reject(error);
  136 | 			}
  137 | 		}
  138 | 	});
  139 | }
  140 | 
  141 | /**
  142 |  * Complete scan workflow: start + poll until completion
  143 |  */
  144 | export async function completeScan(
  145 | 	request: any,
  146 | 	url: string,
  147 | 	options: { quality?: string; mode?: string; timeout?: number; expectSuccess?: boolean } = {}
  148 | ): Promise<{ result: ScanResult; duration: number; scanId: string }> {
  149 | 	const startTime = Date.now();
  150 | 
  151 | 	// Start scan
  152 | 	const startResult = await startScan(request, url, options);
  153 | 
  154 | 	if (!startResult.scanId) {
> 155 | 		throw new Error('No scanId returned from scan start');
      |         ^ Error: No scanId returned from scan start
  156 | 	}
  157 | 
  158 | 	// Poll for completion
  159 | 	const result = await pollScanProgress(request, startResult.scanId, {
  160 | 		timeout: options.timeout || 120000,
  161 | 		expectSuccess: options.expectSuccess,
  162 | 	});
  163 | 
  164 | 	const duration = Date.now() - startTime;
  165 | 
  166 | 	return {
  167 | 		result,
  168 | 		duration,
  169 | 		scanId: startResult.scanId,
  170 | 	};
  171 | }
  172 | 
  173 | /**
  174 |  * Quick scan that expects to complete fast (for simple sites)
  175 |  */
  176 | export async function quickScan(request: any, url: string): Promise<ScanResult> {
  177 | 	const { result } = await completeScan(request, url, {
  178 | 		mode: 'fast',
  179 | 		quality: 'standard',
  180 | 		timeout: 60000, // 1 minute for quick scans
  181 | 	});
  182 | 	return result;
  183 | }
  184 | 
  185 | /**
  186 |  * Batch start multiple scans (for concurrent testing)
  187 |  */
  188 | export async function startBatchScans(request: any, urls: string[], options: { quality?: string; mode?: string } = {}): Promise<string[]> {
  189 | 	const scanIds: string[] = [];
  190 | 
  191 | 	for (const url of urls) {
  192 | 		try {
  193 | 			const result = await startScan(request, url, options);
  194 | 			if (result.scanId) {
  195 | 				scanIds.push(result.scanId);
  196 | 			}
  197 | 		} catch (error) {
  198 | 			console.error(`Failed to start scan for ${url}:`, error);
  199 | 		}
  200 | 	}
  201 | 
  202 | 	return scanIds;
  203 | }
  204 | 
  205 | /**
  206 |  * Poll multiple scans concurrently
  207 |  */
  208 | export async function pollBatchScans(
  209 | 	request: any,
  210 | 	scanIds: string[],
  211 | 	options: PollOptions = {}
  212 | ): Promise<Map<string, { success: boolean; result?: ScanResult; error?: string; duration: number }>> {
  213 | 	const results = new Map();
  214 | 
  215 | 	const pollPromises = scanIds.map(async scanId => {
  216 | 		const startTime = Date.now();
  217 | 		try {
  218 | 			const result = await pollScanProgress(request, scanId, {
  219 | 				...options,
  220 | 				expectSuccess: false, // Don't throw on failure in batch
  221 | 			});
  222 | 			const duration = Date.now() - startTime;
  223 | 
  224 | 			results.set(scanId, {
  225 | 				success: result.status === 'completed',
  226 | 				result,
  227 | 				duration,
  228 | 			});
  229 | 		} catch (error: any) {
  230 | 			const duration = Date.now() - startTime;
  231 | 			results.set(scanId, {
  232 | 				success: false,
  233 | 				error: error.message,
  234 | 				duration,
  235 | 			});
  236 | 		}
  237 | 	});
  238 | 
  239 | 	await Promise.all(pollPromises);
  240 | 	return results;
  241 | }
  242 | 
  243 | /**
  244 |  * Helper to extract token count from result
  245 |  */
  246 | export function getTokenCount(result: ScanResult): number {
  247 | 	if (result.summary?.tokensExtracted) {
  248 | 		return result.summary.tokensExtracted;
  249 | 	}
  250 | 
  251 | 	if (result.tokens) {
  252 | 		return Object.values(result.tokens).reduce((acc: number, group: any) => {
  253 | 			return acc + (Array.isArray(group) ? group.length : 0);
  254 | 		}, 0);
  255 | 	}
```