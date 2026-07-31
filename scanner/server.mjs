/**
 * Design Contracts browser scanner microservice.
 * Runs Playwright Chromium with a reused browser for accurate CSS + screenshots.
 *
 * Endpoints:
 *   GET  /health
 *   POST /scan  {
 *     url,
 *     screenshot?: boolean,
 *     pages?: number,            // extra same-origin pages to capture (0–4, default 3)
 *     paths?: string[],          // explicit extra paths to capture (overrides discovery)
 *     auth?: {                   // capture YOUR OWN authenticated surfaces (dashboards):
 *       cookies?: Array<{ name, value, domain?, path? }>,
 *       headers?: Record<string, string>,
 *     }
 *   }
 */

import http from 'node:http'

const PORT = Number(process.env.PORT || 4040)
const MAX_CSS_BYTES = 8 * 1024 * 1024
const SCANNER_SECRET = process.env.SCANNER_SERVICE_SECRET?.trim() || ''
const MAX_CONCURRENCY = Number(process.env.SCANNER_MAX_CONCURRENCY || 2)
const ON_VERCEL = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME)

let browserPromise = null
let activeScans = 0

async function launchBrowser() {
  // Vercel/Lambda: bundled Chromium. Local/Docker: full Playwright browsers.
  if (ON_VERCEL) {
    const chromium = (await import('@sparticuz/chromium')).default
    const { chromium: playwright } = await import('playwright-core')
    return playwright.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath(),
      headless: true,
    })
  }

  try {
    const { chromium } = await import('playwright')
    return chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
    })
  } catch {
    const chromium = (await import('@sparticuz/chromium')).default
    const { chromium: playwright } = await import('playwright-core')
    return playwright.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath(),
      headless: true,
    })
  }
}

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

async function getBrowser() {
  // On Vercel, Chromium cannot be reused across frozen isolates — launch per request.
  if (ON_VERCEL) {
    return launchBrowser()
  }

  if (!browserPromise) {
    browserPromise = launchBrowser().catch((error) => {
      browserPromise = null
      throw error
    })
  }

  const browser = await browserPromise
  if (!browser.isConnected()) {
    browserPromise = null
    return getBrowser()
  }
  return browser
}

const VIEWPORTS = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'tablet', width: 834, height: 1112 },
  { name: 'mobile', width: 390, height: 844 },
]

/** Paths worth capturing on a marketing/product site, in priority order. */
const INTERESTING_PATHS = [
  /^\/pricing/i,
  /^\/(features|product)/i,
  /^\/docs/i,
  /^\/(about|company)/i,
  /^\/blog\/?$/i,
  /^\/(login|signin|sign-in)/i,
  /^\/(dashboard|app|admin|console)\b/i,
  /^\/(templates|showcase|customers|examples)/i,
]

function scorePath(pathname) {
  for (let i = 0; i < INTERESTING_PATHS.length; i++) {
    if (INTERESTING_PATHS[i].test(pathname)) return i
  }
  return -1
}

async function captureViewportSet(page, label, { includeFullPage = false } = {}) {
  const shots = []
  for (const viewport of VIEWPORTS) {
    try {
      await page.setViewportSize({ width: viewport.width, height: viewport.height })
      await new Promise((resolve) => setTimeout(resolve, viewport.name === 'desktop' ? 250 : 450))
      const buffer = await page.screenshot({ type: 'jpeg', quality: 62, fullPage: false })
      shots.push({
        label,
        viewport: viewport.name,
        mime: 'image/jpeg',
        base64: buffer.toString('base64'),
      })
    } catch {
      // keep whatever we captured
    }
  }

  if (includeFullPage) {
    try {
      await page.setViewportSize({ width: 1440, height: 900 })
      const height = await page.evaluate(() => document.documentElement.scrollHeight)
      if (height > 1100 && height < 6500) {
        const buffer = await page.screenshot({ type: 'jpeg', quality: 55, fullPage: true })
        shots.push({
          label: `${label} · full`,
          viewport: 'desktop',
          mime: 'image/jpeg',
          base64: buffer.toString('base64'),
        })
      }
    } catch {
      // full-page capture is best-effort
    }
  }
  return shots
}

async function collectPage(url, { screenshot = true, pages = 3, paths = null, auth = null } = {}) {
  const browser = await getBrowser()
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 DesignContractsBot/1.0 (+https://designcontracts.sh)',
  })

  // Authenticated capture — for surfaces the CALLER owns (their dashboards).
  // Requires the caller to already hold a valid session; we never log in.
  if (auth && typeof auth === 'object') {
    const origin = new URL(url)
    if (Array.isArray(auth.cookies) && auth.cookies.length > 0) {
      const cookies = auth.cookies
        .filter((cookie) => cookie && cookie.name && cookie.value)
        .slice(0, 30)
        .map((cookie) => ({
          name: String(cookie.name),
          value: String(cookie.value),
          domain: cookie.domain ? String(cookie.domain) : origin.hostname,
          path: cookie.path ? String(cookie.path) : '/',
        }))
      if (cookies.length > 0) {
        await context.addCookies(cookies).catch(() => {})
      }
    }
    if (auth.headers && typeof auth.headers === 'object') {
      const entries = Object.entries(auth.headers)
        .filter(([key, value]) => typeof key === 'string' && typeof value === 'string')
        .slice(0, 10)
      if (entries.length > 0) {
        await context.setExtraHTTPHeaders(Object.fromEntries(entries)).catch(() => {})
      }
    }
  }

  try {
    const page = await context.newPage()

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

      const sampleSelectors = [
        'body',
        'h1',
        'h2',
        'p',
        'a',
        'button',
        'input',
        'nav',
        'main',
        'header',
        'footer',
      ]
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

      const links = Array.from(document.querySelectorAll('a[href]'))
        .map((anchor) => anchor.getAttribute('href') || '')
        .filter(Boolean)
        .slice(0, 200)

      return {
        finalUrl: location.href,
        title: document.title,
        sheets,
        links,
      }
    })

    // Render audit — walk the visible DOM and measure what is actually painted,
    // weighted by on-screen area / text mass. This is ground truth the CSS-text
    // pipeline can never see (dormant rules, unused variables, dead themes).
    let audit = null
    try {
      audit = await page.evaluate(() => {
        const vw = innerWidth
        const vh = innerHeight
        const MAX_ELEMENTS = 3000
        const colorMap = new Map()
        const fontMap = new Map()
        const sizeMap = new Map()
        const weightMap = new Map()
        const spaceMap = new Map()
        const radiusMap = new Map()
        const shadowMap = new Map()
        const bump = (map, key, weight) => {
          if (!key) return
          map.set(key, (map.get(key) || 0) + weight)
        }

        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT)
        let count = 0
        let el = document.body
        while (el && count < MAX_ELEMENTS) {
          const current = el
          el = walker.nextNode()
          if (!(current instanceof Element)) continue
          const rect = current.getBoundingClientRect()
          if (rect.width < 2 || rect.height < 2) continue
          // Sample the first ~3 viewports of the page
          if (rect.bottom < 0 || rect.top > vh * 3) continue
          const cs = getComputedStyle(current)
          if (cs.visibility === 'hidden' || cs.display === 'none') continue
          if (Number(cs.opacity) === 0) continue
          count += 1

          const area = Math.min(rect.width, vw) * Math.min(rect.height, vh)
          const bg = cs.backgroundColor
          if (bg && bg !== 'transparent' && !/rgba\(\s*\d+,\s*\d+,\s*\d+,\s*0\s*\)/.test(bg)) {
            bump(colorMap, 'bg|' + bg, area)
          }

          let chars = 0
          for (const child of current.childNodes) {
            if (child.nodeType === 3) chars += (child.textContent || '').trim().length
          }
          if (chars > 0) {
            const fontSize = parseFloat(cs.fontSize) || 16
            const textMass = chars * fontSize * fontSize
            bump(colorMap, 'text|' + cs.color, textMass)
            const family = (cs.fontFamily || '').split(',')[0].replace(/['"]/g, '').trim()
            bump(fontMap, family, textMass)
            bump(sizeMap, Math.round(fontSize) + 'px', chars)
            bump(weightMap, String(cs.fontWeight), chars)
          }

          if (parseFloat(cs.borderTopWidth) > 0) {
            bump(colorMap, 'border|' + cs.borderTopColor, (rect.width + rect.height) * 2)
          }
          for (const raw of [
            cs.marginTop,
            cs.marginBottom,
            cs.paddingTop,
            cs.paddingBottom,
            cs.rowGap,
            cs.columnGap,
          ]) {
            const n = parseFloat(raw)
            if (Number.isFinite(n) && n > 1 && n < 300) bump(spaceMap, Math.round(n) + 'px', 1)
          }
          const radius = parseFloat(cs.borderTopLeftRadius)
          if (Number.isFinite(radius) && radius > 0 && radius < 200) {
            bump(radiusMap, Math.round(radius) + 'px', 1)
          }
          if (cs.boxShadow && cs.boxShadow !== 'none') {
            bump(shadowMap, cs.boxShadow.slice(0, 160), 1)
          }
        }

        const top = (map, n) =>
          Array.from(map.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, n)
            .map(([value, weight]) => ({ value, weight: Math.round(weight) }))

        let loadedFonts = []
        try {
          loadedFonts = Array.from(
            new Set(
              Array.from(document.fonts)
                .filter((face) => face.status === 'loaded')
                .map((face) => face.family.replace(/['"]/g, ''))
            )
          ).slice(0, 20)
        } catch {
          loadedFonts = []
        }

        return {
          viewport: { width: vw, height: vh },
          elementCount: count,
          colors: top(colorMap, 48).map((entry) => {
            const split = entry.value.indexOf('|')
            return {
              kind: entry.value.slice(0, split),
              value: entry.value.slice(split + 1),
              weight: entry.weight,
            }
          }),
          fonts: top(fontMap, 10),
          fontSizes: top(sizeMap, 14),
          fontWeights: top(weightMap, 8),
          spacing: top(spaceMap, 20),
          radius: top(radiusMap, 12),
          shadows: top(shadowMap, 8),
          loadedFonts,
        }
      })
    } catch {
      audit = null
    }

    const screenshots = []
    if (screenshot) {
      screenshots.push(...(await captureViewportSet(page, 'homepage', { includeFullPage: true })))

      // Capture a few more same-origin pages — explicit paths win over discovery.
      const origin = new URL(payload.finalUrl)
      let extraPaths = []
      if (Array.isArray(paths) && paths.length > 0) {
        extraPaths = paths
          .map((p) => String(p))
          .filter((p) => p.startsWith('/'))
          .slice(0, 4)
      } else {
        const maxPages = Math.max(0, Math.min(Number(pages) || 0, 4))
        const seen = new Set()
        const candidates = []
        for (const href of payload.links) {
          try {
            const resolved = new URL(href, payload.finalUrl)
            if (resolved.hostname !== origin.hostname) continue
            const pathname = resolved.pathname.replace(/\/$/, '') || '/'
            if (pathname === '/' || seen.has(pathname)) continue
            const score = scorePath(pathname)
            if (score < 0) continue
            seen.add(pathname)
            candidates.push({ pathname, score })
          } catch {
            // ignore malformed hrefs
          }
        }
        candidates.sort((a, b) => a.score - b.score)
        extraPaths = candidates.slice(0, maxPages).map((candidate) => candidate.pathname)
      }

      for (const pathname of extraPaths) {
        try {
          await page.goto(new URL(pathname, origin).toString(), {
            waitUntil: 'domcontentloaded',
            timeout: 15000,
          })
          await new Promise((resolve) => setTimeout(resolve, 900))
          await page.setViewportSize({ width: 1440, height: 900 })
          const buffer = await page.screenshot({ type: 'jpeg', quality: 62, fullPage: false })
          screenshots.push({
            label: pathname.replace(/^\//, '') || 'page',
            viewport: 'desktop',
            mime: 'image/jpeg',
            base64: buffer.toString('base64'),
          })
        } catch {
          // subpage capture is best-effort — keep going
        }
      }
    }

    const primary = screenshots.find(
      (shot) => shot.label === 'homepage' && shot.viewport === 'desktop'
    )

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
      // Legacy single-shot field for older clients
      screenshot: primary ? { mime: primary.mime, base64: primary.base64 } : null,
      screenshots,
      audit,
      bytes: total,
      sourceCount: sources.length,
    }
  } finally {
    await context.close().catch(() => {})
    if (ON_VERCEL) {
      await browser.close().catch(() => {})
    }
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
      return sendJson(res, 200, {
        ok: true,
        service: 'designcontracts-scanner',
        activeScans,
        browserReady: Boolean(browserPromise),
        runtime: ON_VERCEL ? 'vercel' : 'node',
      })
    }

    if (req.method === 'POST' && req.url === '/scan') {
      if (SCANNER_SECRET) {
        const provided = req.headers['x-scanner-secret']
        if (provided !== SCANNER_SECRET) {
          return sendJson(res, 401, { error: 'Unauthorized' })
        }
      }

      if (activeScans >= MAX_CONCURRENCY) {
        return sendJson(res, 429, { error: 'Scanner busy — retry shortly' })
      }

      const chunks = []
      for await (const chunk of req) chunks.push(chunk)
      const body = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}')
      const url = String(body.url || '').trim()
      if (!url.startsWith('http')) {
        return sendJson(res, 400, { error: 'url must be an absolute http(s) URL' })
      }
      assertPublicUrl(url)

      activeScans += 1
      try {
        const result = await collectPage(url, {
          screenshot: body.screenshot !== false,
          pages: body.pages,
          paths: Array.isArray(body.paths) ? body.paths : null,
          auth: body.auth && typeof body.auth === 'object' ? body.auth : null,
        })
        return sendJson(res, 200, { status: 'completed', ...result })
      } finally {
        activeScans -= 1
      }
    }

    sendJson(res, 404, { error: 'not found' })
  } catch (error) {
    console.error('[scanner]', error)
    sendJson(res, 500, {
      error: error instanceof Error ? error.message : 'scanner failed',
    })
  }
})

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[designcontracts-scanner] listening on 0.0.0.0:${PORT}`)
  // Warm browser only for long-lived Docker/local processes
  if (!ON_VERCEL) {
    getBrowser().catch((error) => {
      console.warn('[scanner] browser warm-up failed:', error)
    })
  }
})

async function shutdown() {
  try {
    const browser = await browserPromise
    if (browser) await browser.close()
  } catch {
    // ignore
  }
  process.exit(0)
}

process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)
