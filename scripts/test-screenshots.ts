#!/usr/bin/env bun

/**
 * Test script for screenshot system
 *
 * Usage:
 *   bun scripts/test-screenshots.ts [url]
 *
 * Example:
 *   bun scripts/test-screenshots.ts https://stripe.com
 */

import { captureScreenshot } from '../lib/utils/screenshot'
import { uploadScreenshot } from '../lib/storage/blob-storage'
import { randomUUID } from 'crypto'

async function testScreenshots(url: string = 'https://stripe.com') {
  console.log('🎬 Testing Screenshot System')
  console.log(`📍 Target: ${url}`)
  console.log('─'.repeat(50))

  const testScanId = randomUUID()
  console.log(`\n📋 Test Scan ID: ${testScanId}\n`)

  const viewports = ['mobile', 'tablet', 'desktop'] as const

  for (const viewport of viewports) {
    try {
      const viewportSize = {
        mobile: { width: 375, height: 667 },
        tablet: { width: 768, height: 1024 },
        desktop: { width: 1920, height: 1080 },
      }[viewport]

      console.log(`📸 Capturing ${viewport} (${viewportSize.width}x${viewportSize.height})...`)
      const startTime = Date.now()

      // Capture screenshot
      const screenshot = await captureScreenshot({
        url,
        viewport: viewportSize,
        fullPage: false,
        waitForTimeout: 2000,
      })

      const captureTime = Date.now() - startTime
      console.log(`  ✓ Captured in ${captureTime}ms`)

      // Upload to Vercel Blob
      console.log(`  ☁️  Uploading to Vercel Blob...`)
      const uploadStartTime = Date.now()

      const uploaded = await uploadScreenshot({
        scanId: testScanId,
        viewport,
        buffer: screenshot.buffer,
      })

      const uploadTime = Date.now() - uploadStartTime
      console.log(`  ✓ Uploaded in ${uploadTime}ms`)
      console.log(`  📎 URL: ${uploaded.url}`)
      console.log(`  💾 Size: ${(uploaded.size / 1024).toFixed(2)} KB`)
      console.log('')

    } catch (error) {
      console.error(`  ❌ Failed: ${error instanceof Error ? error.message : error}`)
      console.log('')
    }
  }

  console.log('─'.repeat(50))
  console.log('✅ Screenshot test complete!')
  console.log(`\n📊 Results:`)
  console.log(`   Scan ID: ${testScanId}`)
  console.log(`   Viewports: ${viewports.join(', ')}`)
  console.log(`\n🔍 View in database:`)
  console.log(`   SELECT * FROM screenshots WHERE scan_id = '${testScanId}';`)
}

// Run test
const url = process.argv[2] || 'https://stripe.com'
testScreenshots(url)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('💥 Test failed:', error)
    process.exit(1)
  })