import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getDb, tokenSets, sites } from '@/lib/db'
import { eq, desc } from 'drizzle-orm'
import {
  exportTokens,
  getFileExtension,
  getMimeType,
  type ExportFormat,
} from '@/lib/exporters/comprehensive-token-exporter'

const exportRequestSchema = z
  .object({
    tokenSetId: z.string().optional(),
    domain: z.string().optional(),
    format: z.enum([
      'w3c-json',
      'figma',
      'figma-variables',
      'tailwind',
      'css',
      'scss',
      'sass',
      'less',
      'stylus',
      'ts',
      'js',
      'json',
      'yaml',
      'style-dictionary',
      'theo',
      'swift',
      'kotlin',
      'xml',
      'dart',
    ]),
    download: z.boolean().default(true),
    options: z
      .object({
        includeComments: z.boolean().default(true),
        prettify: z.boolean().default(true),
        prefix: z.string().default(''),
        tailwindVersion: z.union([z.literal(3), z.literal(4)]).default(4),
      })
      .optional(),
  })
  .refine((data) => data.tokenSetId || data.domain, {
    message: 'Either tokenSetId or domain must be provided',
  })

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json()
    const params = exportRequestSchema.parse(payload)
    const db = await getDb()

    let tokenSet

    if (params.tokenSetId) {
      const [result] = await db
        .select()
        .from(tokenSets)
        .where(eq(tokenSets.id, params.tokenSetId))
        .limit(1)
      tokenSet = result
    } else if (params.domain) {
      const [site] = await db
        .select()
        .from(sites)
        .where(eq(sites.domain, params.domain))
        .limit(1)

      if (site) {
        const [latest] = await db
          .select()
          .from(tokenSets)
          .where(eq(tokenSets.siteId, site.id))
          .orderBy(desc(tokenSets.versionNumber))
          .limit(1)
        tokenSet = latest
      }
    }

    if (!tokenSet) {
      return NextResponse.json({ error: 'Token set not found' }, { status: 404 })
    }

    const tokenData = tokenSet.tokensJson as Record<string, unknown>
    const exported = exportTokens({
      format: params.format as ExportFormat,
      tokens: tokenData,
      metadata: {
        name: params.domain || 'design-tokens',
        version: String(tokenSet.versionNumber || 1),
        description: `Design tokens for ${params.domain}`,
        homepage: `https://contextds.com/site/${params.domain}`,
      },
      options: params.options,
    })

    const ext = getFileExtension(params.format as ExportFormat)
    const filename = `${params.domain || 'tokens'}-${params.format}.${ext}`

    if (params.download) {
      return new NextResponse(exported, {
        headers: {
          'Content-Type': getMimeType(params.format as ExportFormat),
          'Content-Disposition': `attachment; filename="${filename}"`,
          'Cache-Control': 'public, max-age=3600',
        },
      })
    }

    return NextResponse.json({
      format: params.format,
      filename,
      content: exported,
    })
  } catch (error) {
    console.error('Export error', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request parameters', details: error.issues },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Export failed' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const domain = searchParams.get('domain')
  const format = searchParams.get('format') || 'json'

  if (!domain) {
    return NextResponse.json({ error: 'Domain parameter is required' }, { status: 400 })
  }

  return POST(
    new NextRequest(request.url, {
      method: 'POST',
      body: JSON.stringify({ domain, format, download: true }),
    })
  )
}
