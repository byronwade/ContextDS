import { NextRequest, NextResponse } from 'next/server'
import { trackStatEvent } from '@/lib/storage/platform-stats'
import { getScan } from '@/lib/storage/serverless-store'
import {
  buildDesignContractPackage,
  hydrateScreenshotFiles,
  zipDesignContractPackage,
} from '@/lib/contracts/design-contract-package'

export const runtime = 'nodejs'
export const maxDuration = 30

/**
 * Download an installable Design Contract ZIP for a scanned domain.
 * Compatible with https://github.com/byronwade/Design
 */
export async function GET(request: NextRequest) {
  const domainParam = request.nextUrl.searchParams.get('domain')
  if (!domainParam) {
    return NextResponse.json({ error: 'domain query param is required' }, { status: 400 })
  }

  const domain = domainParam
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .split('/')[0]

  const scan = await getScan(domain)
  if (!scan || scan.status !== 'completed') {
    return NextResponse.json(
      {
        error: 'No scan found for this domain. Scan the site first.',
        suggestion: `POST /api/scan with { "url": "https://${domain}" }`,
      },
      { status: 404 }
    )
  }

  // Prefer stored pack files; rebuild if an older scan lacks them
  let files = scan.designContract?.files?.filter(
    (file) => file.content || file.encoding === 'base64'
  )
  if (!files?.length) {
    const rebuilt = buildDesignContractPackage({
      domain: scan.domain,
      url: scan.url,
      curatedTokens: (scan.curatedTokens || scan.tokens || {}) as never,
      layoutDNA: (scan.layoutDNA || null) as never,
      brandAnalysis: (scan.brandAnalysis || null) as never,
      confidence: scan.summary.confidence,
      scanId: scan.metadata.scanId,
      profile: (scan.designContract?.profile as 'web-app' | 'web-marketing') || 'web-marketing',
      semanticGraph: (scan.semanticGraph || null) as never,
      screenshots: scan.screenshots?.map((shot) => ({
        label: shot.label,
        url: shot.url,
        mime: shot.mime,
        note: 'Hydrated from scan store for download.',
      })),
    })
    files = rebuilt.files
  }

  // Pull screenshot bytes into the ZIP when stored pack only has remote URLs
  files = await hydrateScreenshotFiles(files, scan.screenshots)

  const pack = {
    slug: scan.designContract?.slug || domain.replace(/[^a-z0-9]+/g, '-'),
    title: scan.designContract?.title || `${domain} Design Contract`,
    domain,
    profile:
      (scan.designContract?.profile as 'web-app' | 'web-marketing') || 'web-marketing',
    appType: (scan.metadata?.appType as string) || null,
    files,
    designMd: scan.designMd || {
      markdown: files.find((f) => f.path === 'DESIGN.md')?.content || '',
      fileName: 'DESIGN.md',
      summary: {
        colorCount: 0,
        typographyCount: 0,
        spacingCount: 0,
        hasComponents: true,
      },
    },
    installCommand:
      scan.designContract?.installCommand ||
      'npx --yes github:byronwade/Design init --profile web-marketing',
    summary: scan.designContract?.summary || {
      colorCount: 0,
      typographyCount: 0,
      spacingCount: 0,
      fileCount: files.length,
    },
  }

  const zip = zipDesignContractPackage(pack)
  const fileName = `${pack.slug}-design-contract.zip`

  void trackStatEvent('download')

  return new NextResponse(Buffer.from(zip), {
    status: 200,
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${fileName}"`,
      'Cache-Control': 'private, max-age=60',
    },
  })
}
