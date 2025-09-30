/**
 * Token Export API
 * Exports design tokens in multiple formats (Figma, XD, Swift, Android, CSS, etc.)
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db, tokenSets } from '@/lib/db'
import { eq } from 'drizzle-orm'
import { exportTokens, getFileExtension, getMimeType, type ExportFormat } from '@/lib/exporters/token-exporter'

const exportRequestSchema = z.object({
  tokenSetId: z.string().optional(),
  domain: z.string().optional(),
  format: z.enum(['figma', 'xd', 'swift', 'android', 'css', 'scss', 'js', 'ts', 'json']),
  download: z.boolean().default(true)
}).refine(data => data.tokenSetId || data.domain, {
  message: 'Either tokenSetId or domain must be provided'
})

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json()
    const params = exportRequestSchema.parse(payload)

    // Find token set by ID or domain
    let tokenSet

    if (params.tokenSetId) {
      const [result] = await db
        .select()
        .from(tokenSets)
        .where(eq(tokenSets.id, params.tokenSetId))
        .limit(1)

      tokenSet = result
    } else if (params.domain) {
      // Find most recent token set for domain
      const siteQuery = await db.query.sites.findFirst({
        where: (sites: typeof import('@/lib/db/schema').sites.$inferSelect, { eq }: { eq: typeof import('drizzle-orm').eq }) => eq(sites.domain, params.domain),
        with: {
          tokenSets: {
            orderBy: (tokenSets: typeof import('@/lib/db/schema').tokenSets.$inferSelect, { desc }: { desc: typeof import('drizzle-orm').desc }) => [desc(tokenSets.versionNumber)],
            limit: 1
          }
        }
      })

      tokenSet = siteQuery?.tokenSets[0]
    }

    if (!tokenSet) {
      return NextResponse.json(
        { error: 'Token set not found' },
        { status: 404 }
      )
    }

    // Export tokens to requested format
    const exported = exportTokens({
      format: params.format as ExportFormat,
      tokens: tokenSet.tokensJson as any,
      metadata: {
        name: params.domain || 'design-tokens',
        version: String(tokenSet.versionNumber || 1)
      }
    })

    // Determine filename
    const ext = getFileExtension(params.format as ExportFormat)
    const filename = `${params.domain || 'tokens'}-${params.format}.${ext}`

    // Return as download or inline
    if (params.download) {
      return new NextResponse(exported, {
        headers: {
          'Content-Type': getMimeType(params.format as ExportFormat),
          'Content-Disposition': `attachment; filename="${filename}"`,
          'Cache-Control': 'public, max-age=3600'
        }
      })
    } else {
      return NextResponse.json({
        format: params.format,
        filename,
        content: exported
      })
    }
  } catch (error) {
    console.error('Export error', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Invalid request parameters',
          details: error.issues
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Export failed'
      },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)

  const domain = searchParams.get('domain')
  const format = searchParams.get('format') || 'json'

  if (!domain) {
    return NextResponse.json(
      { error: 'Domain parameter is required' },
      { status: 400 }
    )
  }

  try {
    return POST(
      new NextRequest(request.url, {
        method: 'POST',
        body: JSON.stringify({ domain, format, download: true })
      })
    )
  } catch (error) {
    return NextResponse.json(
      { error: 'Export failed' },
      { status: 500 }
    )
  }
}