/**
 * Export scan results in an LLM-friendly package.
 * Usage: GET /api/scan/export-llm?domain=example.com&format=json|markdown
 */

import { type NextRequest, NextResponse } from 'next/server'
import { normalizeDomain } from '@/lib/domain'
import { getScan, type StoredScanResult } from '@/lib/storage/serverless-store'

export const runtime = 'nodejs'

function buildLlmPackage(scan: StoredScanResult) {
  return {
    metadata: {
      domain: scan.domain,
      url: scan.url,
      scannedAt: scan.scannedAt,
      confidence: scan.summary.confidence,
      completeness: scan.summary.completeness,
      reliability: scan.summary.reliability,
      mode: scan.metadata.mode,
      engine: scan.metadata.engine,
    },
    tokens: scan.curatedTokens ?? scan.tokens,
    layout: scan.layoutDNA,
    brand: scan.brandAnalysis,
    promptPack: scan.promptPack,
    designMd: scan.designMd,
    designSkill: scan.designSkill,
    designContract: scan.designContract
      ? {
          slug: scan.designContract.slug,
          title: scan.designContract.title,
          profile: scan.designContract.profile,
          installCommand: scan.designContract.installCommand,
          summary: scan.designContract.summary,
          download: `/api/contracts/download?domain=${encodeURIComponent(scan.domain)}`,
          files: (scan.designContract.files || []).map((file) => file.path),
        }
      : undefined,
    semanticGraph: scan.semanticGraph,
    summary: scan.summary,
  }
}

function toMarkdown(scan: StoredScanResult): string {
  if (scan.designMd?.markdown) {
    return scan.designMd.markdown
  }

  const pack = buildLlmPackage(scan)
  return [
    `# Design system — ${scan.domain}`,
    '',
    `Scanned: ${scan.scannedAt}`,
    `Confidence: ${scan.summary.confidence}%`,
    '',
    '## Tokens',
    '```json',
    JSON.stringify(pack.tokens, null, 2),
    '```',
    '',
    scan.designSkill?.markdown ? `## Agent skill\n\n${scan.designSkill.markdown}` : '',
  ]
    .filter(Boolean)
    .join('\n')
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const domainParam = searchParams.get('domain')
    const format = (searchParams.get('format') || 'json').toLowerCase()

    if (!domainParam) {
      return NextResponse.json({ error: 'Missing domain parameter' }, { status: 400 })
    }

    const domain = normalizeDomain(domainParam)
    const scan = await getScan(domain)

    if (!scan || scan.status !== 'completed') {
      return NextResponse.json(
        { error: `No completed scan found for ${domain}. Run /api/scan first.` },
        { status: 404 }
      )
    }

    if (format === 'markdown' || format === 'md') {
      return new NextResponse(toMarkdown(scan), {
        headers: {
          'Content-Type': 'text/markdown; charset=utf-8',
          'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
        },
      })
    }

    return NextResponse.json(buildLlmPackage(scan), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
      },
    })
  } catch (error) {
    console.error('Error exporting LLM format:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { domain?: string; format?: string }
    const domain = normalizeDomain(String(body.domain || ''))
    const format = (body.format || 'json').toLowerCase()

    if (!domain) {
      return NextResponse.json({ error: 'Missing domain' }, { status: 400 })
    }

    const scan = await getScan(domain)
    if (!scan || scan.status !== 'completed') {
      return NextResponse.json(
        { error: `No completed scan found for ${domain}. Run /api/scan first.` },
        { status: 404 }
      )
    }

    if (format === 'markdown' || format === 'md') {
      return new NextResponse(toMarkdown(scan), {
        headers: {
          'Content-Type': 'text/markdown; charset=utf-8',
          'Cache-Control': 'public, s-maxage=3600',
        },
      })
    }

    return NextResponse.json(buildLlmPackage(scan))
  } catch (error) {
    console.error('Error exporting LLM format:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
