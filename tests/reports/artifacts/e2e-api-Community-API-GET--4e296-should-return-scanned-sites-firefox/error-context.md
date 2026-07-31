# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: e2e/api.spec.ts >> Community API >> GET /api/community/sites - should return scanned sites
- Location: tests/e2e/api.spec.ts:90:6

# Error details

```
Error: expect(received).toBeTruthy()

Received: false
```

# Test source

```ts
  1   | import { test, expect } from '@playwright/test';
  2   | 
  3   | /**
  4   |  * API-only tests for scanner endpoints
  5   |  *
  6   |  * These tests validate the API layer without browser overhead
  7   |  */
  8   | 
  9   | test.describe('Scan API Endpoint', () => {
  10  | 	test('POST /api/scan - should scan valid URL', async ({ request }) => {
  11  | 		const response = await request.post('/api/scan', {
  12  | 			data: {
  13  | 				url: 'https://example.com',
  14  | 				quality: 'standard',
  15  | 				mode: 'fast',
  16  | 			},
  17  | 			timeout: 120000,
  18  | 		});
  19  | 
  20  | 		expect(response.ok()).toBeTruthy();
  21  | 		const data = await response.json();
  22  | 
  23  | 		expect(data).toHaveProperty('status');
  24  | 		expect(data.status).toBe('completed');
  25  | 		expect(data).toHaveProperty('tokens');
  26  | 	});
  27  | 
  28  | 	test('POST /api/scan - should reject invalid URL', async ({ request }) => {
  29  | 		const response = await request.post('/api/scan', {
  30  | 			data: {
  31  | 				url: 'not-a-url',
  32  | 				quality: 'standard',
  33  | 			},
  34  | 		});
  35  | 
  36  | 		expect(response.status()).toBeGreaterThanOrEqual(400);
  37  | 	});
  38  | 
  39  | 	test('POST /api/scan - should handle missing URL', async ({ request }) => {
  40  | 		const response = await request.post('/api/scan', {
  41  | 			data: {
  42  | 				quality: 'standard',
  43  | 			},
  44  | 		});
  45  | 
  46  | 		expect(response.status()).toBe(400);
  47  | 	});
  48  | 
  49  | 	test('POST /api/scan - should respect quality parameter', async ({ request }) => {
  50  | 		const qualities = ['fast', 'standard', 'thorough'];
  51  | 
  52  | 		for (const quality of qualities) {
  53  | 			const response = await request.post('/api/scan', {
  54  | 				data: {
  55  | 					url: 'https://example.com',
  56  | 					quality,
  57  | 				},
  58  | 				timeout: 120000,
  59  | 			});
  60  | 
  61  | 			if (response.ok()) {
  62  | 				const data = await response.json();
  63  | 				expect(data).toHaveProperty('status');
  64  | 			}
  65  | 		}
  66  | 	});
  67  | 
  68  | 	test('POST /api/scan - should handle timeout gracefully', async ({ request }) => {
  69  | 		test.setTimeout(10000);
  70  | 
  71  | 		try {
  72  | 			const response = await request.post('/api/scan', {
  73  | 				data: {
  74  | 					url: 'https://example.com',
  75  | 					quality: 'thorough',
  76  | 				},
  77  | 				timeout: 5000, // Short timeout to trigger error
  78  | 			});
  79  | 
  80  | 			// Either succeeds or fails gracefully
  81  | 			expect([200, 408, 500, 504]).toContain(response.status());
  82  | 		} catch (error: any) {
  83  | 			// Timeout is expected
  84  | 			expect(error.message).toMatch(/timeout|timed out/i);
  85  | 		}
  86  | 	});
  87  | });
  88  | 
  89  | test.describe('Community API', () => {
  90  | 	test('GET /api/community/sites - should return scanned sites', async ({ request }) => {
  91  | 		const response = await request.get('/api/community/sites');
  92  | 
  93  | 		expect(response.ok()).toBeTruthy();
  94  | 		const data = await response.json();
  95  | 
> 96  | 		expect(Array.isArray(data)).toBeTruthy();
      |                               ^ Error: expect(received).toBeTruthy()
  97  | 	});
  98  | 
  99  | 	test('GET /api/community/sites?search= - should filter results', async ({ request }) => {
  100 | 		const response = await request.get('/api/community/sites?search=example');
  101 | 
  102 | 		expect(response.ok()).toBeTruthy();
  103 | 		const data = await response.json();
  104 | 
  105 | 		expect(Array.isArray(data)).toBeTruthy();
  106 | 		if (data.length > 0) {
  107 | 			expect(data[0]).toHaveProperty('domain');
  108 | 		}
  109 | 	});
  110 | });
  111 | 
  112 | test.describe('Metrics API', () => {
  113 | 	test('GET /api/metrics - should return metrics', async ({ request }) => {
  114 | 		const response = await request.get('/api/metrics');
  115 | 
  116 | 		expect(response.ok()).toBeTruthy();
  117 | 		const data = await response.json();
  118 | 
  119 | 		expect(data).toHaveProperty('metrics');
  120 | 	});
  121 | 
  122 | 	test('POST /api/metrics/track - should track event', async ({ request }) => {
  123 | 		const response = await request.post('/api/metrics/track', {
  124 | 			data: {
  125 | 				event: 'scan_completed',
  126 | 				properties: {
  127 | 					url: 'https://example.com',
  128 | 					duration: 5000,
  129 | 				},
  130 | 			},
  131 | 		});
  132 | 
  133 | 		expect([200, 201, 204]).toContain(response.status());
  134 | 	});
  135 | });
```