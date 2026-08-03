/**
 * POST /api/contracts/import
 * Import tokens.json / DESIGN.md / CSS / Tailwind → Design Contract ZIP (Pro).
 */

import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { assertProAccess } from '@/lib/billing/entitlements'
import { buildStudioContractPack } from '@/lib/contracts/authored-contract'
import { importDesignTokens } from '@/lib/contracts/import-tokens'
import { agentRatelimit } from '@/lib/ratelimit'

export const runtime = 'nodejs'
export const maxDuration = 30

const bodySchema = z.object({
  content: z.string().min(8).max(400_000),
  format: z.enum(['auto', 'dtcg', 'design-md', 'css', 'tailwind']).optional(),
  name: z.string().max(80).optional(),
  formatOut: z.enum(['zip', 'json']).optional(),
})

export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for') || 'anonymous'
  const limited = await agentRatelimit.limit(`import-pack:${ip}`)
  if (!limited.success) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })
  }

  const access = await assertProAccess()
  if (!access.ok) {
    return NextResponse.json(
      { error: access.error, code: access.code, upgradePath: access.upgradePath },
      { status: access.status }
    )
  }

  try {
    const contentType = request.headers.get('content-type') || ''
    let content = ''
    let format: z.infer<typeof bodySchema>['format'] = 'auto'
    let name: string | undefined
    let formatOut: 'zip' | 'json' = 'zip'

    if (contentType.includes('multipart/form-data')) {
      const form = await request.formData()
      const file = form.get('file')
      if (file instanceof File) {
        content = await file.text()
        if (!name && file.name) {
          name = file.name.replace(/\.(json|md|css|js|ts|cjs|mjs)$/i, '')
        }
      } else if (typeof form.get('content') === 'string') {
        content = String(form.get('content'))
      }
      const fmt = form.get('format')
      if (typeof fmt === 'string') format = fmt as typeof format
      const n = form.get('name')
      if (typeof n === 'string') name = n
      if (form.get('formatOut') === 'json') formatOut = 'json'
    } else {
      const body = bodySchema.parse(await request.json())
      content = body.content
      format = body.format
      name = body.name
      formatOut = body.formatOut || 'zip'
    }

    if (content.trim().length < 8) {
      return NextResponse.json({ error: 'Import content is empty' }, { status: 400 })
    }

    const imported = importDesignTokens(content, { name, format: format || 'auto' })
    const { pack, zip, fileName } = buildStudioContractPack(imported.system)

    if (formatOut === 'json') {
      return NextResponse.json({
        format: imported.format,
        warnings: imported.warnings,
        tokenCount: imported.tokenCount,
        system: imported.system,
        installCommand: pack.installCommand,
        fileName,
        designMd: pack.designMd.markdown,
      })
    }

    return new NextResponse(Buffer.from(zip), {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Cache-Control': 'no-store',
        'X-Import-Format': imported.format,
        'X-Design-Contract-Install': pack.installCommand,
      },
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid import payload', details: error.issues },
        { status: 400 }
      )
    }
    const message = error instanceof Error ? error.message : 'Import failed'
    console.error('[contracts/import]', error)
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
