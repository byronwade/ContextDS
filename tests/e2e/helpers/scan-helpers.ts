import { expect } from '@playwright/test';

/**
 * Scan Helper Utilities for Async Workflow
 *
 * The scan API returns immediately with status: "started" and a scanId.
 * Results are streamed via SSE to /api/scan/progress?scanId=X
 */

export interface ScanResult {
	status: 'started' | 'completed' | 'failed';
	scanId?: string;
	domain?: string;
	message?: string;
	error?: string;
	tokens?: Record<string, any>;
	summary?: {
		tokensExtracted: number;
		categories?: string[];
		duration?: number;
	};
}

export interface PollOptions {
	timeout?: number;
	interval?: number;
	expectSuccess?: boolean;
}

/**
 * Start a scan and return the scanId
 */
export async function startScan(request: any, url: string, options: { quality?: string; mode?: string } = {}): Promise<ScanResult> {
	const response = await request.post('/api/scan', {
		data: {
			url,
			quality: options.quality || 'standard',
			mode: options.mode || 'fast',
		},
		timeout: 30000,
	});

	if (!response.ok()) {
		const errorText = await response.text().catch(() => 'Unknown error');
		throw new Error(`Scan start failed: ${response.status()} - ${errorText}`);
	}

	return await response.json();
}

/**
 * Poll the progress endpoint until scan completes or times out
 * The progress endpoint uses Server-Sent Events (SSE), so we need to parse the stream
 */
export async function pollScanProgress(request: any, scanId: string, options: PollOptions = {}): Promise<ScanResult> {
	const timeout = options.timeout || 120000; // 2 minutes default
	const expectSuccess = options.expectSuccess !== false; // Default to expecting success

	const startTime = Date.now();

	return new Promise(async (resolve, reject) => {
		let lastEvent: any = null;
		let completed = false;

		const checkTimeout = setInterval(() => {
			if (Date.now() - startTime > timeout && !completed) {
				completed = true;
				clearInterval(checkTimeout);
				reject(new Error(`Scan timeout after ${timeout}ms. Last event: ${JSON.stringify(lastEvent)}`));
			}
		}, 1000);

		try {
			// Fetch the SSE stream
			const response = await request.get(`/api/scan/progress?scanId=${scanId}`, {
				timeout: timeout + 5000, // Add buffer to timeout
			});

			if (!response.ok()) {
				completed = true;
				clearInterval(checkTimeout);
				reject(new Error(`Progress endpoint returned ${response.status()}`));
				return;
			}

			// Read the response body as text
			const body = await response.text();

			// Parse SSE events from the body
			const events = body
				.split('\n\n')
				.filter((chunk: string) => chunk.trim().startsWith('data:'))
				.map((chunk: string) => {
					try {
						const jsonStr = chunk.replace(/^data:\s*/, '').trim();
						return JSON.parse(jsonStr);
					} catch (e) {
						return null;
					}
				})
				.filter((event: unknown): event is Record<string, unknown> => Boolean(event));

			// Get the last event (most recent status)
			if (events.length > 0) {
				lastEvent = events[events.length - 1];

				if (lastEvent.status === 'completed') {
					completed = true;
					clearInterval(checkTimeout);
					resolve(lastEvent);
					return;
				}

				if (lastEvent.status === 'failed') {
					completed = true;
					clearInterval(checkTimeout);
					if (expectSuccess) {
						reject(new Error(`Scan failed: ${lastEvent.error || 'Unknown error'}`));
					} else {
						resolve(lastEvent);
					}
					return;
				}
			}

			// If we got here, the scan is still in progress or we couldn't parse events
			// Treat as timeout
			completed = true;
			clearInterval(checkTimeout);
			reject(new Error(`Scan did not complete. Last event: ${JSON.stringify(lastEvent)}`));
		} catch (error: any) {
			if (!completed) {
				completed = true;
				clearInterval(checkTimeout);
				reject(error);
			}
		}
	});
}

/**
 * Complete scan workflow: start + poll until completion
 */
export async function completeScan(
	request: any,
	url: string,
	options: { quality?: string; mode?: string; timeout?: number; expectSuccess?: boolean } = {}
): Promise<{ result: ScanResult; duration: number; scanId: string }> {
	const startTime = Date.now();

	// Start scan
	const startResult = await startScan(request, url, options);

	if (!startResult.scanId) {
		throw new Error('No scanId returned from scan start');
	}

	// Poll for completion
	const result = await pollScanProgress(request, startResult.scanId, {
		timeout: options.timeout || 120000,
		expectSuccess: options.expectSuccess,
	});

	const duration = Date.now() - startTime;

	return {
		result,
		duration,
		scanId: startResult.scanId,
	};
}

/**
 * Quick scan that expects to complete fast (for simple sites)
 */
export async function quickScan(request: any, url: string): Promise<ScanResult> {
	const { result } = await completeScan(request, url, {
		mode: 'fast',
		quality: 'standard',
		timeout: 60000, // 1 minute for quick scans
	});
	return result;
}

/**
 * Batch start multiple scans (for concurrent testing)
 */
export async function startBatchScans(request: any, urls: string[], options: { quality?: string; mode?: string } = {}): Promise<string[]> {
	const scanIds: string[] = [];

	for (const url of urls) {
		try {
			const result = await startScan(request, url, options);
			if (result.scanId) {
				scanIds.push(result.scanId);
			}
		} catch (error) {
			console.error(`Failed to start scan for ${url}:`, error);
		}
	}

	return scanIds;
}

/**
 * Poll multiple scans concurrently
 */
export async function pollBatchScans(
	request: any,
	scanIds: string[],
	options: PollOptions = {}
): Promise<Map<string, { success: boolean; result?: ScanResult; error?: string; duration: number }>> {
	const results = new Map();

	const pollPromises = scanIds.map(async scanId => {
		const startTime = Date.now();
		try {
			const result = await pollScanProgress(request, scanId, {
				...options,
				expectSuccess: false, // Don't throw on failure in batch
			});
			const duration = Date.now() - startTime;

			results.set(scanId, {
				success: result.status === 'completed',
				result,
				duration,
			});
		} catch (error: any) {
			const duration = Date.now() - startTime;
			results.set(scanId, {
				success: false,
				error: error.message,
				duration,
			});
		}
	});

	await Promise.all(pollPromises);
	return results;
}

/**
 * Helper to extract token count from result
 */
export function getTokenCount(result: ScanResult): number {
	if (result.summary?.tokensExtracted) {
		return result.summary.tokensExtracted;
	}

	if (result.tokens) {
		return Object.values(result.tokens).reduce((acc: number, group: any) => {
			return acc + (Array.isArray(group) ? group.length : 0);
		}, 0);
	}

	return 0;
}

/**
 * Assert scan succeeded
 */
export function assertScanSuccess(result: ScanResult, context?: string) {
	const ctx = context ? ` (${context})` : '';
	expect(result.status, `Expected successful scan${ctx}`).toBe('completed');
	expect(result.error, `Expected no error${ctx}`).toBeUndefined();
}