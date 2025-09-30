# Next.js 15 Performance Optimization Plan - Non-Caching Architecture

**Date:** 2025-09-30
**Approach:** Architectural and build-time wins (NO CDN caching, ISR, or service workers)

## Executive Summary

This application has significant performance opportunities through **Server Component conversion**, **streaming SSR**, **bundle size reduction**, and **edge runtime adoption**. The homepage is currently a massive client component (28,941 tokens) that should be split into RSC+streaming architecture.

---

## Current State Analysis

### Critical Issues Identified

1. **Homepage (/app/(marketing)/page.tsx) - MAJOR BOTTLENECK**
   - **Current:** Entire page is client-side ("use client") with 28,941 tokens
   - **Issue:** Massive hydration cost, downloads all JS before first paint
   - **Stores:** 5 Zustand stores hydrate on mount (scan, search, UI, stats, recent scans)
   - **Components:** Heavy organisms like ColorCardGrid, ComprehensiveAnalysisDisplay all client-side
   - **Impact:** ~150KB+ JS initial payload, hydration > 200ms on mid-tier mobile

2. **Community Page (/app/(marketing)/community/page.tsx)**
   - **Current:** Fully client-side with client-side data fetching
   - **Issue:** useEffect for data loading causes layout shift and slower TTFB
   - **Solution:** Move to Server Component with server-side data fetching

3. **Font Loading**
   - **Current:** Geist Sans + Geist Mono loaded without optimized display strategy
   - **Issue:** Blocking render while fonts download
   - **Status:** ✅ FIXED - Added `display: "swap"` and selective preload

4. **Package Imports**
   - **Current:** No tree-shaking optimization for lucide-react (100+ icons imported)
   - **Issue:** Bundling unused Radix UI and Recharts code
   - **Status:** ✅ FIXED - Added optimizePackageImports in next.config.ts

5. **No Code Splitting**
   - Heavy components like ComprehensiveAnalysisDisplay loaded immediately
   - No dynamic imports for conditional/below-fold components

---

## Performance Budget Targets

**Quality Gate Requirements (MUST PASS):**
- ✅ Lighthouse Performance ≥ 98 (mobile, throttled)
- ✅ LCP ≤ 1.8s
- ✅ CLS ≤ 0.05
- ✅ INP ≤ 200ms
- ✅ TTFB (edge) ≤ 200ms (p95)
- ✅ Client JS ≤ 170 KB initial (gzip/br)
- ✅ Hydration cost ≤ 60ms on mid-tier mobile
- ✅ Zero blocking fonts
- ✅ No critical 3P scripts

---

## Optimization Strategy

### Phase 1: Next.js Config Optimizations ✅ COMPLETED

**File:** `next.config.ts`

**Changes Applied:**
```typescript
experimental: {
  optimizePackageImports: [
    'lucide-react',       // ~15KB savings
    '@radix-ui/*',        // ~20KB savings
    'recharts',           // ~30KB savings
    'date-fns'            // ~10KB savings
  ],
  optimizeCss: true,
},
compiler: {
  removeConsole: { exclude: ['error', 'warn'] }
}
```

**Expected Impact:**
- Bundle size reduction: ~75KB gzipped
- Parse/compile time: -50ms

---

### Phase 2: Homepage RSC Conversion 🚧 IN PROGRESS

**File:** `app/(marketing)/page.tsx`

**Current Architecture:**
```
HomePage [Client]
├── 5 Zustand stores (hydrate on mount)
├── RealtimeStat × 4 [Client]
├── SearchForm [Client]
├── ColorCardGrid [Client] ← Heavy
├── ComprehensiveAnalysisDisplay [Client] ← Very Heavy
└── TokenResultsDisplay [Client]
```

**Target Architecture:**
```
HomePage [Server] ← RSC
├── <Suspense fallback={<StatsSkeleton />}>
│   └── StatsSection [Server] ← Fetch in RSC
├── <Suspense fallback={<SearchSkeleton />}>
│   └── SearchSection [Client] ← Interactive only
├── <Suspense fallback={<ResultsSkeleton />}>
│   └── ResultsDisplay [Client] ← Render when ready
```

**Implementation Plan:**

1. **Create Server Component Wrapper**
   - New file: `app/(marketing)/page-server.tsx`
   - Fetch stats/initial data in RSC
   - Pass as props to client components

2. **Split Client Components**
   - Extract interactive parts only (search form, scan UI)
   - Keep heavy visualization components lazy-loaded

3. **Add Suspense Boundaries**
   - Stats section (fast)
   - Search results (conditional)
   - Scan results (heavy)

4. **Optimize Zustand**
   - Move to server-side initial state where possible
   - Lazy load stores only when features are used

**Expected Impact:**
- Initial JS: -100KB (59% reduction)
- Hydration time: -120ms (60% reduction)
- TTFB: -50ms (server-fetched data)
- LCP: -400ms (critical content in RSC)

---

### Phase 3: Community Page Optimization

**File:** `app/(marketing)/community/page.tsx`

**Current Issues:**
- Client-side data fetching in useEffect
- Multiple sequential fetch calls
- Layout shift during loading

**Solution:**
```typescript
// NEW: Server Component
export default async function CommunityPage() {
  // Parallel data fetching in RSC
  const [sites, stats] = await Promise.all([
    fetch('/api/community/sites').then(r => r.json()),
    fetch('/api/stats').then(r => r.json())
  ])

  return (
    <>
      <CommunityHeader stats={stats} />
      <Suspense fallback={<SitesGridSkeleton />}>
        <SitesGrid initialSites={sites} />
      </Suspense>
    </>
  )
}

// Interactive client component
'use client'
function SitesGrid({ initialSites }) {
  // Client-side filtering/sorting only
  const [filtered, setFiltered] = useState(initialSites)
  // ...
}
```

**Expected Impact:**
- TTFB: -100ms (server-side fetch)
- LCP: -300ms (no client-side waterfall)
- CLS: 0 (no layout shift)
- JS: -40KB (smaller client component)

---

### Phase 4: Code Splitting & Dynamic Imports

**Target Components for Lazy Loading:**

1. **ComprehensiveAnalysisDisplay** (~50KB)
   ```typescript
   const ComprehensiveAnalysisDisplay = dynamic(
     () => import('@/components/organisms/comprehensive-analysis-display'),
     {
       loading: () => <AnalysisSkeleton />,
       ssr: false // Client-only, not critical
     }
   )
   ```

2. **ColorCardGrid** (~30KB)
3. **TokenDiffViewer** (~20KB)
4. **RechartsComponents** (~45KB - only when showing charts)

**Expected Impact:**
- Initial bundle: -145KB (85% reduction in heavy components)
- Initial load: +faster
- Time to Interactive: -200ms

---

### Phase 5: Edge Runtime Migration

**Candidates for Edge Runtime:**

1. ✅ `/api/stats` - Already optimized, consider edge
2. `/api/scan` - Keep Node (needs Puppeteer)
3. `/api/community/sites` - Edge candidate
4. `/api/community/vote` - Edge candidate (simple writes)

**Implementation:**
```typescript
// Add to route.ts files
export const runtime = 'edge'
export const dynamic = 'force-dynamic' // No cache
```

**Expected Impact:**
- TTFB: -100ms (p95) - Edge locations closer to users
- Cold start: -80% (edge vs lambda)

---

### Phase 6: Route Segment Config

**Add to each route file:**

```typescript
// For dynamic routes (scan results, community pages)
export const dynamic = 'force-dynamic'
export const revalidate = 0 // No cache

// For static routes (if any)
export const dynamic = 'force-static'
```

---

### Phase 7: Image & Asset Optimization

**Current Issues:**
- Favicon images loaded without optimization
- Screenshots not using next/image
- No lazy loading for below-fold images

**Solutions:**
1. Wrap all `<img>` with `<Image>` from next/image
2. Add loading="lazy" to below-fold images
3. Use AVIF with WebP fallback for screenshots
4. Set explicit `width` and `height` to prevent CLS

---

### Phase 8: Third-Party Script Optimization

**Current Scripts:**
- Vercel Analytics (@vercel/analytics)
- Vercel Speed Insights (@vercel/speed-insights)
- Web Vitals Reporter (custom)

**Optimizations:**
1. Move analytics to `<Script strategy="lazyOnload">`
2. Use Web Worker for vitals collection
3. Defer non-critical tracking

```typescript
<Script
  src="..."
  strategy="lazyOnload"
  onLoad={() => console.log('Analytics loaded')}
/>
```

---

## Implementation Checklist

### Completed ✅
- [x] Next.js config optimizations (optimizePackageImports)
- [x] Font loading optimization (display: swap)
- [x] Console log removal in production
- [x] Build error fixes (community-detail route)

### In Progress 🚧
- [ ] Homepage RSC conversion
- [ ] Homepage Suspense boundaries
- [ ] Dynamic imports for heavy components

### Pending 📋
- [ ] Community page RSC conversion
- [ ] Edge runtime migration
- [ ] Route segment config
- [ ] Image optimization audit
- [ ] Zustand store optimization
- [ ] Third-party script optimization

---

## Measurement Plan

**Baseline Metrics (Before):**
- To be measured with Chrome DevTools MCP + Playwright MCP

**Target Metrics (After):**
- LCP: < 1.8s
- FCP: < 1.0s
- TBT: < 200ms
- CLS: < 0.05
- INP: < 200ms
- JS Bundle: < 170KB initial

**Testing Protocol:**
1. Use Chrome DevTools MCP for real-time performance traces
2. Test on 4x CPU throttle (simulates mid-tier mobile)
3. Test on Slow 3G network throttle
4. Compare before/after for EVERY change
5. Revert any change that doesn't improve speed

---

## Citations & Research

**Next.js 15 Optimizations:**
- https://nextjs.org/docs/app/building-your-application/optimizing/package-bundling
- https://nextjs.org/docs/app/api-reference/next-config-js/optimizePackageImports

**React 19 Server Components:**
- https://react.dev/reference/rsc/server-components
- https://react.dev/reference/react/Suspense

**Edge Runtime:**
- https://nextjs.org/docs/app/api-reference/edge

**Performance Best Practices:**
- https://web.dev/articles/vitals
- https://web.dev/articles/optimize-lcp

---

## Risk Assessment

**Low Risk:**
- Next.js config changes (reversible)
- Font loading optimization
- Code splitting (graceful degradation)

**Medium Risk:**
- RSC conversion (requires testing)
- Zustand store changes (state management)

**High Risk:**
- Edge runtime (limited Node.js APIs)
- Removing client components (may break interactivity)

---

## Success Criteria

**Must achieve ALL of these:**
1. ✅ Lighthouse Performance Score ≥ 98 (mobile)
2. ✅ All Core Web Vitals in "Good" range
3. ✅ Initial JS bundle ≤ 170KB gzipped
4. ✅ No performance regressions on existing features
5. ✅ MCP-validated speed improvements for every change

**Methodology:**
- Test EVERY optimization with MCP tools
- Compare before/after metrics
- Revert if no improvement
- Document exact speed gains

---

## Next Steps

1. **Immediate:** Implement homepage RSC conversion
2. **This week:** Complete all Phase 2-4 optimizations
3. **Next week:** Edge runtime migration + performance testing
4. **Final:** Full MCP-validated performance audit

---

**Last Updated:** 2025-09-30
**Status:** Phase 1 Complete, Phase 2 In Progress