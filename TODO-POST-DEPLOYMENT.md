# Post-Deployment Cleanup Tasks

## High Priority

### TypeScript Strictness (47 errors remaining)

#### API Routes - Implicit 'any' Types
- [ ] `app/api/community/sites/route.ts:65` - Add type for `site` parameter
- [ ] `app/api/export/route.ts:40` - Add types for `sites` and `eq` parameters
- [ ] `app/api/export/route.ts:43` - Add types for `tokenSets` and `desc` parameters
- [ ] `app/api/scans/[scanId]/screenshots/route.ts` - Add types for `.find()` callbacks (lines 28-30)
- [ ] `app/api/search/route.ts:81` - Fix `request.ip` property access (use headers instead)
- [ ] `app/api/search/route.ts:223,432` - Add explicit types for callback parameters
- [ ] `app/api/search/route.ts:506,514` - Fix `cssContent.content` property access (schema mismatch)
- [ ] `app/api/versions/[domain]/route.ts:46` - Add type for `v` parameter in map callback

#### Marketing Pages
- [ ] `app/(marketing)/page.tsx:800` - Add type for `f` parameter
- [ ] `app/(marketing)/page.tsx:1013` - Fix void return type issue
- [ ] `app/(marketing)/page.tsx:1185` - Fix format parameter type mismatch
- [ ] `app/(marketing)/page.tsx:1237,1248` - Fix missing `setSearchError` state setter

#### Components
- [ ] `components/organisms/minimal-header-wrapper.tsx:25` - Add `onSearch` prop to interface
- [ ] `components/organisms/scan-progress-viewer.tsx` - Add optional chaining or guards for undefined properties (lines 243, 249, 255, 261)
- [ ] `components/organisms/scan-results-layout.tsx` - Fix ref callback return types (multiple locations)

### Build Configuration
- [ ] **Remove temporary bypasses** from `next.config.ts`:
  ```typescript
  // Remove these after TypeScript errors are fixed:
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
  ```

### Security Vulnerabilities
- [ ] **esbuild** - GHSA-67mh-4wv8-2f99 (moderate severity)
- [ ] **tar-fs** - GHSA-pq67-2wwv-3xjx (high severity)
- [ ] **tar-fs** - GHSA-8cj5-5rvv-wf4v (high severity)
- [ ] **ws** - GHSA-3h5v-q93c-6h6q (high severity)

**Action**: Run `bun update` to patch dependencies, verify compatibility

## Medium Priority

### Code Quality
- [ ] Add explicit return types to all exported functions
- [ ] Replace remaining `any` types with proper types throughout codebase
- [ ] Add JSDoc comments to public API routes
- [ ] Improve error messages in catch blocks (currently many just log)

### Testing
- [ ] Fix implicit 'any' types in test fixtures:
  - `tests/e2e/fixtures/auth.ts:15,35`
  - `tests/e2e/helpers/scan-helpers.ts:92,93`
- [ ] Run full E2E test suite: `bun run test`
- [ ] Verify screenshot capture across all viewports
- [ ] Test scan results loading with minimal UX

### Performance
- [ ] Review bundle size after type cleanup (ensure no size regression)
- [ ] Profile scanning performance with MCP tools
- [ ] Test screenshot upload performance to Vercel Blob

## Low Priority

### Documentation
- [ ] Update README with screenshot system documentation
- [ ] Document new minimal loading UX patterns
- [ ] Add migration guide for Supabase → Vercel Blob

### Nice to Have
- [ ] Upgrade to latest Drizzle ORM (check for query builder improvements)
- [ ] Consider typed Drizzle queries with `.$inferSelect` for better autocomplete
- [ ] Add Storybook stories for new minimal loading states

## Cleanup Commands

```bash
# 1. Fix all TypeScript errors
bunx tsc --noEmit

# 2. Fix all ESLint warnings
bun lint

# 3. Update dependencies
bun update

# 4. Run security audit
bun audit

# 5. Run tests
bun run test

# 6. Build without bypasses
# (Remove bypasses from next.config.ts first)
bun run build
```

## Success Criteria

- [ ] `bunx tsc --noEmit` passes with 0 errors
- [ ] `bun lint` passes with 0 errors
- [ ] `bun audit` shows 0 high/critical vulnerabilities
- [ ] `bun run test` passes all E2E tests
- [ ] `bun run build` succeeds without bypasses
- [ ] Build time remains under 20 seconds
- [ ] No runtime errors in production logs

---

**Created**: 2025-09-30
**Status**: Pending
**Priority**: Post-deployment cleanup sprint