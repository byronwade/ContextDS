# Performance Optimization Implementation Guide

## Quick Start: Apply All Optimizations

### 1. Database Indexes (CRITICAL - Do This First)

**Impact**: 5-10x speedup on all database queries

```bash
# Apply the performance indexes migration
bun run db:migrate

# Verify indexes were created
psql $DATABASE_URL -c "\d+ token_sets" | grep idx_

# Run ANALYZE to update query planner statistics
psql $DATABASE_URL -c "ANALYZE token_sets, scans, sites, css_content, layout_profiles, token_versions;"
```

**Expected Results**:
- Token search: 300ms → 50ms
- Site lookup: 200ms → 20ms
- Stats API: 500ms → 100ms

---

### 2. Verify Edge Runtime Configuration

**Files Already Modified**:
- ✅ `app/api/stats/route.ts` - Added `export const runtime = 'edge'`
- ✅ `app/api/search/route.ts` - Added `export const runtime = 'edge'`

**Test Edge Runtime**:
```bash
# Deploy to Vercel or test locally
curl -i https://your-domain.com/api/stats

# Check headers for edge runtime
# Should see: x-vercel-id (edge function ID)
# TTFB should be <100ms
```

---

### 3. Implement Site/Domain RSC Architecture

**Status**: Files created but reverted by linter

**Option A: Reapply RSC Changes**

1. Restore the three files from the performance branch:
   - `app/(marketing)/site/[domain]/page.tsx` (Server Component)
   - `app/(marketing)/site/[domain]/client.tsx` (Client boundary)
   - `app/(marketing)/site/[domain]/loading.tsx` (Loading UI)

2. Or manually convert the existing page:

```typescript
// app/(marketing)/site/[domain]/page.tsx
import { Suspense } from "react"
import { db, sites, tokenSets, scans } from "@/lib/db"
import { eq, desc } from "drizzle-orm"
import { SitePageClient } from "./client"
import { SitePageSkeleton } from "./loading"

export const runtime = 'edge'
export const revalidate = 30

interface PageProps {
  params: Promise<{ domain: string }>
}

export default async function SitePage({ params }: PageProps) {
  const { domain } = await params

  return (
    <Suspense fallback={<SitePageSkeleton domain={domain} />}>
      <SitePageContent domain={domain} />
    </Suspense>
  )
}

async function SitePageContent({ domain }: { domain: string }) {
  // Fetch site data from database
  const siteData = await db
    .select()
    .from(sites)
    .where(eq(sites.domain, domain))
    .limit(1)

  // Pass to client component
  return <SitePageClient domain={domain} siteData={siteData[0]} />
}

// Pre-render popular sites
export async function generateStaticParams() {
  const popularSites = await db
    .select({ domain: sites.domain })
    .from(sites)
    .orderBy(desc(sites.popularity))
    .limit(20)

  return popularSites.map((site) => ({
    domain: encodeURIComponent(site.domain || ''),
  }))
}
```

**Expected Impact**:
- First Load JS: 184 KB → ~120 KB (-35%)
- TTFB: 300ms → <100ms (-67%)
- LCP: 2.5s → 1.2s (-52%)

---

### 4. Monitor Performance Improvements

**A. Database Query Performance**

```sql
-- Check index usage
SELECT
  indexname,
  idx_scan as scans,
  idx_tup_read as tuples_read,
  idx_tup_fetch as tuples_fetched,
  pg_size_pretty(pg_relation_size(indexrelid)) as size
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
  AND tablename IN ('token_sets', 'sites', 'scans')
ORDER BY idx_scan DESC
LIMIT 20;

-- Find slow queries (requires pg_stat_statements)
SELECT
  substring(query, 1, 100) as query_preview,
  calls,
  round(mean_exec_time::numeric, 2) as avg_ms,
  round(total_exec_time::numeric, 2) as total_ms
FROM pg_stat_statements
WHERE mean_exec_time > 50
ORDER BY mean_exec_time DESC
LIMIT 10;
```

**B. Frontend Performance**

```typescript
// Add to app/layout.tsx or page components
import { track } from '@vercel/analytics'

// Track Core Web Vitals
if (typeof window !== 'undefined') {
  import('web-vitals').then(({ onLCP, onFID, onCLS, onINP, onTTFB }) => {
    onLCP(metric => track('LCP', { value: metric.value, route: window.location.pathname }))
    onFID(metric => track('FID', { value: metric.value, route: window.location.pathname }))
    onCLS(metric => track('CLS', { value: metric.value, route: window.location.pathname }))
    onINP(metric => track('INP', { value: metric.value, route: window.location.pathname }))
    onTTFB(metric => track('TTFB', { value: metric.value, route: window.location.pathname }))
  })
}
```

**C. API Route Performance**

```bash
# Test TTFB with curl
for i in {1..10}; do
  curl -w "TTFB: %{time_starttransfer}s\n" -o /dev/null -s https://your-domain.com/api/stats
done

# Expected: <0.1s consistently
```

---

## Validation Checklist

### Before Deployment
- [ ] Database indexes applied and verified
- [ ] Edge runtime routes tested (TTFB <100ms)
- [ ] Bundle size checked (First Load JS <170 KB)
- [ ] Site/domain page converted to RSC (optional but recommended)
- [ ] No TypeScript errors
- [ ] No ESLint errors
- [ ] Build successful: `bun run build`

### After Deployment
- [ ] Monitor Vercel Analytics for Core Web Vitals
- [ ] Check database query times (pg_stat_statements)
- [ ] Verify index usage (pg_stat_user_indexes)
- [ ] Test real-world page loads (Lighthouse CI)
- [ ] Monitor error rates (no regressions)

---

## Rollback Plan

If performance degrades after deployment:

### 1. Revert Edge Runtime (if causing issues)
```typescript
// app/api/stats/route.ts
// Remove this line:
// export const runtime = 'edge'
```

### 2. Remove Indexes (if causing lock issues)
```sql
-- Drop indexes one by one if needed
DROP INDEX CONCURRENTLY idx_token_sets_tokens_json_gin;
-- etc.
```

### 3. Revert RSC Changes
```bash
# If site/domain page has issues, revert to client-side version
git checkout HEAD~1 app/\(marketing\)/site/\[domain\]/page.tsx
```

---

## Performance Testing with MCP Tools

### Chrome DevTools MCP Testing

```typescript
// 1. Capture baseline
await mcp__chrome-devtools__new_page({ url: 'https://your-domain.com/site/stripe.com' })
await mcp__chrome-devtools__performance_start_trace({ reload: true, autoStop: true })
const baseline = await mcp__chrome-devtools__performance_stop_trace()

// 2. Apply optimizations (database indexes, edge runtime, etc.)

// 3. Capture optimized metrics
await mcp__chrome-devtools__performance_start_trace({ reload: true, autoStop: true })
const optimized = await mcp__chrome-devtools__performance_stop_trace()

// 4. Compare
console.log('Baseline LCP:', baseline.lcp)
console.log('Optimized LCP:', optimized.lcp)
console.log('Improvement:', ((baseline.lcp - optimized.lcp) / baseline.lcp * 100).toFixed(1) + '%')
```

### Playwright MCP Testing

```typescript
// Test with CPU throttling (simulate mobile)
await mcp__chrome-devtools__emulate_cpu({ throttlingRate: 4 })
await mcp__chrome-devtools__performance_start_trace({ reload: true })
await mcp__chrome-devtools__performance_stop_trace()

// Test with network throttling
await mcp__chrome-devtools__emulate_network({ throttlingOption: 'Slow 3G' })
await mcp__chrome-devtools__performance_start_trace({ reload: true })
await mcp__chrome-devtools__performance_stop_trace()
```

---

## Expected Timeline

| Task | Time | Priority |
|------|------|----------|
| Apply database indexes | 10 min | 🔴 Critical |
| Verify edge runtime | 5 min | 🟡 High |
| Implement site/domain RSC | 30 min | 🟡 High |
| Test with MCP tools | 20 min | 🟢 Medium |
| Monitor production | Ongoing | 🟢 Medium |

**Total Time**: ~65 minutes for full implementation

---

## Success Metrics

### Target Improvements (vs baseline)

| Metric | Before | After | Target |
|--------|--------|-------|--------|
| **Site/Domain TTFB** | 300ms | 100ms | -67% |
| **Site/Domain LCP** | 2.5s | 1.2s | -52% |
| **Stats API Response** | 500ms | 100ms | -80% |
| **Token Search** | 800ms | 150ms | -81% |
| **Database Queries** | 300ms | 50ms | -83% |
| **First Load JS** | 184 KB | 120 KB | -35% |

### Minimum Acceptable Performance

- ✅ Lighthouse Score: ≥95 (mobile)
- ✅ LCP: ≤1.8s
- ✅ CLS: ≤0.05
- ✅ INP: ≤200ms
- ✅ TTFB: ≤200ms (p95)
- ✅ First Load JS: ≤170 KB

---

## Troubleshooting

### Issue: Indexes Not Being Used

```sql
-- Check if index exists
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'token_sets';

-- Force index usage for testing
SET enable_seqscan = OFF;
EXPLAIN ANALYZE SELECT * FROM token_sets WHERE ...;
SET enable_seqscan = ON;
```

### Issue: Edge Runtime Errors

```typescript
// Check Vercel logs
vercel logs --follow

// Test locally with edge runtime
// Note: Some APIs (file system, Node.js modules) won't work in edge
```

### Issue: RSC Hydration Errors

```typescript
// Ensure server/client data matches
// Use React 19's <Suspense> properly
// Don't use browser APIs in Server Components
```

---

## Additional Resources

- **Database Indexes**: [PostgreSQL JSONB Performance](https://www.postgresql.org/docs/current/datatype-json.html#JSON-INDEXING)
- **Edge Runtime**: [Vercel Edge Functions](https://vercel.com/docs/functions/edge-functions)
- **React Server Components**: [Next.js App Router](https://nextjs.org/docs/app/building-your-application/rendering/server-components)
- **Performance Testing**: [Chrome DevTools Protocol](https://chromedevtools.github.io/devtools-protocol/)

---

**Last Updated**: October 1, 2025
**Version**: 1.0
**Status**: Ready for implementation
