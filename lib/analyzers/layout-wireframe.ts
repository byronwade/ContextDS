import { chromium } from 'playwright'

export type WireframeSection = {
  tag: string
  role: string | null
  display: string
  columns: number | null
  rows: number | null
  childCount: number
  description: string
}

export async function collectLayoutWireframe(url: string, timeoutMs = 15000): Promise<WireframeSection[]> {
  const browser = await chromium.launch({ headless: true, args: ['--disable-dev-shm-usage', '--no-sandbox'] })
  const page = await browser.newPage()

  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: timeoutMs })

    const sections = await page.evaluate(() => {
      const captureSection = (el: Element) => {
        const style = window.getComputedStyle(el)
        const display = style.display || 'block'
        const flexDirection = style.flexDirection
        const gridTemplateColumns = style.gridTemplateColumns
        const gridTemplateRows = style.gridTemplateRows

        const childElements = Array.from(el.children).filter((child) => {
          const childStyle = window.getComputedStyle(child as Element)
          const rect = (child as Element).getBoundingClientRect()
          return !(childStyle.display === 'none' || rect.width === 0 || rect.height === 0)
        })

        const tag = el.tagName.toLowerCase()
        const role = (el.getAttribute('role') || null)

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

        return {
          tag,
          role,
          display,
          columns,
          rows,
          childCount: childElements.length,
          description
        }
      }

      const topLevel = Array.from(document.body.children).filter((el) => {
        const style = window.getComputedStyle(el)
        const rect = el.getBoundingClientRect()
        return !(style.display === 'none' || rect.width === 0 || rect.height === 0 || el.tagName === 'SCRIPT' || el.tagName === 'STYLE')
      })

      return topLevel.slice(0, 20).map(captureSection)
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
