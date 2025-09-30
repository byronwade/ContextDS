# Testing Framework - Changes & Fixes

## Issues Fixed

### 1. API Parameter Mismatch
**Problem**: Tests were sending incorrect quality parameter values
- Tests sent: `fast`, `standard`, `comprehensive`
- API expects: `basic`, `standard`, `premium`

**Solution**: Updated all test files to use correct parameters:
- `tests/stress-test-scanner.ts`: Changed quality values and added `mode: 'fast'`
- `tests/api-endpoint-tests.ts`: Updated quality values in all test cases

### 2. Missing Server Check
**Problem**: Tests failed immediately if dev server wasn't running
- No helpful error message
- Tests would just show "Unable to connect"

**Solution**: Added server validation
- Created `tests/utils/ensure-server.ts` utility
- Checks if server is running before starting tests
- Shows helpful error message with instructions
- Integrated into stress test runner

### 3. API Understanding
**Current API Schema** (`app/api/scan/route.ts`):
```typescript
{
  url: string (required),
  depth: '1' | '2' | '3' (default: '1'),
  prettify: boolean (default: false),
  quality: 'basic' | 'standard' | 'premium' (default: 'standard'),
  budget: number 0.01-1.0 (default: 0.15),
  mode: 'fast' | 'accurate' (default: 'accurate')
}
```

**Stress Tests Now Use**:
```json
{
  "url": "https://example.com",
  "quality": "standard",
  "mode": "fast"
}
```

## Files Modified

### Updated
1. `tests/stress-test-scanner.ts`
   - Fixed quality parameter values
   - Added `mode: 'fast'` for optimal performance
   - Added server check before running tests

2. `tests/api-endpoint-tests.ts`
   - Updated all quality parameter tests
   - Fixed form validation tests
   - Updated integration test

3. `tests/README.md`
   - Added prerequisite section about running dev server

4. `package.json`
   - Added `test:single` script for debugging individual sites

### Created
1. `tests/utils/ensure-server.ts`
   - Validates dev server is running
   - Provides helpful error messages
   - Can auto-start server (optional)

2. `tests/utils/test-single-site.ts`
   - Debug utility for testing single websites
   - Shows detailed request/response information
   - Helps diagnose individual site failures

3. `tests/QUICKSTART.md`
   - Simple getting started guide
   - Step-by-step instructions
   - Common troubleshooting tips

4. `tests/CHANGES.md` (this file)
   - Documents all changes and fixes

## How to Use

### Quick Test (after starting dev server)
```bash
# Terminal 1: Start dev server
bun dev

# Terminal 2: Run tests
bun run test:stress
```

### Debug Single Site
```bash
bun run test:single https://walmart.com
```

### Full Test Suite
```bash
bun run test:orchestrator
```

## Test Parameters Reference

### Quality Levels
- `basic`: Fast scan, basic tokens only
- `standard`: Balanced speed and accuracy
- `premium`: Comprehensive scan, all tokens

### Mode
- `fast`: Skip browser automation (~1.2s faster, 90% accuracy)
- `accurate`: Full scan with computed CSS (95% accuracy)

### Depth
- `1`: Homepage only
- `2`: Homepage + 1 level deep
- `3`: Homepage + 2 levels deep

## Next Steps

1. ✅ Fixed parameter mismatches
2. ✅ Added server validation
3. ✅ Created debug utilities
4. ⏳ Ready to run first test: `bun run test:stress`
5. ⏳ Review results and identify improvements
6. ⏳ Run recursive improvement loop
7. ⏳ Achieve 95%+ success rate

## Critical Fix (Round 3)

### ProgressEmitter Browser API Error
**Problem**: Scanner completely failing with `globalThis.dispatchEvent is not a function`
- `ProgressEmitter` was using browser-only `CustomEvent` and `dispatchEvent` APIs
- These APIs don't exist in Node.js runtime
- Caused all scans to fail with HTTP 500 error

**Root Cause**:
```typescript
// This fails in Node.js:
const customEvent = new CustomEvent(...)
globalThis.dispatchEvent(customEvent)
```

**Solution**:
- Added runtime check for `typeof globalThis.dispatchEvent === 'function'`
- Wrapped in try-catch for graceful degradation
- Progress events now optional (only work in browser/SSE context)
- API calls work without progress events

**Impact**: Scanner now works in Node.js environment (API calls, stress tests)

## Additional Fixes (Round 2)

### Token Count Extraction
**Problem**: Tests showed "0 tokens" even for successful scans
- Response structure: `data.summary.tokensExtracted` (not `data.tokens.length`)
- Token groups are objects, not arrays

**Solution**:
- Updated token extraction to check `data.summary.tokensExtracted` first
- Added fallback to count tokens in token groups object
- Enhanced debug utility to show summary metrics

### Timeout Issues
**Problem**: 120s timeout too short for large Fortune 500 sites
- Target.com, Costco, Apple, Microsoft all timing out
- These sites have massive CSS and complex layouts

**Solution**:
- Increased timeout from 120s to 300s (5 minutes)
- Using `mode: 'fast'` to skip browser automation
- Updated both stress test and debug utility

## Known Limitations

1. **Dev server must be running** - Tests won't auto-start it
2. **No retry logic yet** - Single request per site
3. **No rate limiting** - May hit rate limits on some sites
4. **No user agent rotation** - Some sites may block automated requests
5. **5 minute timeout** - Very large sites may still timeout

These limitations are tracked in `tests/todo.md` for future implementation.