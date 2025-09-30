# Quick Start Guide - Stress Testing

## Prerequisites

1. **Start the dev server** (required for all tests):
```bash
bun dev
```

2. Wait for server to be ready (you'll see):
```
✓ Ready in XXXms
○ Local:   http://localhost:3000
```

## Running Tests

### Option 1: Quick Test (Recommended First Run)
Test 14 major websites sequentially (~15-20 minutes):
```bash
bun run test:stress
```

### Option 2: Full Sequential Test
Test all 90+ websites sequentially (~2-3 hours):
```bash
bun run test:stress:all
```

### Option 3: Parallel Test (Moderate)
Test all websites with 5 concurrent requests (~30-45 minutes):
```bash
bun run test:stress:parallel
```

### Option 4: Aggressive Test (Maximum Load)
Test all websites with 10 concurrent requests (~20-30 minutes):
```bash
bun run test:stress:aggressive
```

## Understanding Results

After each test, check the generated reports:

```bash
# View the markdown summary
cat tests/results/run-*.md | tail -100

# Or open the full JSON report
open tests/results/run-*.json
```

### Success Indicators
- ✅ = Scan completed successfully
- ❌ = Scan failed (check error type)

### Common Error Types
- **TIMEOUT**: Site took >120s to scan
- **HTTP_ERROR**: Site returned 4xx/5xx status
- **CONNECTION_REFUSED**: Site blocked the request
- **DNS_ERROR**: Domain name resolution failed
- **MEMORY_ERROR**: Out of memory during scan

## Example Output

```
🚀 Initializing stress test: run-1234567890
Filtering to high priority websites (14 sites)

📊 Running sequential test on 14 websites...

[1/14] Testing https://walmart.com...
  ✅ Success (8500ms, 342 tokens)
[2/14] Testing https://amazon.com...
  ✅ Success (12300ms, 456 tokens)
[3/14] Testing https://target.com...
  ❌ Failed: TIMEOUT - Request exceeded 120000ms

...

================================================================================
📊 STRESS TEST SUMMARY
================================================================================

Run ID: run-1234567890
Total Tests: 14
✅ Passed: 12 (85.71%)
❌ Failed: 2

⏱️  Performance:
  Average: 9500ms
  Max: 45000ms
  Min: 2300ms

🐛 Error Patterns:
  TIMEOUT: 2

================================================================================
```

## Next Steps

1. **Review the report** in `tests/results/`
2. **Identify patterns** in failures
3. **Apply fixes** based on recommendations
4. **Re-run tests** to validate improvements

## Debug Single Site

Test a single website with detailed output:

```bash
bun run test:single https://example.com
```

This will show:
- Request details
- Response status and headers
- Full response body
- Parsed JSON (if valid)
- Error details

Example:
```bash
bun run test:single https://walmart.com
```

## Troubleshooting

### "Unable to connect" Error
- Make sure dev server is running: `bun dev`
- Check server is on port 3000: `lsof -ti:3000`

### Tests Are Slow
- Use parallel mode: `bun run test:stress:parallel`
- Test only high priority: `bun run test:stress`

### Memory Errors
- Increase Node memory: `NODE_OPTIONS="--max-old-space-size=8192" bun run test:stress`
- Use sequential mode instead of parallel

### Too Many Failures
- Start with high priority sites only
- Check if your network/firewall is blocking requests
- Review error patterns in report

## Advanced Usage

### Run Specific Priority
```bash
# High priority only
bun tests/stress-test-scanner.ts sequential high

# Medium priority only
bun tests/stress-test-scanner.ts sequential medium

# Low priority only
bun tests/stress-test-scanner.ts sequential low
```

### Custom Concurrency
```bash
# Test with 3 concurrent requests
bun tests/stress-test-scanner.ts parallel all 3

# Test with 15 concurrent requests (aggressive!)
bun tests/stress-test-scanner.ts parallel all 15
```

## API Parameters

The scanner API accepts:
- `url`: Website URL (required)
- `quality`: `basic` | `standard` | `premium` (default: `standard`)
- `mode`: `fast` | `accurate` (default: `accurate`)
- `depth`: `1` | `2` | `3` (default: `1`)
- `prettify`: `true` | `false` (default: `false`)

Stress tests use `mode: fast` to optimize for speed.