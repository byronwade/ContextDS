/**
 * Build an installable Design Contract pack compatible with
 * https://github.com/byronwade/Design
 *
 * Authored façade (what users download / drop into a project):
 *   DESIGN.md
 *   AGENTS.md
 *   INSTALL.md
 *   .agents/skills/design/SKILL.md
 *   .agents/skills/<site>-design-system/SKILL.md
 *   design/REFERENCES.md
 *   design/references/manifest.json
 *   design/gaps/README.md + system-gap.example.json
 *   design/graph.json + design/GRAPH.md   (when a semantic graph exists)
 *   .design/config.json
 *   .design/receipts/contextds-drift.json (observation-only drift evidence)
 *   contract.json  (scan provenance metadata)
 */

import { createHash } from 'node:crypto'
import { strToU8, zipSync } from 'fflate'
import type { AppTypeDetection } from '@/lib/analyzers/app-type'
import {
  type DesignMdArtifact,
  type DesignMdInput,
  generateDesignMd,
} from '@/lib/analyzers/design-md-generator'
import { generateDesignSkill } from '@/lib/analyzers/design-skill-generator'
import { type SemanticGraph, semanticGraphToMarkdown } from '@/lib/analyzers/semantic-graph'
import {
  buildContextDsDriftReceipt,
  type DriftObservation,
  driftReceiptJson,
} from '@/lib/contracts/contextds-drift'

export type DesignContractPackageInput = DesignMdInput & {
  scanId?: string
  profile?: 'web-app' | 'web-marketing'
  appType?: string
  appTypeDetection?: AppTypeDetection | null
  driftObservations?: DriftObservation[]
  screenshots?: Array<{
    label: string
    url?: string
    note?: string
    mime?: string
    /** Raw image bytes as base64 — embedded into design/references/surfaces/ */
    bytesBase64?: string
  }>
  semanticGraph?: SemanticGraph | null
}

export type DesignContractFile = {
  path: string
  /** UTF-8 text, or base64 when encoding === 'base64' (image bytes) */
  content: string
  encoding?: 'utf8' | 'base64'
}

export type DesignContractPackage = {
  slug: string
  title: string
  domain: string
  profile: 'web-app' | 'web-marketing'
  appType: string | null
  files: DesignContractFile[]
  designMd: DesignMdArtifact
  installCommand: string
  summary: {
    colorCount: number
    typographyCount: number
    spacingCount: number
    fileCount: number
  }
}

function slugify(domain: string): string {
  return domain
    .toLowerCase()
    .replace(/^www\./, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

function agentsMd(domain: string): string {
  return `# Product design and UI engineering

This repository uses a compiled design contract extracted from **${domain}** via Design Contracts.

The managed instructions below are the minimum routing surface for AI agents; project-specific instructions may be added outside the managed block.

<!-- design-contract:managed:start -->
## Required agent workflow

1. Run \`npx --yes github:byronwade/Design status\`.
2. Run \`npx --yes github:byronwade/Design resolve --request "<task>"\`.
3. Read \`DESIGN.md\` and only the returned task packet under \`.design/generated/TASK.json\`.
4. Use the universal design Skill at \`.agents/skills/design/SKILL.md\`.
5. Inspect production components, routes, tests, and applicable files under \`design/references/\` — especially screenshot images under \`design/references/surfaces/\`.
6. When layout, density, materials, or chrome are ambiguous, **open the reference screenshots** and match what you see before inventing UI.
7. Read \`design/graph.json\` (and \`design/GRAPH.md\`) to understand how tokens, roles, components, and layout link together before inventing mappings.
8. Build with semantic tokens and mapped components from \`DESIGN.md\`. Missing capability is a design-system gap — do not invent page-local styles.
9. Run \`npx --yes github:byronwade/Design check\`.
10. Run \`npx --yes github:byronwade/Design verify --mode release\` with evidence for affected surfaces.
11. Report the receipt path, revision, warnings, and remaining uncertainty.

## Boundaries

- \`DESIGN.md\` is the authored source of truth for visual identity and product grammar.
- \`design/graph.json\` is the linked system model (token↔role↔component↔layout). Prefer edges over guesses.
- Do not edit \`.design/generated/\` or \`.design/receipts/\` by hand.
- Visual references under \`design/references/surfaces/\` are captured screenshots agents should open when struggling.
- Scan-derived tokens seeded this contract; promote gaps intentionally after review.
- Scan-seeded drift evidence lives at \`.design/receipts/contextds-drift.json\`; it is observation-only (\`canReplaceDesignTruth: false\`) and never edits \`DESIGN.md\`. Capability gaps become \`design/gaps/*.json\` proposals per \`schemas/system-gap.schema.json\`.
<!-- design-contract:managed:end -->
`
}

function universalDesignSkill(): string {
  return `---
name: design
description: Resolve, apply, check, and verify the project DESIGN.md grammar before UI work.
---

# Design

Use this Skill for UI, component, layout, content-state, visual-reference, motion,
or design-system changes. It is the universal adapter across agents.

## Workflow

1. Run \`npx --yes github:byronwade/Design status\`.
2. Run \`npx --yes github:byronwade/Design resolve --request "<task>"\`.
3. Read the returned task model, relevant components, tokens, patterns,
   selected references, constraints, and checks. Do not load the full engine or
   full reference library unless the packet points to a specific source.
4. Inspect production code, variants, stories, tests, fixtures, routes, and
   applicable approved files under \`design/references/\` — open screenshot
   images in \`design/references/surfaces/\` when structure or material is unclear.
5. If you are struggling with hierarchy, density, chrome, or accent scarcity,
   load the reference screenshots and match them before inventing UI.
6. Build with semantic tokens and mapped production components. A missing
   capability is a design-system gap, not permission for page-local styling.
7. Run \`npx --yes github:byronwade/Design check\`.
8. Run \`npx --yes github:byronwade/Design verify --mode release\` with the
   affected surfaces and evidence files.
9. Report the receipt path, source revision, warnings, exceptions, and remaining
   uncertainty.

## Boundaries

- \`DESIGN.md\` is the authored source of truth.
- Generated context, receipts, adapters, schemas, caches, and fingerprints are not
  authored design truth.
- Component libraries are optional adapters.
- Visual references under \`design/references/surfaces/\` are project-owned screenshots — open them when stuck.
- Do not claim completion without a fresh design receipt.
- Scan-seeded drift evidence lives at \`.design/receipts/contextds-drift.json\`;
  it is observation-only (\`canReplaceDesignTruth: false\`) and never edits
  \`DESIGN.md\`. Capability gaps become \`design/gaps/*.json\` proposals per
  \`schemas/system-gap.schema.json\`.
`
}

function installMd(domain: string, installCommand: string): string {
  return `# Install this Design Contract

This pack was generated by **Design Contracts** from \`${domain}\`.

It is compatible with the open-source Design Contract engine:
https://github.com/byronwade/Design

## Fast path (drop-in)

1. Copy \`DESIGN.md\` to your project root (or merge tokens into an existing one).
2. Copy \`.agents/skills/design/SKILL.md\` into your project.
3. Copy \`AGENTS.md\` (or merge the managed block into your existing agent instructions).
4. Copy \`design/references/\` (includes \`surfaces/*.png|jpg\` screenshots agents can open).

Then install the engine adapters:

\`\`\`bash
${installCommand}
\`\`\`

If \`DESIGN.md\` already exists, the installer keeps your authored file and generates the hidden enforcement engine under \`.design/\`.

## Enforce forever

\`\`\`bash
npx --yes github:byronwade/Design resolve --request "Add a settings page"
npx --yes github:byronwade/Design check
npx --yes github:byronwade/Design verify --mode release --surface settings --evidence path/to/evidence.html
\`\`\`

Any new component your agent adds should resolve against this contract, get checked for raw values / unmapped styles, and verify with a receipt — so the design holds over time.

## Cursor / Claude

Point project rules at \`DESIGN.md\` and the \`design\` skill before generating UI. Do not invent colors, type, spacing, or radii outside the YAML front matter.
`
}

export type PackScreenshot = NonNullable<DesignContractPackageInput['screenshots']>[number] & {
  packPath?: string
  sha256?: string
}

function extForMime(mime?: string): string {
  if (!mime) return 'png'
  if (mime.includes('jpeg') || mime.includes('jpg')) return 'jpg'
  if (mime.includes('webp')) return 'webp'
  if (mime.includes('gif')) return 'gif'
  return 'png'
}

function looksLikeImageUrl(url?: string): boolean {
  if (!url) return false
  if (/^data:image\//i.test(url)) return true
  if (/\.(png|jpe?g|webp|gif)(\?|#|$)/i.test(url)) return true
  // Vercel Blob screenshot paths
  if (/\/screenshots\//i.test(url)) return true
  return false
}

/** Stable pack-relative path for an embedded surface screenshot. */
export function screenshotPackPath(index: number, label: string, mime?: string): string {
  const slug = slugify(label).slice(0, 40) || `surface-${index + 1}`
  return `design/references/surfaces/${String(index + 1).padStart(2, '0')}-${slug}.${extForMime(mime)}`
}

function normalizeShotBytes(raw?: string): string | undefined {
  if (!raw) return undefined
  const match = raw.match(/^data:([^;]+);base64,(.+)$/s)
  return (match?.[2] || raw).replace(/\s+/g, '')
}

function prepareScreenshots(
  screenshots: DesignContractPackageInput['screenshots']
): PackScreenshot[] {
  return (screenshots ?? []).map((shot, index) => {
    const bytes = normalizeShotBytes(shot.bytesBase64)
    // ~24+ base64 chars ≈ tiny valid image; reject empty stubs only
    const hasLocal = Boolean(bytes && bytes.length >= 32)
    const packPath = hasLocal ? screenshotPackPath(index, shot.label, shot.mime) : undefined
    const sha256 =
      hasLocal && bytes
        ? createHash('sha256').update(Buffer.from(bytes, 'base64')).digest('hex')
        : undefined
    return { ...shot, bytesBase64: bytes, packPath, sha256 }
  })
}

function screenshotBinaryFiles(screenshots: PackScreenshot[]): DesignContractFile[] {
  const files: DesignContractFile[] = []
  for (const shot of screenshots) {
    if (!shot.packPath || !shot.bytesBase64) continue
    files.push({
      path: shot.packPath,
      content: shot.bytesBase64,
      encoding: 'base64',
    })
  }
  return files
}

function referencesMd(domain: string, screenshots: PackScreenshot[]): string {
  const lines = [
    '---',
    'kind: visual-references',
    'status: project-owned',
    '---',
    '',
    '# Visual references',
    '',
    `Approved visual memory for the **${domain}** design contract.`,
    '',
    '**Agents:** when hierarchy, density, materials, chrome, or accent scarcity are unclear, open the image files under `design/references/surfaces/` and match what you see before inventing UI. These screenshots are ground truth — tokens alone are not enough when you are stuck.',
    '',
    'Register why each reference matters, where it applies, what to preserve, and what not to copy.',
    'External scan observations seed drift evidence; they never replace `DESIGN.md` automatically.',
    '',
    '## Selection policy',
    '',
    'The resolver selects 3-8 approved references by request, platform, component, state, confidence, and relevance.',
    'References registered in `manifest.json` are scan-derived public-web observations: preserve hierarchy, spacing rhythm, accent scarcity, and typography roles — do not copy pixel-perfect chrome, copyrighted illustrations, or product copy.',
    '',
  ]

  const withFiles = screenshots.filter((shot) => shot.packPath)
  if (withFiles.length) {
    lines.push('## Captured surfaces (open these images)', '')
    for (const shot of withFiles) {
      lines.push(`### ${shot.label}`)
      lines.push(`- File: \`${shot.packPath}\``)
      if (shot.url && looksLikeImageUrl(shot.url)) {
        lines.push(`- Remote mirror: ${shot.url}`)
      }
      lines.push(
        `- Note: ${shot.note || 'Preserve hierarchy, density, and material — do not copy pixel-perfect chrome.'}`
      )
      lines.push('')
    }
  } else if (screenshots.length) {
    lines.push('## Captured surfaces', '')
    for (const shot of screenshots) {
      lines.push(`### ${shot.label}`)
      if (shot.url) lines.push(`- Source: ${shot.url}`)
      lines.push(
        `- Note: ${shot.note || 'Preserve hierarchy, density, and material — do not copy pixel-perfect chrome.'}`
      )
      lines.push('')
    }
  } else {
    lines.push(
      '## Getting started',
      '',
      'Add screenshots under `design/references/surfaces/` and register them in `manifest.json`.',
      'A project can start with zero references; missing references do not block adoption.',
      ''
    )
  }

  return lines.join('\n')
}

function referencesManifest(url: string, screenshots: PackScreenshot[], appType?: string): string {
  const references = screenshots.map((shot, index) => {
    const usePath = Boolean(shot.packPath)
    return {
      id: `scan-surface-${index + 1}`,
      kind: 'screenshot' as const,
      title: shot.label,
      summary:
        shot.note ||
        (usePath
          ? 'Open this pack-local screenshot when layout or material is ambiguous.'
          : 'Scan-derived surface observation.'),
      source: usePath
        ? {
            path: shot.packPath!,
            ...(shot.sha256 ? { sha256: shot.sha256 } : {}),
          }
        : { url: shot.url || url },
      appliesTo: {
        platforms: ['web'],
        ...(appType ? { appTypes: [appType] } : {}),
        surfaces: [slugify(shot.label)],
      },
      ownership: {
        owner: 'scan-derived',
        license: 'public-web-observation',
        source: url,
      },
      preserve: ['hierarchy', 'spacing rhythm', 'accent scarcity', 'typography roles'],
      doNotCopy: ['pixel-perfect chrome', 'copyrighted illustrations', 'product copy'],
      confidence: usePath ? 0.85 : 0.7,
      relevance: 0.9,
      tags: ['scan', 'designcontracts', ...(usePath ? ['pack-local'] : [])],
    }
  })

  return `${JSON.stringify(
    {
      $schema:
        'https://raw.githubusercontent.com/byronwade/Design/main/schemas/reference-manifest.schema.json',
      schemaVersion: 1,
      references,
    },
    null,
    2
  )}\n`
}

function configJson(profile: string, appType?: string): string {
  return `${JSON.stringify(
    {
      $schema: 'https://raw.githubusercontent.com/byronwade/Design/main/schemas/config.schema.json',
      schemaVersion: 1,
      targets: [
        {
          id: profile,
          profile,
          root: '.',
          default: true,
          ...(appType ? { appType } : {}),
          overrides: [],
        },
      ],
      overrides: [],
      adapters: ['codex', 'claude', 'copilot'],
    },
    null,
    2
  )}\n`
}

function systemGapExampleJson(domain: string, createdAt: string): string {
  return `${JSON.stringify(
    {
      $schema:
        'https://raw.githubusercontent.com/byronwade/Design/main/schemas/system-gap.schema.json',
      schemaVersion: 1,
      id: 'system-gap-example-missing-recipe',
      classification: 'missing-recipe',
      status: 'proposed',
      summary:
        'Example gap: the scanned contract has no recipe for a surface the scan observed. Replace with real gaps found during builds.',
      evidence: {
        source: `design-contracts scan of ${domain}`,
      },
      proposal: {
        targetArtifact: 'DESIGN.md',
        change:
          'Add a recipe for the missing surface using existing semantic tokens and mapped components.',
        reason: 'Scanned tokens exist but no composition recipe covers this surface.',
      },
      createdAt,
    },
    null,
    2
  )}\n`
}

type GapClassification =
  | 'local-exception'
  | 'mapping-defect'
  | 'missing-recipe'
  | 'missing-skill'
  | 'contract-defect'

function classifyDriftKind(kind: string): GapClassification {
  if (/component|recipe|missing/i.test(kind)) return 'missing-recipe'
  if (/coverage|render|mapping|dormant/i.test(kind)) return 'mapping-defect'
  if (/crawl|surface|unverified/i.test(kind)) return 'local-exception'
  if (/typo|type|motion|contrast/i.test(kind)) return 'contract-defect'
  return 'mapping-defect'
}

function gapSlug(kind: string, index: number): string {
  const base = kind
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48)
  return `system-gap-${base || 'observation'}-${index + 1}`
}

/** Turn scan drift observations into engine-valid gap proposals (still human-reviewed). */
function gapsFromDrift(
  domain: string,
  createdAt: string,
  observations: DriftObservation[]
): DesignContractFile[] {
  const files: DesignContractFile[] = []
  const usable = observations.filter((obs) => obs.summary?.trim()).slice(0, 8)
  usable.forEach((obs, index) => {
    const id = gapSlug(obs.kind, index)
    const classification = classifyDriftKind(obs.kind)
    files.push({
      path: `design/gaps/${id}.json`,
      content: `${JSON.stringify(
        {
          $schema:
            'https://raw.githubusercontent.com/byronwade/Design/main/schemas/system-gap.schema.json',
          schemaVersion: 1,
          id,
          classification,
          status: 'proposed',
          summary: obs.summary,
          evidence: {
            source: `design-contracts scan of ${domain}`,
            surface: obs.surface,
            kind: obs.kind,
            observedAt: obs.observedAt,
            ...(obs.evidence ? { details: obs.evidence } : {}),
          },
          proposal: {
            targetArtifact: 'DESIGN.md',
            change:
              obs.suggestedAction ||
              'Review measured evidence and strengthen the contract recipe or mapping.',
            reason: obs.summary,
          },
          createdAt,
        },
        null,
        2
      )}\n`,
    })
  })
  return files
}

function gapsReadmeMd(): string {
  return `Gaps are proposals — classified as \`local-exception\`, \`mapping-defect\`, \`missing-recipe\`, \`missing-skill\`, or \`contract-defect\` (see \`schemas/system-gap.schema.json\`).
They never change \`DESIGN.md\` automatically; a human reviews each gap and accepts or rejects it.
`
}

export function buildDesignContractPackage(
  input: DesignContractPackageInput
): DesignContractPackage {
  const detection = input.appTypeDetection ?? null
  const profile =
    input.profile ??
    (detection?.profile as 'web-app' | 'web-marketing' | undefined) ??
    'web-marketing'
  const appType = input.appType ?? detection?.appType ?? undefined
  const domain = input.domain.replace(/^www\./, '')
  const slug = slugify(domain)
  const generatedAt = new Date().toISOString()
  const packScreenshots = prepareScreenshots(input.screenshots)
  const screenshotFiles = screenshotBinaryFiles(packScreenshots)
  const referencePaths = packScreenshots
    .map((shot) => shot.packPath)
    .filter((path): path is string => Boolean(path))

  const designMd = generateDesignMd({
    ...input,
    referenceScreenshots: packScreenshots.map((shot) => ({
      label: shot.label,
      path: shot.packPath,
      url: shot.url,
    })),
  })
  const measuredComponentKeys = input.measuredComponents
    ? Object.entries(input.measuredComponents)
        .filter(([, recipe]) => Boolean(recipe))
        .map(([key]) => key)
    : []
  const siteSkill = generateDesignSkill({
    domain,
    url: input.url,
    designMdFileName: 'DESIGN.md',
    curatedTokens: input.curatedTokens,
    personality: input.brandAnalysis?.personality,
    philosophy: input.philosophy
      ? {
          title: input.philosophy.title,
          statement: input.philosophy.statement,
          traits: input.philosophy.traits,
          principles: input.philosophy.principles,
          motionTempo: input.philosophy.systems.motion.tempo,
          typeVoice: input.philosophy.systems.type.voice,
          shapeCharacter: input.philosophy.systems.shape.character,
          depth: input.philosophy.systems.shape.depth,
        }
      : null,
    measuredComponents: measuredComponentKeys,
    referenceScreenshots: referencePaths,
  })

  const installCommand = `npx --yes github:byronwade/Design init --profile ${profile}${
    appType ? ` --app-type ${appType}` : ''
  }`

  const driftReceipt = buildContextDsDriftReceipt({
    sourceDomain: domain,
    sourceUrl: input.url,
    generatedAt,
    observations: input.driftObservations ?? [],
  })

  const graph = input.semanticGraph ?? null

  const files: DesignContractFile[] = [
    { path: 'DESIGN.md', content: designMd.markdown },
    { path: 'AGENTS.md', content: agentsMd(domain) },
    { path: 'INSTALL.md', content: installMd(domain, installCommand) },
    { path: '.agents/skills/design/SKILL.md', content: universalDesignSkill() },
    {
      path: `.agents/skills/${siteSkill.skillName}/SKILL.md`,
      content: siteSkill.markdown,
    },
    {
      path: 'design/REFERENCES.md',
      content: referencesMd(domain, packScreenshots),
    },
    {
      path: 'design/references/manifest.json',
      content: referencesManifest(input.url, packScreenshots, appType),
    },
    {
      path: 'design/references/.gitkeep',
      content: '',
    },
    ...screenshotFiles,
    {
      path: 'design/gaps/README.md',
      content: gapsReadmeMd(),
    },
    ...((input.driftObservations?.length
      ? gapsFromDrift(domain, generatedAt, input.driftObservations)
      : [
          {
            path: 'design/gaps/system-gap.example.json',
            content: systemGapExampleJson(domain, generatedAt),
          },
        ]) as DesignContractFile[]),
    { path: '.design/config.json', content: configJson(profile, appType) },
    {
      path: '.design/receipts/contextds-drift.json',
      content: driftReceiptJson(driftReceipt),
    },
  ]

  if (graph) {
    files.push(
      {
        path: 'design/graph.json',
        content: `${JSON.stringify(graph, null, 2)}\n`,
      },
      {
        path: 'design/GRAPH.md',
        content: semanticGraphToMarkdown(graph),
      }
    )
  }

  files.push({
    path: 'contract.json',
    content: `${JSON.stringify(
      {
        schemaVersion: 1,
        kind: 'design-contract-pack',
        slug,
        domain,
        sourceUrl: input.url,
        profile,
        appType: appType ?? null,
        scanId: input.scanId ?? null,
        generatedAt,
        engine: 'https://github.com/byronwade/Design',
        generator: 'design-contracts',
        semanticGraph: graph
          ? {
              schemaVersion: graph.schemaVersion,
              nodeCount: graph.summary.nodeCount,
              edgeCount: graph.summary.edgeCount,
              componentCount: graph.summary.componentCount,
            }
          : null,
        files: [...files.map((file) => file.path), 'contract.json'],
      },
      null,
      2
    )}\n`,
  })

  return {
    slug,
    title: `${domain} Design Contract`,
    domain,
    profile,
    appType: appType ?? null,
    files,
    designMd,
    installCommand,
    summary: {
      colorCount: designMd.summary.colorCount,
      typographyCount: designMd.summary.typographyCount,
      spacingCount: designMd.summary.spacingCount,
      fileCount: files.length,
    },
  }
}

export function zipDesignContractPackage(pack: {
  slug: string
  files: DesignContractFile[]
}): Uint8Array {
  const entries: Record<string, Uint8Array> = {}
  const root = `${pack.slug}-design-contract`
  for (const file of pack.files) {
    const key = `${root}/${file.path}`
    entries[key] =
      file.encoding === 'base64'
        ? new Uint8Array(Buffer.from(file.content, 'base64'))
        : strToU8(file.content)
  }
  return zipSync(entries, { level: 6 })
}

/**
 * Ensure pack files include embedded screenshot bytes.
 * Fetches remote image URLs when stored files lack base64 content.
 */
export async function hydrateScreenshotFiles(
  files: DesignContractFile[],
  screenshots?: Array<{ label: string; url: string; mime?: string }> | null
): Promise<DesignContractFile[]> {
  if (!screenshots?.length) return files

  const next = [...files]

  for (let index = 0; index < screenshots.length; index++) {
    const shot = screenshots[index]!
    if (!looksLikeImageUrl(shot.url)) continue
    const path = screenshotPackPath(index, shot.label, shot.mime)
    const already = next.find(
      (file) => file.path === path && file.encoding === 'base64' && file.content.length >= 32
    )
    if (already) continue

    try {
      const response = await fetch(shot.url, {
        signal: AbortSignal.timeout(20000),
        headers: { Accept: 'image/*' },
      })
      if (!response.ok) continue
      const mime = response.headers.get('content-type') || shot.mime || 'image/png'
      if (!mime.startsWith('image/')) continue
      const buffer = Buffer.from(await response.arrayBuffer())
      if (buffer.byteLength < 200 || buffer.byteLength > 8_000_000) continue
      const content = buffer.toString('base64')
      const file: DesignContractFile = { path, content, encoding: 'base64' }
      const idx = next.findIndex((f) => f.path === path)
      if (idx >= 0) next[idx] = file
      else next.push(file)
    } catch (error) {
      console.warn('[design-contract-package] screenshot hydrate failed:', error)
    }
  }

  // Refresh manifest/REFERENCES to prefer pack-local paths when we hydrated bytes
  const hydrated = prepareScreenshots(
    screenshots.map((shot, index) => {
      const path = screenshotPackPath(index, shot.label, shot.mime)
      const file = next.find((f) => f.path === path && f.encoding === 'base64')
      return {
        label: shot.label,
        url: shot.url,
        mime: shot.mime,
        bytesBase64: file?.content,
        note: 'Captured surface — open the pack-local image when struggling.',
      }
    })
  )

  const domainGuess =
    next.find((f) => f.path === 'contract.json')?.content.match(/"domain"\s*:\s*"([^"]+)"/)?.[1] ||
    'site'
  const sourceUrl =
    next
      .find((f) => f.path === 'contract.json')
      ?.content.match(/"sourceUrl"\s*:\s*"([^"]+)"/)?.[1] ||
    screenshots[0]?.url ||
    ''

  const refsIdx = next.findIndex((f) => f.path === 'design/REFERENCES.md')
  if (refsIdx >= 0) {
    next[refsIdx] = {
      path: 'design/REFERENCES.md',
      content: referencesMd(domainGuess, hydrated),
    }
  }
  const manifestIdx = next.findIndex((f) => f.path === 'design/references/manifest.json')
  if (manifestIdx >= 0) {
    next[manifestIdx] = {
      path: 'design/references/manifest.json',
      content: referencesManifest(sourceUrl, hydrated),
    }
  }

  return next
}
