import { NextRequest, NextResponse } from 'next/server'
import { getSite, listScanVersions } from '@/lib/storage/serverless-store'

export const revalidate = 3600

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function isSafeColor(value: string): boolean {
  return /^#[0-9a-fA-F]{3,8}$/.test(value) || /^rgba?\([\d\s.,%]+\)$/.test(value)
}

/**
 * Public embeddable Design Contract card.
 *
 *   ![domain design system](https://designcontracts.sh/api/badge/stripe.com)
 *
 * Query: theme=dark|light (default dark), variant=card|badge (default card).
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ domain: string }> }
) {
  try {
    const { domain: rawDomain } = await params
    const domain = decodeURIComponent(rawDomain || '')
      .trim()
      .toLowerCase()
      .replace(/^www\./, '')
    const { searchParams } = new URL(request.url)
    const theme = searchParams.get('theme') === 'light' ? 'light' : 'dark'
    const variant = searchParams.get('variant') === 'badge' ? 'badge' : 'card'

    const site = await getSite(domain)
    const versions = site ? await listScanVersions(domain) : []
    const colors = (site?.preview?.colors ?? versions[0]?.colors ?? [])
      .filter(isSafeColor)
      .slice(0, 8)
    const font = site?.preview?.fonts?.[0] ?? null
    const tokens = site?.tokenCount ?? 0
    const confidence = site?.confidence ? Math.round(site.confidence) : null

    const palette = {
      dark: {
        bg: '#1d1813',
        subtle: '#18130f',
        ink: '#f4efe5',
        muted: '#aaa196',
        faint: '#7f766c',
        border: 'rgba(240,235,227,0.10)',
        accent: '#c08a5f',
      },
      light: {
        bg: '#fffdf8',
        subtle: '#faf5ec',
        ink: '#2b2723',
        muted: '#675f57',
        faint: '#766e65',
        border: 'rgba(67,52,38,0.13)',
        accent: '#8f5a38',
      },
    }[theme]

    const label = escapeXml(domain || 'unknown')

    let svg: string
    if (variant === 'badge' || !site) {
      // Compact badge: wordmark + domain (+ swatches when known)
      const swatches = colors
        .slice(0, 5)
        .map(
          (color, index) =>
            `<rect x="${8 + index * 14}" y="8" width="12" height="12" rx="3" fill="${color}" stroke="${palette.border}"/>`
        )
        .join('')
      const swatchWidth = colors.length > 0 ? 8 + Math.min(colors.length, 5) * 14 : 8
      const textX = swatchWidth + 4
      const width = textX + label.length * 6.6 + 96
      svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${Math.round(width)}" height="28" role="img" aria-label="${label} design contract">
  <rect width="100%" height="100%" rx="7" fill="${palette.bg}" stroke="${palette.border}"/>
  ${swatches}
  <text x="${textX}" y="18.5" font-family="ui-monospace,Menlo,monospace" font-size="11" fill="${palette.ink}">${label}</text>
  <text x="${Math.round(width) - 8}" y="18.5" text-anchor="end" font-family="ui-monospace,Menlo,monospace" font-size="10" fill="${palette.accent}">designcontracts.sh</text>
</svg>`
    } else {
      // Card: palette band + domain + stats
      const bandStops = colors.length > 0 ? colors : [palette.subtle]
      const band = bandStops
        .map((color, index) => {
          const bandWidth = 360 / bandStops.length
          return `<rect x="${index * bandWidth}" y="0" width="${bandWidth + 1}" height="34" fill="${color}"/>`
        })
        .join('')
      const stats = [
        `${tokens} tokens`,
        confidence !== null ? `${confidence}% confidence` : null,
        font ? escapeXml(font) : null,
      ]
        .filter(Boolean)
        .join('   ·   ')
      svg = `<svg xmlns="http://www.w3.org/2000/svg" width="360" height="120" role="img" aria-label="${label} design system card">
  <defs>
    <clipPath id="r"><rect width="360" height="120" rx="12"/></clipPath>
  </defs>
  <g clip-path="url(#r)">
    <rect width="360" height="120" fill="${palette.bg}"/>
    ${band}
    <text x="16" y="66" font-family="-apple-system,Segoe UI,sans-serif" font-size="19" font-weight="600" fill="${palette.ink}">${label}</text>
    <text x="16" y="88" font-family="ui-monospace,Menlo,monospace" font-size="10.5" fill="${palette.muted}">${escapeXml(stats)}</text>
    <text x="16" y="107" font-family="ui-monospace,Menlo,monospace" font-size="10" fill="${palette.accent}">designcontracts.sh/site/${label}</text>
  </g>
  <rect width="359" height="119" x="0.5" y="0.5" rx="12" fill="none" stroke="${palette.border}"/>
</svg>`
    }

    return new NextResponse(svg, {
      headers: {
        'Content-Type': 'image/svg+xml; charset=utf-8',
        'Cache-Control': 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400',
        'Access-Control-Allow-Origin': '*',
      },
    })
  } catch (error) {
    console.error('Badge render failed:', error)
    return NextResponse.json({ error: 'Badge unavailable' }, { status: 500 })
  }
}
