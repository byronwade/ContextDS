/**
 * Test Data and Utilities for E2E Tests
 */

export const TEST_URLS = {
	// Valid test URLs
	valid: {
		simple: 'https://example.com',
		complex: 'https://stripe.com',
		ecommerce: 'https://amazon.com',
		designSystem: 'https://vercel.com',
	},

	// Invalid URLs
	invalid: {
		malformed: 'not-a-valid-url',
		incomplete: 'http://',
		javascript: 'javascript:alert(1)',
		doubleSlash: '//example.com',
	},

	// Edge cases
	edge: {
		unreachable: 'https://this-domain-does-not-exist-12345.com',
		timeout: 'https://httpstat.us/200?sleep=30000',
		slow: 'https://httpstat.us/200?sleep=5000',
		error500: 'https://httpstat.us/500',
		error404: 'https://httpstat.us/404',
	},
};

export const EXPECTED_TOKEN_CATEGORIES = ['colors', 'typography', 'spacing', 'shadows', 'borders', 'radii'];

export const TEST_TIMEOUTS = {
	fast: 30000, // 30 seconds
	standard: 120000, // 2 minutes
	thorough: 300000, // 5 minutes
	stress: 600000, // 10 minutes
};

export interface ScanResult {
	status: 'completed' | 'failed' | 'timeout';
	tokens?: Record<string, any>;
	summary?: {
		tokensExtracted: number;
		categories: string[];
		duration: number;
	};
	error?: string;
}

export function validateScanResult(data: any): data is ScanResult {
	return data && typeof data === 'object' && 'status' in data;
}

export function countTokens(tokens: Record<string, any>): number {
	return Object.values(tokens).reduce((acc, group) => {
		return acc + (Array.isArray(group) ? group.length : 0);
	}, 0);
}

export function measurePerformance<T>(fn: () => Promise<T>): Promise<{ result: T; duration: number }> {
	const start = Date.now();
	return fn().then(result => ({
		result,
		duration: Date.now() - start,
	}));
}