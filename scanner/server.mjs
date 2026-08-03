/**
 * Design Contracts browser scanner microservice.
 * Runs Playwright Chromium with a reused browser for accurate CSS + screenshots.
 *
 * Endpoints:
 *   GET  /health
 *   POST /scan  {
 *     url,
 *     screenshot?: boolean,
 *     pages?: number,            // same-origin pages to CRAWL for CSS+audit+shots (0–12, default 6)
 *     paths?: string[],          // explicit paths to crawl (overrides discovery)
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

  // Explicit executable override — self-hosted runners with a system Chromium
  const explicitPath = process.env.SCANNER_CHROMIUM_PATH || process.env.CHROMIUM_EXECUTABLE_PATH
  // Honor standard egress-proxy env (corp networks, sandboxed runners)
  const proxyServer =
    process.env.SCANNER_PROXY || process.env.HTTPS_PROXY || process.env.https_proxy || null
  try {
    const { chromium } = await import('playwright')
    return chromium.launch({
      headless: true,
      executablePath: explicitPath || undefined,
      proxy: proxyServer ? { server: proxyServer } : undefined,
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

/** Browser-side: collect same-page stylesheets, inline styles, computed samples, links. */
function collectSheetsAndLinksInPage() {
  const sheets = []
  for (const sheet of Array.from(document.styleSheets)) {
    try {
      const href = sheet.href || null
      const rules = Array.from(sheet.cssRules || [])
        .map((rule) => rule.cssText)
        .join('\n')
      if (rules) {
        sheets.push({ kind: href ? 'link' : 'inline', url: href, content: rules, bytes: rules.length })
      }
    } catch {
      // cross-origin stylesheet — skip
    }
  }
  for (const style of Array.from(document.querySelectorAll('style'))) {
    const content = style.textContent || ''
    if (content.trim()) {
      sheets.push({ kind: 'inline', url: null, content, bytes: content.length })
    }
  }

  const sampleSelectors = ['body', 'h1', 'h2', 'p', 'a', 'button', 'input', 'nav', 'main', 'header', 'footer']
  const computedChunks = []
  for (const selector of sampleSelectors) {
    const el = document.querySelector(selector)
    if (!el) continue
    const cs = getComputedStyle(el)
    const props = [
      'color', 'background-color', 'font-family', 'font-size', 'font-weight',
      'line-height', 'letter-spacing', 'border-radius', 'box-shadow', 'padding', 'margin', 'gap',
    ]
    const decls = props.map((prop) => `  ${prop}: ${cs.getPropertyValue(prop)};`).join('\n')
    computedChunks.push(`${selector} {\n${decls}\n}`)
  }
  if (computedChunks.length) {
    const content = computedChunks.join('\n\n')
    sheets.push({ kind: 'computed', url: location.href, content, bytes: content.length })
  }

  const links = Array.from(document.querySelectorAll('a[href]'))
    .map((anchor) => anchor.getAttribute('href') || '')
    .filter(Boolean)
    .slice(0, 300)

  // Named animations — the site's motion vocabulary
  const keyframes = []
  for (const sheet of Array.from(document.styleSheets)) {
    try {
      for (const rule of Array.from(sheet.cssRules || [])) {
        if (rule.type === 7 /* CSSKeyframesRule */ && keyframes.length < 24) {
          keyframes.push({ name: rule.name, css: rule.cssText.slice(0, 2000) })
        }
      }
    } catch {
      // cross-origin sheet
    }
  }

  return { finalUrl: location.href, title: document.title, sheets, links, keyframes }
}

/** Browser-side: measure what the page actually paints (area/text-mass weighted). */
function auditInPage() {
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
  const motionMap = new Map()
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
    for (const raw of [cs.marginTop, cs.marginBottom, cs.paddingTop, cs.paddingBottom, cs.rowGap, cs.columnGap]) {
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
    // Rendered motion: real transitions attached to visible elements
    const duration = cs.transitionDuration
    if (duration && duration !== '0s' && !duration.startsWith('0s,')) {
      const easing = (cs.transitionTimingFunction || '').split(',')[0].trim()
      const firstDuration = duration.split(',')[0].trim()
      const property = (cs.transitionProperty || 'all').split(',')[0].trim()
      bump(motionMap, firstDuration + ' ' + easing + ' (' + property + ')', 1)
    }
    if (cs.animationName && cs.animationName !== 'none') {
      const animDuration = (cs.animationDuration || '').split(',')[0].trim()
      bump(motionMap, 'animation ' + cs.animationName.split(',')[0].trim() + ' ' + animDuration, 1)
    }
  }

  // App shell — the structural chrome that frames every page
  const shell = { header: null, sidebar: null, footer: null }
  const headerEl = document.querySelector('header, [role="banner"]')
  if (headerEl) {
    const rect = headerEl.getBoundingClientRect()
    const cs = getComputedStyle(headerEl)
    if (rect.width > vw * 0.6 && rect.height > 20 && rect.height < 220 && rect.top < 120) {
      shell.header = {
        height: Math.round(rect.height),
        sticky: cs.position === 'fixed' || cs.position === 'sticky',
        background: cs.backgroundColor,
      }
    }
  }
  for (const el of Array.from(document.querySelectorAll('aside, nav, [class*="sidebar" i]')).slice(0, 12)) {
    const rect = el.getBoundingClientRect()
    if (rect.height > vh * 0.55 && rect.width >= 44 && rect.width <= 420 && rect.left < 140) {
      const cs = getComputedStyle(el)
      shell.sidebar = {
        width: Math.round(rect.width),
        fixed: cs.position === 'fixed' || cs.position === 'sticky',
        background: cs.backgroundColor,
      }
      break
    }
  }
  const footerEl = document.querySelector('footer, [role="contentinfo"]')
  if (footerEl) {
    const rect = footerEl.getBoundingClientRect()
    if (rect.height > 40) {
      shell.footer = { height: Math.round(rect.height), background: getComputedStyle(footerEl).backgroundColor }
    }
  }

  // Density & feel — first viewport only
  let firstViewportEls = 0
  let imageArea = 0
  let textChars = 0
  for (const el of Array.from(document.body.querySelectorAll('*')).slice(0, 4000)) {
    const rect = el.getBoundingClientRect()
    if (rect.bottom < 0 || rect.top > vh || rect.width < 2 || rect.height < 2) continue
    firstViewportEls += 1
    if (/^(IMG|VIDEO|SVG|PICTURE|CANVAS)$/.test(el.tagName)) {
      imageArea += Math.min(rect.width, vw) * Math.min(rect.height, vh)
    }
    for (const child of el.childNodes) {
      if (child.nodeType === 3) textChars += (child.textContent || '').trim().length
    }
  }
  const density = {
    elementsInViewport: firstViewportEls,
    imageAreaRatio: Math.round((imageArea / (vw * vh)) * 100) / 100,
    textChars,
  }

  // Interaction feedback — what :hover / :focus / :active rules actually change.
  // This is the tactile "feel" of the site: does it darken, lift, glow, scale?
  const FEEDBACK_PROPS = [
    'background-color', 'background', 'color', 'box-shadow', 'transform',
    'opacity', 'border-color', 'outline', 'outline-color', 'text-decoration',
    'filter', 'scale', 'translate',
  ]
  const effectMap = new Map()
  const interactionSamples = []
  let interactionRules = 0
  const visitInteractionRules = (rules) => {
    for (const rule of Array.from(rules || [])) {
      if (rule.cssRules && (rule.type === 4 /* media */ || rule.type === 12 /* supports */)) {
        visitInteractionRules(rule.cssRules)
        continue
      }
      if (rule.type !== 1 /* CSSStyleRule */ || !rule.selectorText) continue
      const sel = rule.selectorText
      let state = null
      if (/:hover\b/.test(sel)) state = 'hover'
      else if (/:focus/.test(sel)) state = 'focus'
      else if (/:active\b/.test(sel)) state = 'active'
      if (!state) continue
      const changes = []
      for (const prop of FEEDBACK_PROPS) {
        if (rule.style.getPropertyValue(prop)) changes.push(prop)
      }
      if (!changes.length && rule.style.length > 0) {
        // hover state driven by custom-property swap (--btn-bg etc.)
        if (String(rule.style[0] || '').startsWith('--')) changes.push('custom-property')
      }
      if (!changes.length) continue
      interactionRules += 1
      for (const prop of changes) bump(effectMap, state + ' ' + prop, 1)
      if (interactionSamples.length < 16) {
        interactionSamples.push({
          selector: sel.slice(0, 120),
          state,
          changes: changes.slice(0, 6),
        })
      }
    }
  }
  for (const sheet of Array.from(document.styleSheets)) {
    try {
      visitInteractionRules(sheet.cssRules)
    } catch {
      // cross-origin sheet
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

  // Measured heading styles — majority vote per level
  const headings = {}
  for (const level of ['h1', 'h2', 'h3']) {
    const votes = new Map()
    for (const el of Array.from(document.querySelectorAll(level)).slice(0, 12)) {
      const rect = el.getBoundingClientRect()
      if (rect.width < 2 || rect.height < 2) continue
      const cs = getComputedStyle(el)
      const family = (cs.fontFamily || '').split(',')[0].replace(/['"]/g, '').trim()
      const size = Math.round(parseFloat(cs.fontSize) || 0)
      const weight = parseInt(cs.fontWeight, 10) || 400
      if (!family || size <= 0) continue
      const key = family + '|' + size + '|' + weight
      votes.set(key, (votes.get(key) || 0) + 1)
    }
    const best = Array.from(votes.entries()).sort((a, b) => b[1] - a[1])[0]
    if (best) {
      const [family, size, weight] = best[0].split('|')
      headings[level] = { family, size: Number(size), weight: Number(weight), count: best[1] }
    }
  }

  // Measured component recipes — live computed styles for buttons / inputs / cards
  const parseRgb = (value) => {
    if (!value || value === 'transparent') return null
    const m = String(value).match(/rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*([\d.]+))?\s*\)/i)
    if (!m) return null
    const a = m[4] === undefined ? 1 : Number(m[4])
    if (a < 0.08) return null
    return { r: Number(m[1]), g: Number(m[2]), b: Number(m[3]), a }
  }
  const rgbToHex = (rgb) => {
    const h = (n) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0')
    return `#${h(rgb.r)}${h(rgb.g)}${h(rgb.b)}`
  }
  const chromaOf = (rgb) => {
    const max = Math.max(rgb.r, rgb.g, rgb.b)
    const min = Math.min(rgb.r, rgb.g, rgb.b)
    return max - min
  }
  const luminanceOf = (rgb) => (0.2126 * rgb.r + 0.7152 * rgb.g + 0.0722 * rgb.b) / 255
  const pxRound = (raw) => {
    const n = parseFloat(raw)
    return Number.isFinite(n) && n >= 0 ? `${Math.round(n)}px` : null
  }
  const padBox = (cs) => {
    const y = Math.round(
      ((parseFloat(cs.paddingTop) || 0) + (parseFloat(cs.paddingBottom) || 0)) / 2
    )
    const x = Math.round(
      ((parseFloat(cs.paddingLeft) || 0) + (parseFloat(cs.paddingRight) || 0)) / 2
    )
    if (y <= 0 && x <= 0) return null
    return `${Math.max(y, 0)}px ${Math.max(x, 0)}px`
  }
  const recipeFromEl = (el) => {
    const rect = el.getBoundingClientRect()
    if (rect.width < 8 || rect.height < 8) return null
    if (rect.bottom < 0 || rect.top > vh * 2.5) return null
    const cs = getComputedStyle(el)
    if (cs.visibility === 'hidden' || cs.display === 'none' || Number(cs.opacity) === 0) return null
    const bgRgb = parseRgb(cs.backgroundColor)
    const fgRgb = parseRgb(cs.color)
    const borderRgb =
      parseFloat(cs.borderTopWidth) > 0 ? parseRgb(cs.borderTopColor) : null
    return {
      backgroundColor: bgRgb ? rgbToHex(bgRgb) : undefined,
      textColor: fgRgb ? rgbToHex(fgRgb) : undefined,
      borderColor: borderRgb ? rgbToHex(borderRgb) : undefined,
      rounded: pxRound(cs.borderTopLeftRadius) || undefined,
      padding: padBox(cs) || undefined,
      fontSize: pxRound(cs.fontSize) || undefined,
      fontWeight: String(parseInt(cs.fontWeight, 10) || cs.fontWeight || ''),
      boxShadow: cs.boxShadow && cs.boxShadow !== 'none' ? cs.boxShadow.slice(0, 120) : undefined,
      _chroma: bgRgb ? chromaOf(bgRgb) : 0,
      _luma: bgRgb ? luminanceOf(bgRgb) : 1,
      _area: rect.width * rect.height,
    }
  }
  const clusterRecipes = (els, limit = 24) => {
    const votes = new Map()
    for (const el of Array.from(els).slice(0, limit)) {
      const recipe = recipeFromEl(el)
      if (!recipe) continue
      const key = [
        recipe.backgroundColor || 'none',
        recipe.textColor || 'none',
        recipe.rounded || '0',
        recipe.padding || '0',
        recipe.fontSize || '0',
        recipe.fontWeight || '0',
      ].join('|')
      const existing = votes.get(key)
      if (existing) {
        existing.sampleCount += 1
        existing._area += recipe._area
        if (!existing._el) existing._el = el
      } else {
        votes.set(key, { ...recipe, sampleCount: 1, _el: el })
      }
    }
    return Array.from(votes.values()).sort(
      (a, b) => b.sampleCount - a.sampleCount || b._area - a._area
    )
  }

  /** Pull :hover deltas from stylesheets that match this element (no real hover needed). */
  const hoverStateFromSheets = (el) => {
    if (!el) return null
    const deltas = {}
    const visit = (rules) => {
      for (const rule of Array.from(rules || [])) {
        if (rule.cssRules && (rule.type === 4 || rule.type === 12)) {
          visit(rule.cssRules)
          continue
        }
        if (rule.type !== 1 || !rule.selectorText || !/:hover\b/.test(rule.selectorText)) continue
        const bases = rule.selectorText
          .split(',')
          .map((part) => part.replace(/:hover\b/gi, '').trim())
          .filter(Boolean)
        let matched = false
        for (const base of bases) {
          try {
            if (el.matches(base)) {
              matched = true
              break
            }
          } catch {
            // invalid selector fragment
          }
        }
        if (!matched) continue
        for (const prop of [
          'background-color',
          'color',
          'box-shadow',
          'border-color',
          'opacity',
          'transform',
        ]) {
          const value = rule.style.getPropertyValue(prop)
          if (!value) continue
          if (prop === 'background-color') {
            const rgb = parseRgb(value)
            if (rgb) deltas.backgroundColor = rgbToHex(rgb)
          } else if (prop === 'color') {
            const rgb = parseRgb(value)
            if (rgb) deltas.textColor = rgbToHex(rgb)
          } else if (prop === 'border-color') {
            const rgb = parseRgb(value)
            if (rgb) deltas.borderColor = rgbToHex(rgb)
          } else if (prop === 'box-shadow') {
            deltas.boxShadow = value.slice(0, 120)
          } else if (prop === 'opacity') {
            deltas.opacity = value
          } else if (prop === 'transform') {
            deltas.transform = value.slice(0, 80)
          }
        }
      }
    }
    for (const sheet of Array.from(document.styleSheets)) {
      try {
        visit(sheet.cssRules)
      } catch {
        // cross-origin
      }
    }
    return Object.keys(deltas).length ? deltas : null
  }

  const stripInternal = (recipe) => {
    if (!recipe) return null
    const {
      backgroundColor,
      textColor,
      borderColor,
      rounded,
      padding,
      fontSize,
      fontWeight,
      boxShadow,
      sampleCount,
      hover,
    } = recipe
    const out = {
      backgroundColor,
      textColor,
      borderColor,
      rounded,
      padding,
      fontSize,
      fontWeight: fontWeight || undefined,
      boxShadow,
      sampleCount,
    }
    if (hover && Object.keys(hover).length) out.hover = hover
    return out
  }

  const withHover = (recipe) => {
    if (!recipe) return null
    const hover = hoverStateFromSheets(recipe._el)
    return hover ? { ...recipe, hover } : recipe
  }

  const buttonEls = document.querySelectorAll(
    'button, [role="button"], a.button, .btn, [class*="btn-"], input[type="submit"], input[type="button"]'
  )
  const buttonClusters = clusterRecipes(buttonEls, 40)
  const filled = buttonClusters.filter((r) => r.backgroundColor && r._chroma >= 18)
  const quiet = buttonClusters.filter(
    (r) => !r.backgroundColor || r._chroma < 18 || r._luma > 0.92
  )
  const primaryRaw =
    filled.sort((a, b) => b._chroma - a._chroma || b.sampleCount - a.sampleCount)[0] ||
    buttonClusters[0] ||
    null
  const secondaryRaw =
    quiet.find((r) => r !== primaryRaw) ||
    buttonClusters.find((r) => r !== primaryRaw) ||
    null
  const primaryBtn = withHover(primaryRaw)
  const secondaryBtn = withHover(secondaryRaw)

  const inputClusters = clusterRecipes(
    document.querySelectorAll(
      'input:not([type="hidden"]):not([type="submit"]):not([type="button"]), textarea, select'
    ),
    24
  )
  const cardClusters = clusterRecipes(
    document.querySelectorAll(
      'article, [class*="card" i], [data-card], section[class*="panel" i], .surface'
    ),
    30
  ).filter((r) => r._area > 8000)

  const linkClusters = clusterRecipes(
    document.querySelectorAll('main a[href], article a[href], p a[href]'),
    30
  ).filter((r) => r.textColor)
  const badgeClusters = clusterRecipes(
    document.querySelectorAll(
      '[class*="badge" i], [class*="chip" i], [class*="tag" i], [class*="pill" i]'
    ),
    20
  ).filter((r) => r._area < 40000)

  const components = {
    'button-primary': stripInternal(primaryBtn),
    'button-secondary': stripInternal(secondaryBtn),
    input: stripInternal(withHover(inputClusters[0])),
    'surface-card': stripInternal(cardClusters[0]),
    link: stripInternal(linkClusters[0]),
    badge: stripInternal(badgeClusters[0]),
  }

  return {
    viewport: { width: vw, height: vh },
    elementCount: count,
    headings,
    shell,
    density,
    components,
    transitions: top(motionMap, 12),
    interaction: {
      rules: interactionRules,
      effects: top(effectMap, 14),
      samples: interactionSamples,
    },
    colors: top(colorMap, 64).map((entry) => {
      const split = entry.value.indexOf('|')
      return { kind: entry.value.slice(0, split), value: entry.value.slice(split + 1), weight: entry.weight }
    }),
    fonts: top(fontMap, 12),
    fontSizes: top(sizeMap, 16),
    fontWeights: top(weightMap, 8),
    spacing: top(spaceMap, 24),
    radius: top(radiusMap, 14),
    shadows: top(shadowMap, 10),
    loadedFonts,
  }
}

/** Fold one page's audit into the site-wide accumulator. */
function mergeAudit(target, audit) {
  if (!audit) return target
  if (!target) {
    return {
      viewport: audit.viewport,
      elementCount: audit.elementCount,
      pagesAudited: 1,
      headings: { ...(audit.headings || {}) },
      shell: audit.shell || null,
      density: audit.density || null,
      components: audit.components ? { ...audit.components } : null,
      transitions: [...(audit.transitions || [])],
      interaction: audit.interaction
        ? {
            rules: audit.interaction.rules,
            effects: [...audit.interaction.effects],
            samples: [...audit.interaction.samples],
          }
        : null,
      colors: [...audit.colors],
      fonts: [...audit.fonts],
      fontSizes: [...audit.fontSizes],
      fontWeights: [...audit.fontWeights],
      spacing: [...audit.spacing],
      radius: [...audit.radius],
      shadows: [...audit.shadows],
      loadedFonts: [...audit.loadedFonts],
    }
  }
  const mergeList = (into, from, key) => {
    const index = new Map(into.map((entry) => [key(entry), entry]))
    for (const entry of from) {
      const existing = index.get(key(entry))
      if (existing) existing.weight += entry.weight
      else {
        const copy = { ...entry }
        into.push(copy)
        index.set(key(entry), copy)
      }
    }
    into.sort((a, b) => b.weight - a.weight)
  }
  mergeList(target.colors, audit.colors, (entry) => entry.kind + '|' + entry.value)
  mergeList(target.fonts, audit.fonts, (entry) => entry.value)
  mergeList(target.fontSizes, audit.fontSizes, (entry) => entry.value)
  mergeList(target.fontWeights, audit.fontWeights, (entry) => entry.value)
  mergeList(target.spacing, audit.spacing, (entry) => entry.value)
  mergeList(target.radius, audit.radius, (entry) => entry.value)
  mergeList(target.shadows, audit.shadows, (entry) => entry.value)
  if (audit.transitions) {
    target.transitions = target.transitions || []
    mergeList(target.transitions, audit.transitions, (entry) => entry.value)
  }
  if (audit.interaction) {
    if (!target.interaction) {
      target.interaction = {
        rules: audit.interaction.rules,
        effects: [...audit.interaction.effects],
        samples: [...audit.interaction.samples],
      }
    } else {
      target.interaction.rules += audit.interaction.rules
      mergeList(target.interaction.effects, audit.interaction.effects, (entry) => entry.value)
      const seen = new Set(
        target.interaction.samples.map((sample) => sample.state + '|' + sample.selector)
      )
      for (const sample of audit.interaction.samples) {
        if (target.interaction.samples.length >= 16) break
        const key = sample.state + '|' + sample.selector
        if (seen.has(key)) continue
        seen.add(key)
        target.interaction.samples.push(sample)
      }
    }
  }
  if (!target.shell && audit.shell) target.shell = audit.shell
  if (audit.shell && target.shell) {
    // keep richest shell observation
    if (!target.shell.sidebar && audit.shell.sidebar) target.shell.sidebar = audit.shell.sidebar
    if (!target.shell.footer && audit.shell.footer) target.shell.footer = audit.shell.footer
  }
  if (audit.density) {
    target.density = target.density || audit.density
  }
  target.loadedFonts = Array.from(new Set([...target.loadedFonts, ...audit.loadedFonts])).slice(0, 24)
  if (audit.headings) {
    target.headings = target.headings || {}
    for (const [level, entry] of Object.entries(audit.headings)) {
      const existing = target.headings[level]
      if (!existing || (entry && entry.count > existing.count)) {
        target.headings[level] = entry
      }
    }
  }
  if (audit.components) {
    target.components = target.components || {}
    for (const [key, recipe] of Object.entries(audit.components)) {
      if (!recipe) continue
      const existing = target.components[key]
      if (!existing || (recipe.sampleCount || 0) > (existing.sampleCount || 0)) {
        target.components[key] = recipe
      }
    }
  }
  target.elementCount += audit.elementCount
  target.pagesAudited += 1
  return target
}

function contentHash(text) {
  let hash = 5381
  for (let i = 0; i < text.length; i += 1) {
    hash = ((hash << 5) + hash + text.charCodeAt(i)) >>> 0
  }
  return hash.toString(36) + ':' + text.length
}

/** Paths that rarely add design signal — crawl them last, if at all. */
const LOW_SIGNAL_PATHS = /\/(privacy|terms|legal|cookie|sitemap|rss|feed|cdn-cgi)\b/i

function buildCrawlQueue(links, baseUrl, maxPages) {
  const origin = new URL(baseUrl)
  const seen = new Set()
  const scored = []
  for (const href of links) {
    try {
      const resolved = new URL(href, baseUrl)
      if (resolved.hostname !== origin.hostname) continue
      if (!/^https?:$/.test(resolved.protocol)) continue
      const pathname = resolved.pathname.replace(/\/$/, '') || '/'
      if (pathname === '/' || seen.has(pathname)) continue
      if (/\.(png|jpe?g|svg|gif|webp|pdf|zip|xml|txt|ico|css|js|mp4|webm)$/i.test(pathname)) continue
      seen.add(pathname)
      const interesting = scorePath(pathname)
      const depth = pathname.split('/').filter(Boolean).length
      // Rank: interesting paths first, then shallow section pages, penalize low-signal.
      let rank
      if (interesting >= 0) rank = interesting
      else if (LOW_SIGNAL_PATHS.test(pathname)) rank = 900 + depth
      else rank = 100 + depth * 10 + Math.min(pathname.length, 80) / 100
      scored.push({ pathname, rank })
    } catch {
      // ignore malformed hrefs
    }
  }
  scored.sort((a, b) => a.rank - b.rank)
  return scored.slice(0, maxPages).map((entry) => entry.pathname)
}

async function collectPage(url, { screenshot = true, pages = 8, paths = null, auth = null } = {}) {
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

    // ---- Homepage: full treatment -----------------------------------------
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 })
    await new Promise((resolve) => setTimeout(resolve, 1500))

    const home = await page.evaluate(collectSheetsAndLinksInPage)

    const sheetIndex = new Map()
    const addSheets = (sheets, sourcePath) => {
      for (const sheet of sheets) {
        const key = sheet.url || contentHash(sheet.content)
        const existing = sheetIndex.get(key)
        if (existing) {
          existing.pages += 1
          continue
        }
        sheetIndex.set(key, { ...sheet, page: sourcePath, pages: 1 })
      }
    }
    addSheets(home.sheets, '/')

    let audit = null
    try {
      audit = mergeAudit(null, await page.evaluate(auditInPage))
    } catch {
      audit = null
    }

    const toSameOriginPaths = (links, baseUrl) => {
      const origin = new URL(baseUrl)
      const out = new Set()
      for (const href of links) {
        try {
          const resolved = new URL(href, baseUrl)
          if (resolved.hostname !== origin.hostname) continue
          out.add(resolved.pathname.replace(/\/$/, '') || '/')
        } catch {
          // ignore
        }
        if (out.size >= 60) break
      }
      return Array.from(out)
    }

    const keyframesIndex = new Map()
    const addKeyframes = (list) => {
      for (const frame of list || []) {
        if (!keyframesIndex.has(frame.name) && keyframesIndex.size < 24) {
          keyframesIndex.set(frame.name, frame.css)
        }
      }
    }
    addKeyframes(home.keyframes)

    const pageLinks = new Map()
    pageLinks.set('/', toSameOriginPaths(home.links, home.finalUrl))

    const pagesMeta = [{ path: '/', title: home.title || '', audited: Boolean(audit) }]

    const screenshots = []
    if (screenshot) {
      screenshots.push(...(await captureViewportSet(page, 'homepage', { includeFullPage: true })))
    }

    // Mobile audit pass — responsive-only tokens (stacked layouts, mobile nav)
    try {
      await page.setViewportSize({ width: 390, height: 844 })
      await new Promise((resolve) => setTimeout(resolve, 450))
      audit = mergeAudit(audit, await page.evaluate(auditInPage))
      if (audit) audit.pagesAudited -= 1 // same page, different viewport
    } catch {
      // mobile pass is best-effort
    }

    // Sitemap discovery — pages the nav never links to
    let sitemapLinks = []
    try {
      const sitemapUrl = new URL('/sitemap.xml', home.finalUrl).toString()
      const response = await context.request.get(sitemapUrl, { timeout: 6000 })
      if (response.ok()) {
        let xml = (await response.text()).slice(0, 400000)
        // Sitemap index → follow the first child sitemap
        const childMatch = xml.match(/<sitemap>[\s\S]*?<loc>\s*([^<\s]+)\s*<\/loc>/i)
        if (childMatch && /sitemapindex/i.test(xml)) {
          const child = await context.request.get(childMatch[1], { timeout: 6000 })
          if (child.ok()) xml = (await child.text()).slice(0, 400000)
        }
        const locs = xml.match(/<loc>\s*([^<\s]+)\s*<\/loc>/gi) || []
        sitemapLinks = locs
          .map((entry) => entry.replace(/<\/?loc>/gi, '').trim())
          .slice(0, 300)
      }
    } catch {
      // no sitemap — nav discovery only
    }

    // ---- Crawl: aggregate evidence across the site under a time budget ----
    const maxPages = Math.max(5, Math.min(Number(pages) || 8, 24))
    const explicit = Array.isArray(paths)
      ? paths.map((p) => String(p)).filter((p) => p.startsWith('/')).slice(0, 12)
      : null
    const queue =
      explicit && explicit.length > 0
        ? explicit
        : buildCrawlQueue([...home.links, ...sitemapLinks], home.finalUrl, maxPages)

    const CRAWL_BUDGET_MS = ON_VERCEL ? 22000 : 30000
    const crawlDeadline = Date.now() + CRAWL_BUDGET_MS
    const MAX_SUBPAGE_SHOTS = 4
    let subpageShots = 0

    await page.setViewportSize({ width: 1440, height: 900 }).catch(() => {})

    for (const pathname of queue) {
      if (Date.now() > crawlDeadline) break
      try {
        await page.goto(new URL(pathname, home.finalUrl).toString(), {
          waitUntil: 'domcontentloaded',
          timeout: 12000,
        })
        await new Promise((resolve) => setTimeout(resolve, 700))

        const sub = await page.evaluate(collectSheetsAndLinksInPage)
        addSheets(sub.sheets, pathname)
        addKeyframes(sub.keyframes)
        pageLinks.set(pathname, toSameOriginPaths(sub.links, home.finalUrl))

        let audited = false
        try {
          audit = mergeAudit(audit, await page.evaluate(auditInPage))
          audited = Boolean(audit)
        } catch {
          audited = false
        }
        pagesMeta.push({ path: pathname, title: sub.title || '', audited })

        if (screenshot && subpageShots < MAX_SUBPAGE_SHOTS) {
          try {
            const buffer = await page.screenshot({ type: 'jpeg', quality: 62, fullPage: false })
            screenshots.push({
              label: pathname.replace(/^\//, '') || 'page',
              viewport: 'desktop',
              mime: 'image/jpeg',
              base64: buffer.toString('base64'),
            })
            subpageShots += 1
          } catch {
            // screenshot is best-effort
          }
        }
      } catch {
        // subpage failed — keep crawling
      }
    }

    const primary = screenshots.find(
      (shot) => shot.label === 'homepage' && shot.viewport === 'desktop'
    )

    // Prioritize sheets seen on multiple pages (shared design CSS) within the cap.
    const allSheets = Array.from(sheetIndex.values()).sort(
      (a, b) => b.pages - a.pages || b.bytes - a.bytes
    )
    let total = 0
    const sources = []
    for (const sheet of allSheets) {
      if (total + sheet.bytes > MAX_CSS_BYTES) continue
      sources.push({ kind: sheet.kind, url: sheet.url, content: sheet.content, bytes: sheet.bytes })
      total += sheet.bytes
    }

    // Flow graph: which crawled pages link to which
    const crawledSet = new Set(pagesMeta.map((entry) => entry.path))
    const flow = []
    for (const [from, links] of pageLinks.entries()) {
      for (const to of links) {
        if (to !== from && crawledSet.has(to)) flow.push({ from, to })
      }
    }

    return {
      url: home.finalUrl,
      title: home.title,
      sources,
      // Legacy single-shot field for older clients
      screenshot: primary ? { mime: primary.mime, base64: primary.base64 } : null,
      screenshots,
      audit,
      pages: pagesMeta,
      keyframes: Array.from(keyframesIndex.entries()).map(([name, css]) => ({ name, css })),
      flow,
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
