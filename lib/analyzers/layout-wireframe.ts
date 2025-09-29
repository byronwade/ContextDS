import { chromium, type Browser } from 'playwright'

export type WireframeSection = {
  tag: string
  role: string | null
  category: 'navigation' | 'form' | 'table' | 'footer' | 'hero' | 'sidebar' | 'card-grid' | 'content' | 'unknown'
  display: string
  columns: number | null
  rows: number | null
  childCount: number
  description: string
  classList: string[]
  id: string | null
  typography: Array<{
    fontFamily: string | null
    fontSize: string | null
    fontWeight: string | null
    lineHeight: string | null
  }>
  colors: Array<{
    color: string | null
    backgroundColor: string | null
  }>
  spacing: {
    margin: string | null
    padding: string | null
  }
}

export async function collectLayoutWireframe(url: string, timeoutMs = 15000): Promise<WireframeSection[]> {
  const browser = await launchBrowser()
  const page = await browser.newPage({
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36'
  })

  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: timeoutMs })

    const sections = await page.evaluate(() => {
      const isVisible = (el: Element) => {
        const style = window.getComputedStyle(el)
        const rect = el.getBoundingClientRect()
        return !(style.display === 'none' || style.visibility === 'hidden' || rect.width === 0 || rect.height === 0)
      }

      const classifySection = (
        tag: string,
        role: string | null,
        classList: string[],
        description: string,
        childCount: number
      ): WireframeSection['category'] => {
        const classes = classList.map((cls) => cls.toLowerCase())
        const descriptionLower = description.toLowerCase()
        if (tag === 'nav' || role === 'navigation' || classes.some((cls) => cls.includes('nav'))) {
          return 'navigation'
        }
        if (tag === 'form' || role === 'form' || classes.some((cls) => cls.includes('form') || cls.includes('signup') || cls.includes('subscribe'))) {
          return 'form'
        }
        if (tag === 'table' || classes.some((cls) => cls.includes('table')) || descriptionLower.includes('table')) {
          return 'table'
        }
        if (tag === 'footer' || role === 'contentinfo' || classes.some((cls) => cls.includes('footer'))) {
          return 'footer'
        }
        if (tag === 'header' || classes.some((cls) => cls.includes('hero') || cls.includes('masthead'))) {
          return 'hero'
        }
        if (tag === 'aside' || classes.some((cls) => cls.includes('sidebar') || cls.includes('aside'))) {
          return 'sidebar'
        }
        if (classes.some((cls) => cls.includes('card'))) {
          return 'card-grid'
        }
        if (descriptionLower.includes('grid layout') && childCount >= 4) {
          return 'card-grid'
        }
        return 'content'
      }

      const captureSection = (el: Element) => {
        const style = window.getComputedStyle(el)
        const display = style.display || 'block'
        const flexDirection = style.flexDirection
        const gridTemplateColumns = style.gridTemplateColumns
        const gridTemplateRows = style.gridTemplateRows

        const childElements = Array.from(el.children).filter((child) => {
          return isVisible(child as Element)
        })

        const tag = el.tagName.toLowerCase()
        const role = el.getAttribute('role') || null
        const classList = Array.from(el.classList)

        let columns: number | null = null
        let rows: number | null = null

        if (display === 'grid' && gridTemplateColumns) {
          columns = gridTemplateColumns.split(' ').filter(Boolean).length
          rows = gridTemplateRows ? gridTemplateRows.split(' ').filter(Boolean).length : childElements.length
        } else if (display === 'flex') {
          if (flexDirection === 'row' || flexDirection === 'row-reverse') {
            columns = childElements.length
            rows = 1
          } else if (flexDirection === 'column' || flexDirection === 'column-reverse') {
            columns = 1
            rows = childElements.length
          }
        } else {
          columns = 1
          rows = childElements.length
        }

        const descriptionParts: string[] = []
        if (display === 'grid') descriptionParts.push('grid layout')
        if (display === 'flex') descriptionParts.push(`flex ${flexDirection || 'row'}`)
        if (columns && columns > 1) descriptionParts.push(`${columns} columns`)
        if (rows && rows > 1) descriptionParts.push(`${rows} rows`)
        if (childElements.length > 0) descriptionParts.push(`${childElements.length} child blocks`)

        const description = descriptionParts.join(' • ') || 'block section'

        const typography = childElements.slice(0, 5).map((child) => {
          const childStyle = window.getComputedStyle(child)
          return {
            fontFamily: childStyle.fontFamily || null,
            fontSize: childStyle.fontSize || null,
            fontWeight: childStyle.fontWeight || null,
            lineHeight: childStyle.lineHeight || null
          }
        })

        const colors = childElements.slice(0, 5).map((child) => {
          const childStyle = window.getComputedStyle(child)
          return {
            color: childStyle.color || null,
            backgroundColor: childStyle.backgroundColor || null
          }
        })

        const category = classifySection(tag, role, classList, description, childElements.length)

        return {
          tag,
          role,
          category,
          display,
          columns,
          rows,
          childCount: childElements.length,
          description,
          classList,
          id: el.id || null,
          typography,
          colors,
          spacing: {
            margin: style.margin || null,
            padding: style.padding || null
          }
        }
      }

      const topLevel = Array.from(document.body.children).filter((el) => {
        return isVisible(el) && el.tagName !== 'SCRIPT' && el.tagName !== 'STYLE'
      })

      const targeted = Array.from(document.querySelectorAll('form, table, footer, nav, header')).filter(
        (el) => isVisible(el)
      )

      const uniqueElements = Array.from(new Set([...topLevel, ...targeted]))

      return uniqueElements.slice(0, 30).map(captureSection)
    })

    return sections
  } catch (error) {
    console.warn('Layout wireframe extraction failed', error)
    return []
  } finally {
    await page.close().catch(() => undefined)
    await browser.close().catch(() => undefined)
  }
}

async function launchBrowser(): Promise<Browser> {
  return chromium.launch({
    headless: true,
    args: ['--disable-dev-shm-usage', '--no-sandbox'],
    chromiumSandbox: false
  })
}
