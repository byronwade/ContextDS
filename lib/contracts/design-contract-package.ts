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

import { strToU8, zipSync } from 'fflate'
import {
  type DesignMdArtifact,
  type DesignMdInput,
  generateDesignMd,
} from '@/lib/analyzers/design-md-generator'
import { generateDesignSkill } from '@/lib/analyzers/design-skill-generator'
import { type SemanticGraph, semanticGraphToMarkdown } from '@/lib/analyzers/semantic-graph'
import { type AppTypeDetection } from '@/lib/analyzers/app-type'
import {
  buildContextDsDriftReceipt,
  driftReceiptJson,
  type DriftObservation,
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
  }>
  semanticGraph?: SemanticGraph | null
}

export type DesignContractFile = {
  path: string
  content: string
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
5. Inspect production components, routes, tests, and applicable files under \`design/references/\`.
6. Read \`design/graph.json\` (and \`design/GRAPH.md\`) to understand how tokens, roles, components, and layout link together before inventing mappings.
7. Build with semantic tokens and mapped components from \`DESIGN.md\`. Missing capability is a design-system gap — do not invent page-local styles.
8. Run \`npx --yes github:byronwade/Design check\`.
9. Run \`npx --yes github:byronwade/Design verify --mode release\` with evidence for affected surfaces.
10. Report the receipt path, revision, warnings, and remaining uncertainty.

## Boundaries

- \`DESIGN.md\` is the authored source of truth for visual identity and product grammar.
- \`design/graph.json\` is the linked system model (token↔role↔component↔layout). Prefer edges over guesses.
- Do not edit \`.design/generated/\` or \`.design/receipts/\` by hand.
- Visual references under \`design/references/\` are optional project-owned media.
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
   applicable approved files under \`design/references/\`.
5. Build with semantic tokens and mapped production components. A missing
   capability is a design-system gap, not permission for page-local styling.
6. Run \`npx --yes github:byronwade/Design check\`.
7. Run \`npx --yes github:byronwade/Design verify --mode release\` with the
   affected surfaces and evidence files.
8. Report the receipt path, source revision, warnings, exceptions, and remaining
   uncertainty.

## Boundaries

- \`DESIGN.md\` is the authored source of truth.
- Generated context, receipts, adapters, schemas, caches, and fingerprints are not
  authored design truth.
- Component libraries are optional adapters.
- Visual references are project-owned and optional.
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
4. Optionally copy \`design/references/\`.

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

function referencesMd(
  domain: string,
  screenshots: DesignContractPackageInput['screenshots']
): string {
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
    'Register why each reference matters, where it applies, what to preserve, and what not to copy.',
    'External scan observations seed drift evidence; they never replace `DESIGN.md` automatically.',
    '',
    '## Selection policy',
    '',
    'The resolver selects 3-8 approved references by request, platform, component, state, confidence, and relevance.',
    'References registered in `manifest.json` are scan-derived public-web observations: preserve hierarchy, spacing rhythm, accent scarcity, and typography roles — do not copy pixel-perfect chrome, copyrighted illustrations, or product copy.',
    '',
  ]

  if (screenshots?.length) {
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
      'Add screenshots, golden states, or Mobbin-style pattern notes under `design/references/` and register them in `manifest.json`.',
      'A project can start with zero references; missing references do not block adoption.',
      ''
    )
  }

  return lines.join('\n')
}

function referencesManifest(
  url: string,
  screenshots: DesignContractPackageInput['screenshots'],
  appType?: string
): string {
  const references = (screenshots ?? []).map((shot, index) => ({
    id: `scan-surface-${index + 1}`,
    kind: 'screenshot',
    title: shot.label,
    ...(shot.note ? { summary: shot.note } : {}),
    source: { url: shot.url || url },
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
    confidence: 0.7,
    relevance: 0.8,
    tags: ['scan', 'designcontracts'],
  }))

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
    input.profile ?? (detection?.profile as 'web-app' | 'web-marketing' | undefined) ?? 'web-marketing'
  const appType = input.appType ?? detection?.appType ?? undefined
  const domain = input.domain.replace(/^www\./, '')
  const slug = slugify(domain)
  const generatedAt = new Date().toISOString()
  const designMd = generateDesignMd(input)
  const siteSkill = generateDesignSkill({
    domain,
    url: input.url,
    designMdFileName: 'DESIGN.md',
    curatedTokens: input.curatedTokens,
    personality: input.brandAnalysis?.personality,
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
      content: referencesMd(domain, input.screenshots),
    },
    {
      path: 'design/references/manifest.json',
      content: referencesManifest(input.url, input.screenshots, appType),
    },
    {
      path: 'design/references/.gitkeep',
      content: '',
    },
    {
      path: 'design/gaps/system-gap.example.json',
      content: systemGapExampleJson(domain, generatedAt),
    },
    {
      path: 'design/gaps/README.md',
      content: gapsReadmeMd(),
    },
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

export function zipDesignContractPackage(pack: DesignContractPackage): Uint8Array {
  const entries: Record<string, Uint8Array> = {}
  const root = `${pack.slug}-design-contract`
  for (const file of pack.files) {
    entries[`${root}/${file.path}`] = strToU8(file.content)
  }
  return zipSync(entries, { level: 6 })
}
