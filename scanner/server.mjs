/**
 * Design Contracts browser scanner microservice.
 * Runs Playwright Chromium in Docker for accurate CSS + screenshot capture.
 *
 * Endpoints:
 *   GET  /health
 *   POST /scan  { url, screenshot?: boolean }
 */

import http from 'node:http'
import { chromium } from 'playwright'

const PORT = Number(process.env.PORT || 4040)
const MAX_CSS_BYTES = 8 * 1024 * 1024
const SCANNER_SECRET = process.env.SCANNER_SERVICE_SECRET?.trim() || ''

function isPrivateIPv4(ip) {
  const parts = ip.split('.').map(Number)
  if (parts.length !== 4 || parts.some((p) => Number.isNaN(p) || p < 0 || p > 255)) return true
  return (
    parts[0] === 10 ||
    parts[0] === 127 ||
    (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) ||
    (parts[0] === 192 && parts[1] === 168) ||
    parts[0] === 0 ||
    (parts[0] === 169 && parts[1] === 254) ||
    parts[0] === 255
  )
}

function assertPublicUrl(rawUrl) {
  const url = new URL(rawUrl)
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error('Only http(s) URLs are allowed')
  }
  const hostname = url.hostname.toLowerCase()
  const port = url.port || (url.protocol === 'https:' ? '443' : '80')
  if (!['80', '443', '8080'].includes(port)) {
    throw new Error('Only ports 80, 443, and 8080 are allowed')
  }
  if (
    hostname === 'localhost' ||
    hostname.endsWith('.localhost') ||
    hostname.endsWith('.local') ||
    hostname.endsWith('.internal') ||
    hostname === '169.254.169.254' ||
    hostname === 'metadata.google.internal'
  ) {
    throw new Error('Cannot scan local or metadata hosts')
  }
  if (/^\d{1,3}(?:\.\d{1,3}){3}$/.test(hostname) && isPrivateIPv4(hostname)) {
    throw new Error('Cannot scan private IP addresses')
  }
  return url
}

async function collectPage(url, { screenshot = true } = {}) {
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
  })

  try {
    const page = await browser.newPage({
      viewport: { width: 1440, height: 900 },
      userAgent:
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 DesignContractsBot/1.0 (+https://designcontracts.sh)',
    })

    // Prefer domcontentloaded — networkidle hangs on modern SPAs with open sockets.
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 })
    await new Promise((resolve) => setTimeout(resolve, 1500))

    const payload = await page.evaluate(() => {
      const sheets = []
      for (const sheet of Array.from(document.styleSheets)) {
        try {
          const href = sheet.href || null
          const rules = Array.from(sheet.cssRules || [])
            .map((rule) => rule.cssText)
            .join('\n')
          if (rules) {
            sheets.push({
              kind: href ? 'link' : 'inline',
              url: href,
              content: rules,
              bytes: rules.length,
            })
          }
        } catch {
          // cross-origin stylesheet — skip
        }
      }

      for (const style of Array.from(document.querySelectorAll('style'))) {
        const content = style.textContent || ''
        if (content.trim()) {
          sheets.push({
            kind: 'inline',
            url: null,
            content,
            bytes: content.length,
          })
        }
      }

      // Sample computed styles from key elements for CSS-in-JS sites
      const sampleSelectors = ['body', 'h1', 'h2', 'p', 'a', 'button', 'input', 'nav', 'main', 'header', 'footer']
      const computedChunks = []
      for (const selector of sampleSelectors) {
        const el = document.querySelector(selector)
        if (!el) continue
        const cs = getComputedStyle(el)
        const props = [
          'color',
          'background-color',
          'font-family',
          'font-size',
          'font-weight',
          'line-height',
          'letter-spacing',
          'border-radius',
          'box-shadow',
          'padding',
          'margin',
          'gap',
        ]
        const decls = props.map((prop) => `  ${prop}: ${cs.getPropertyValue(prop)};`).join('\n')
        computedChunks.push(`${selector} {\n${decls}\n}`)
      }

      if (computedChunks.length) {
        const content = computedChunks.join('\n\n')
        sheets.push({
          kind: 'computed',
          url: location.href,
          content,
          bytes: content.length,
        })
      }

      return {
        finalUrl: location.href,
        title: document.title,
        sheets,
      }
    })

    let screenshotBase64 = null
    if (screenshot) {
      try {
        const buffer = await page.screenshot({ type: 'jpeg', quality: 72, fullPage: false })
        screenshotBase64 = buffer.toString('base64')
      } catch {
        screenshotBase64 = null
      }
    }

    let total = 0
    const sources = []
    for (const sheet of payload.sheets) {
      if (total + sheet.bytes > MAX_CSS_BYTES) break
      sources.push(sheet)
      total += sheet.bytes
    }

    return {
      url: payload.finalUrl,
      title: payload.title,
      sources,
      screenshot: screenshotBase64
        ? { mime: 'image/jpeg', base64: screenshotBase64 }
        : null,
      bytes: total,
      sourceCount: sources.length,
    }
  } finally {
    await browser.close()
  }
}

function sendJson(res, status, body) {
  const json = JSON.stringify(body)
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(json),
  })
  res.end(json)
}

const server = http.createServer(async (req, res) => {
  try {
    if (req.method === 'GET' && req.url === '/health') {
      return sendJson(res, 200, { ok: true, service: 'designcontracts-scanner' })
    }

    if (req.method === 'POST' && req.url === '/scan') {
      if (SCANNER_SECRET) {
        const provided = req.headers['x-scanner-secret']
        if (provided !== SCANNER_SECRET) {
          return sendJson(res, 401, { error: 'Unauthorized' })
        }
      }

      const chunks = []
      for await (const chunk of req) chunks.push(chunk)
      const body = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}')
      const url = String(body.url || '').trim()
      if (!url.startsWith('http')) {
        return sendJson(res, 400, { error: 'url must be an absolute http(s) URL' })
      }
      assertPublicUrl(url)
      const result = await collectPage(url, { screenshot: body.screenshot !== false })
      return sendJson(res, 200, { status: 'completed', ...result })
    }

    sendJson(res, 404, { error: 'not found' })
  } catch (error) {
    console.error('[scanner]', error)
    sendJson(res, 500, {
      error: error instanceof Error ? error.message : 'scanner failed',
    })
  }
})

server.listen(PORT, () => {
  console.log(`[designcontracts-scanner] listening on :${PORT}`)
})
