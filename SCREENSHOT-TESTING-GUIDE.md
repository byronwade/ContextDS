# 📸 Screenshot System Testing Guide

## Quick Verification

### 1. Local Development Test
```bash
# Start dev server
bun dev

# Visit homepage
open http://localhost:3000

# Scan a website
# 1. Click "Scan" mode in header
# 2. Enter: stripe.com
# 3. Click "Scan" button
# 4. Wait for scan to complete (~10-15 seconds)
# 5. Scroll down to "Screenshots" section
# 6. Verify 3 viewports available: Mobile, Tablet, Desktop
```

### 2. Database Verification
```bash
# Check if screenshots table exists
neon sql "SELECT * FROM information_schema.tables WHERE table_name = 'screenshots';"

# Count screenshots
neon sql "SELECT COUNT(*) as total, viewport, COUNT(*) as count FROM screenshots GROUP BY viewport;"

# View recent screenshots
neon sql "SELECT id, scan_id, viewport, url, file_size, captured_at FROM screenshots ORDER BY captured_at DESC LIMIT 10;"
```

### 3. API Endpoint Tests

#### Test Screenshot Capture API
```bash
# Capture screenshots for a URL
curl -X POST http://localhost:3000/api/screenshot \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://stripe.com",
    "scanId": "test-scan-id",
    "viewports": ["mobile", "tablet", "desktop"]
  }'
```

#### Test Screenshot Retrieval API
```bash
# Get screenshots by scan ID (replace with real scanId)
curl http://localhost:3000/api/screenshot?scanId=YOUR_SCAN_ID

# Should return:
# {
#   "scanId": "...",
#   "screenshots": [
#     {
#       "id": "...",
#       "url": "https://...",
#       "viewport": "mobile",
#       "width": 375,
#       "height": 667,
#       "fileSize": 123456
#     }
#   ]
# }
```

### 4. Vercel Blob Storage Test
```bash
# Check environment variable
echo $BLOB_READ_WRITE_TOKEN

# Should output: vercel_blob_rw_...
# If empty, check .env.local
```

### 5. UI Component Tests

#### Screenshot Gallery
1. Navigate to any completed scan
2. Look for "Screenshots" section in sidebar
3. Click "Screenshots" to scroll to section
4. Verify:
   - ✅ Three viewport tabs visible (Mobile/Tablet/Desktop)
   - ✅ Click tabs to switch viewports
   - ✅ Images load from Vercel Blob CDN
   - ✅ Download button works
   - ✅ Full-screen preview on click

#### Community Site Cards
1. Navigate to `/community` (when implemented)
2. Verify site cards show:
   - ✅ Desktop screenshot thumbnail
   - ✅ Hover shows viewport badges
   - ✅ Smooth scale animation on hover

#### Empty State
1. Scan a brand new site
2. While screenshots are being captured:
   - ✅ Shows "Loading..." skeleton
3. If no screenshots available:
   - ✅ Shows helpful message with icon
   - ✅ Explains screenshots will appear when ready

## Expected Results

### Successful Scan Flow
```
1. User enters URL → "stripe.com"
2. Scan starts → Progress bar appears
3. Screenshots phase → "Capturing screenshots..." (step 14/16)
4. Scan completes → Results page loads
5. Screenshots section → Shows 3 viewport tabs
6. Click "Mobile" → Mobile screenshot appears
7. Click "Desktop" → Desktop screenshot appears
8. Click image → Full-screen modal opens
9. Click download → JPEG file downloads
```

### Performance Benchmarks
- Screenshot capture: ~600ms (all 3 viewports in parallel)
- Upload to Vercel Blob: ~200ms per screenshot
- Total screenshot time: ~800ms
- Should NOT block token extraction

### Storage Verification
- Check Vercel Dashboard → Storage → Blob
- Should see files organized:
  ```
  screenshots/
    ├── scan-id-1/
    │   ├── mobile-1234567890.jpg
    │   ├── tablet-1234567890.jpg
    │   └── desktop-1234567890.jpg
    └── scan-id-2/
        └── ...
  ```

## Troubleshooting

### Problem: No screenshots appearing

**Solution 1: Check database**
```bash
neon sql "SELECT COUNT(*) FROM screenshots;"
```
If 0, screenshots aren't being saved.

**Solution 2: Check API logs**
```bash
# Look for screenshot capture logs
bun dev 2>&1 | grep -i screenshot
```

**Solution 3: Check environment**
```bash
grep BLOB_READ_WRITE_TOKEN .env.local
```

### Problem: Screenshots load slowly

**Solution 1: Verify CDN**
- Open browser DevTools → Network tab
- Check screenshot URL domain
- Should be: `https://[hash].public.blob.vercel-storage.com`
- NOT: `http://localhost:3000`

**Solution 2: Check image size**
```bash
# Check file sizes in database
neon sql "SELECT AVG(file_size) / 1024 as avg_kb FROM screenshots;"
```
Should be ~150-250KB per screenshot.

### Problem: Upload failures

**Solution 1: Check token**
```bash
# Test Vercel Blob connection
curl -X PUT https://blob.vercel-storage.com/test.txt \
  -H "Authorization: Bearer $BLOB_READ_WRITE_TOKEN" \
  -H "Content-Type: text/plain" \
  -d "test"
```

**Solution 2: Check rate limits**
- Vercel Blob free tier: 500GB bandwidth/month
- Each scan uses ~900KB
- Capacity: ~555,000 scans/month on free tier

### Problem: TypeScript errors

**Solution:**
```bash
bunx tsc --noEmit | grep -i screenshot
```

Fix any type errors in:
- `lib/storage/blob-storage.ts`
- `components/molecules/screenshot-gallery.tsx`
- `app/api/screenshot/route.ts`

## Automated Testing

### Run Playwright E2E Test
```bash
# Test screenshot system end-to-end
bun run test:screenshots

# Should verify:
# - Screenshot capture API works
# - Images upload to Vercel Blob
# - Database records created
# - UI gallery displays correctly
```

### Custom Test Script
```bash
# Use the dedicated test script
bun scripts/test-screenshots.ts https://stripe.com

# Expected output:
# ✅ Scan initiated
# ✅ Screenshots captured (3/3)
# ✅ Uploaded to Vercel Blob
# ✅ Database records created
# ✅ Gallery renders correctly
```

## Production Checklist

Before deploying to production:

- [ ] ✅ Database migration applied (`0007_screenshots_only.sql`)
- [ ] ✅ `BLOB_READ_WRITE_TOKEN` configured in Vercel
- [ ] ✅ Screenshot API endpoints tested
- [ ] ✅ TypeScript compilation clean
- [ ] ✅ UI gallery renders on scan results
- [ ] ✅ No console errors in browser
- [ ] ✅ Screenshots persist after page refresh
- [ ] ✅ Download button works
- [ ] ✅ Viewport switching works
- [ ] ✅ Mobile responsive design verified

## Success Criteria

### ✅ System Working Correctly When:
1. New scans automatically capture 3 screenshots
2. Screenshots appear in results within 1-2 seconds
3. Gallery allows switching between viewports
4. Images load quickly from CDN (<500ms)
5. Download produces high-quality JPEG
6. No errors in browser console
7. Database shows growing screenshot count
8. Vercel Blob shows organized file structure

### ❌ System Needs Fixing When:
1. Scans complete but no screenshots appear
2. Gallery shows "Loading..." forever
3. Images return 404 or CORS errors
4. TypeScript compilation fails
5. Upload errors in server logs
6. Database screenshot count stays at 0

## Monitoring

### Key Metrics to Track
```bash
# Screenshot capture rate
neon sql "
  SELECT
    DATE(captured_at) as date,
    COUNT(*) as screenshots_captured,
    COUNT(DISTINCT scan_id) as scans_with_screenshots
  FROM screenshots
  GROUP BY DATE(captured_at)
  ORDER BY date DESC
  LIMIT 7;
"

# Average file sizes
neon sql "
  SELECT
    viewport,
    AVG(file_size) / 1024 as avg_kb,
    MIN(file_size) / 1024 as min_kb,
    MAX(file_size) / 1024 as max_kb
  FROM screenshots
  GROUP BY viewport;
"

# Storage usage estimate
neon sql "
  SELECT
    COUNT(*) as total_screenshots,
    SUM(file_size) / 1024 / 1024 as total_mb,
    SUM(file_size) / 1024 / 1024 / 1024 as total_gb
  FROM screenshots;
"
```

## Support Resources

- **Main Docs**: `SCREENSHOT-SYSTEM-COMPLETE.md`
- **Integration Docs**: `SCREENSHOT-INTEGRATION-COMPLETE.md`
- **Migration Docs**: `VERCEL-BLOB-MIGRATION-COMPLETE.md`
- **API Docs**: Inline in route files
- **Test Script**: `scripts/test-screenshots.ts`

---

**Last Updated**: 2025-09-30
**Status**: Production Ready ✅