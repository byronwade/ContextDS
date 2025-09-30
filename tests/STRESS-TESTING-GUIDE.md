# Advanced Stress Testing Guide

## Overview

Comprehensive stress testing suite with load, soak, spike, chaos, and performance baseline testing.

## Test Suites

### 1. Basic Stress Tests (`stress.spec.ts`)
Sequential and concurrent scanning with real-world websites.

```bash
# All basic stress tests
bun run test:stress

# Sequential only
bun run test:stress:sequential

# Concurrent only
bun run test:stress:concurrent
```

### 2. Advanced Stress Tests (`stress-advanced.spec.ts`)

#### Load Testing - Gradual Ramp-Up
Tests system behavior under increasing load with multiple phases:
- Warm-up (1 concurrent)
- Ramp-up (5 concurrent)
- Peak load (10 concurrent)
- Cool-down (2 concurrent)

```bash
bun run test:stress:load
```

**Expected Results:**
- ✅ 70%+ success rate overall
- 📊 Graceful degradation under load
- 🔄 Recovery after peak

#### Soak Testing - Long-Running Stability
10-30 minute tests to detect memory leaks and gradual degradation.

```bash
bun run test:stress:soak
```

**Validates:**
- Memory stability over time
- No performance degradation
- Consistent error rates
- Resource cleanup

**Expected Results:**
- ✅ 70%+ success rate maintained
- 📉 < 20% degradation between start and end
- 🔍 No memory leaks

#### Spike Testing - Traffic Bursts
Tests recovery from sudden traffic spikes:
- Normal load → 10x spike → Recovery

```bash
bun run test:stress:spike
```

**Phases:**
1. Normal (2 concurrent) - 30s
2. Spike (20 concurrent) - 10s
3. Recovery (2 concurrent) - 30s

**Expected Results:**
- ✅ 30%+ success during spike
- 🔄 Recovery within 80% of normal

#### Chaos Testing - Failure Scenarios
Invalid inputs, malformed URLs, mixed valid/invalid requests.

```bash
bun run test:stress:chaos
```

**Tests:**
- Invalid URL formats
- XSS attempts
- Non-existent domains
- Mixed valid/invalid batches

**Expected Results:**
- ✅ All errors handled gracefully
- 🛡️ No crashes or unhandled exceptions
- 📊 Proper HTTP status codes

### 3. Performance Baseline Tests (`performance-baseline.spec.ts`)

#### Response Time Baselines
Establishes P50/P95/P99 percentiles over 50 iterations.

```bash
bun run test:performance:baseline
```

**Metrics:**
- P50 (median): < 30s
- P95: < 60s
- P99: < 90s
- Success rate: > 90%

#### Regression Detection
Compares current performance against baseline.

```bash
bun run test:performance:baseline
```

**Alerts if:**
- Performance degrades > 50%
- Success rate drops
- Response times increase significantly

#### Throughput Testing
Measures requests per second capacity.

```bash
bun run test:performance
```

**Metrics:**
- Total throughput (req/s)
- Successful throughput (req/s)
- Average response time
- Resource utilization

#### Bottleneck Detection
Identifies slow patterns and performance issues.

```bash
bun run test:performance:bottleneck
```

**Tests:**
- Simple vs complex sites
- Cold start vs warm requests
- Response time variance
- Performance patterns

#### Capacity Planning
Determines maximum sustainable load.

```bash
bun run test:performance:capacity
```

**Process:**
1. Test increasing concurrency (1, 2, 5, 10, 15, 20)
2. Measure success rate at each level
3. Identify maximum with >80% success
4. Report sustainable capacity

## Test Matrix

| Test Type | Duration | Concurrency | Focus |
|-----------|----------|-------------|-------|
| Basic Sequential | ~5-10 min | 1 | Reliability |
| Basic Concurrent | ~5-10 min | 5 | Throughput |
| Load | ~2-5 min | 1→10→2 | Scalability |
| Soak | 10-30 min | 3 | Stability |
| Spike | ~2 min | 2→20→2 | Elasticity |
| Chaos | ~2-5 min | Varies | Resilience |
| Baseline | ~5-10 min | 1 | Benchmarks |
| Capacity | ~5-10 min | 1→20+ | Limits |

## Running Tests

### Quick Start
```bash
# Basic stress test
bun run test:stress

# All advanced tests
bun run test:stress:advanced

# All performance tests
bun run test:performance
```

### Full Suite
```bash
# Run everything (60+ minutes)
bun run test:stress
bun run test:stress:advanced
bun run test:performance
```

### Targeted Testing
```bash
# Just load testing
bun run test:stress:load

# Just chaos testing
bun run test:stress:chaos

# Just capacity planning
bun run test:performance:capacity
```

## Interpreting Results

### Success Rates
- **> 90%**: Excellent
- **70-90%**: Good
- **50-70%**: Acceptable under extreme load
- **< 50%**: Investigate issues

### Response Times
- **< 10s**: Fast
- **10-30s**: Normal
- **30-60s**: Slow
- **> 60s**: Very slow

### Load Patterns
- **Stable**: Consistent performance
- **Degrading**: Performance drops over time
- **Recovering**: Returns to baseline after load
- **Failing**: Cannot handle load

## Best Practices

1. **Run in Order**: Basic → Advanced → Performance
2. **Monitor Resources**: Check CPU, memory, disk during tests
3. **Test Incrementally**: Start with low load, increase gradually
4. **Document Baselines**: Save results for comparison
5. **Test Regularly**: Run weekly or after major changes

## CI/CD Integration

Stress tests run automatically on main branch pushes:
- Basic stress tests only (CI time limits)
- Full suite runs manually or nightly

## Troubleshooting

### High Failure Rates
- Check server resources (CPU, memory)
- Review timeout settings
- Verify network connectivity
- Check rate limiting

### Timeouts
- Increase test timeouts in spec file
- Reduce concurrency levels
- Check if sites are responding
- Review server capacity

### Memory Issues
- Run fewer concurrent requests
- Check for memory leaks in application
- Monitor heap usage during tests
- Review cleanup logic

## Advanced Configuration

Edit test files to adjust:
- Concurrency levels
- Test durations
- Target URLs
- Timeout values
- Success thresholds

Example:
```typescript
const concurrency = 10; // Adjust based on capacity
const testDuration = 60000; // 1 minute
const successThreshold = 0.8; // 80%
```
