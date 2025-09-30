/**
 * API endpoint to export scan results in LLM-optimized format
 * Usage: /api/scan/export-llm?domain=example.com
 */

import { NextRequest, NextResponse } from 'next/server'
import { db, scans, sites } from '@/lib/db'
import { eq, desc } from 'drizzle-orm'
import { exportForLLM } from '@/lib/exporters/llm-format'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const domain = searchParams.get('domain')
    const scanId = searchParams.get('scanId')

    if (!domain && !scanId) {
      return NextResponse.json(
        { error: 'Missing domain or scanId parameter' },
        { status: 400 }
      )
    }

    let scanResult: any

    if (scanId) {
      // Get specific scan by ID
      const [scan] = await db
        .select()
        .from(scans)
        .where(eq(scans.id, scanId))
        .limit(1)

      if (!scan || !scan.result) {
        return NextResponse.json(
          { error: 'Scan not found or incomplete' },
          { status: 404 }
        )
      }

      scanResult = scan.result
    } else if (domain) {
      // Get latest scan for domain
      const [site] = await db
        .select()
        .from(sites)
        .where(eq(sites.domain, domain))
        .limit(1)

      if (!site) {
        return NextResponse.json(
          { error: 'No scans found for this domain' },
          { status: 404 }
        )
      }

      const [latestScan] = await db
        .select()
        .from(scans)
        .where(eq(scans.siteId, site.id))
        .orderBy(desc(scans.startedAt))
        .limit(1)

      if (!latestScan || !latestScan.result) {
        return NextResponse.json(
          { error: 'No completed scans found' },
          { status: 404 }
        )
      }

      scanResult = latestScan.result
    }

    // Convert to LLM-optimized format
    const llmFormat = exportForLLM(scanResult as any)

    return NextResponse.json(llmFormat, {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400'
      }
    })
  } catch (error) {
    console.error('Error exporting LLM format:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * Return as plain text for easy AI consumption
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { domain, format = 'json' } = body

    if (!domain) {
      return NextResponse.json(
        { error: 'Missing domain' },
        { status: 400 }
      )
    }

    // Get latest scan
    const [site] = await db
      .select()
      .from(sites)
      .where(eq(sites.domain, domain))
      .limit(1)

    if (!site) {
      return NextResponse.json(
        { error: 'No scans found for this domain' },
        { status: 404 }
      )
    }

    const [latestScan] = await db
      .select()
      .from(scans)
      .where(eq(scans.siteId, site.id))
      .orderBy(desc(scans.startedAt))
      .limit(1)

    if (!latestScan || !latestScan.result) {
      return NextResponse.json(
        { error: 'No completed scans found' },
        { status: 404 }
      )
    }

    const llmFormat = exportForLLM(latestScan.result as any)

    if (format === 'markdown') {
      // Convert to markdown for better AI readability
      const markdown = convertToMarkdown(llmFormat)
      return new NextResponse(markdown, {
        headers: {
          'Content-Type': 'text/markdown',
          'Cache-Control': 'public, s-maxage=3600'
        }
      })
    }

    return NextResponse.json(llmFormat)
  } catch (error) {
    console.error('Error exporting LLM format:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * Convert LLM format to markdown for better AI readability
 */
function convertToMarkdown(data: any): string {
  return `# Design System for ${data.metadata.domain}

Scanned: ${data.metadata.scannedAt}
Confidence: ${data.metadata.confidence}%
Completeness: ${data.metadata.completeness}%

---

## Colors

### Brand Colors
${data.tokens.colors.brand.map((c: any) => `- **${c.name}**: \`${c.hex}\` (${c.usage})`).join('\n')}

### Neutral Colors
${data.tokens.colors.neutral.map((c: any) => `- **${c.name}**: \`${c.hex}\` (${c.usage})`).join('\n')}

### Semantic Colors
${data.tokens.colors.semantic.map((c: any) => `- **${c.name}**: \`${c.hex}\` - ${c.purpose} (${c.usage})`).join('\n')}

**Instructions**: ${data.instructions.howToUseColors}

---

## Typography

### Font Families
${data.tokens.typography.families.map((f: any) => `- **${f.name}** (${f.usage}) - ${f.semantic}`).join('\n')}

### Font Sizes
${data.tokens.typography.scale.map((s: any) => `- **${s.size}** - ${s.semantic} (${s.usage})`).join('\n')}

### Font Weights
${data.tokens.typography.weights.map((w: any) => `- **${w.weight}** - ${w.semantic}`).join('\n')}

**Instructions**: ${data.instructions.howToUseTypography}

---

## Spacing System

**Type**: ${data.layout.spacingScale.type}
**Base Unit**: ${data.layout.spacingScale.baseUnit}px
**Scale**: ${data.layout.spacingScale.scale.join(', ')}

${data.tokens.spacing.common.map((s: any) => `- **${s.value}** - ${s.semantic} (${s.usage})`).join('\n')}

**Instructions**: ${data.instructions.howToUseSpacing}

---

## Components

### Buttons

${data.components.buttons.map((btn: any) => `
#### ${btn.variant} Button
${btn.description}

**Base Styles**:
\`\`\`css
${Object.entries(btn.css.base).map(([k, v]) => `${k}: ${v};`).join('\n')}
\`\`\`

${btn.css.hover ? `**Hover**:\n\`\`\`css\n${Object.entries(btn.css.hover).map(([k, v]) => `${k}: ${v};`).join('\n')}\n\`\`\`\n` : ''}
`).join('\n')}

**Instructions**: ${data.instructions.howToCreateButton}

### Inputs

${data.components.inputs.map((input: any) => `
#### ${input.variant} Input
${input.description}

\`\`\`css
${Object.entries(input.css.base).map(([k, v]) => `${k}: ${v};`).join('\n')}
\`\`\`
`).join('\n')}

**Instructions**: ${data.instructions.howToCreateInput}

---

## Layout System

### Containers
${data.layout.containers.example}

### Grid Layouts
${data.layout.grids.common.map((g: any) => `- **${g.name}**: \`${g.example}\``).join('\n')}

### Flex Layouts
${data.layout.flex.common.map((f: any) => `- **${f.name}**: \`${f.example}\``).join('\n')}

**Instructions**: ${data.instructions.howToHandleLayout}

---

## Z-Index Layers

- Base: ${data.layers.base}
- Content: ${data.layers.content}
- Dropdown: ${data.layers.dropdown}
- Sticky: ${data.layers.sticky}
- Overlay: ${data.layers.overlay}
- Modal: ${data.layers.modal}
- Tooltip: ${data.layers.tooltip}

**Example**: ${data.layers.example}

---

## Animations

### Durations
- Fast: ${data.animations.durations.fast}
- Normal: ${data.animations.durations.normal}
- Slow: ${data.animations.durations.slow}

### Easing
Recommended: ${data.animations.easing.recommended}
Common: ${data.animations.easing.common.join(', ')}

### Common Transitions
${data.animations.transitions.map((t: any) => `- **${t.name}**: \`${t.example}\``).join('\n')}

**Instructions**: ${data.instructions.howToHandleAnimations}

---

## Quick Reference

This design system has been automatically extracted from ${data.metadata.domain}.
Use the instructions above to recreate components with pixel-perfect accuracy.
`
}