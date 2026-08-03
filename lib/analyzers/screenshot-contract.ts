/**
 * Vision-derived Design Contract draft from an application screenshot.
 *
 * Public URL scans mostly see marketing surfaces. App UIs (Cursor IDE, dashboards,
 * workbenches) are often behind auth — screenshots are the practical capture path.
 *
 * YAML/token values come from a structured vision draft (not free-form prose).
 * Confidence is intentionally lower than CSS/DOM measurement.
 */

import { generateObject } from 'ai'
import { z } from 'zod'
import { agentModel, isAiGatewayConfigured } from '@/lib/ai/gateway'
import type { EngineAppType, EngineProfile } from '@/lib/analyzers/app-type'
import type { DesignMdInput, MeasuredComponentRecipe } from '@/lib/analyzers/design-md-generator'
import type { DesignPhilosophy } from '@/lib/analyzers/design-philosophy'
import { generatePhilosophy } from '@/lib/analyzers/design-philosophy'

const Hex = z
  .string()
  .regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/, 'hex color')

const VisionDraftSchema = z.object({
  productName: z
    .string()
    .max(80)
    .describe('Short product/app name if visible, else a descriptive label like "IDE workbench"'),
  surfaceKind: z
    .enum(['saas-workbench', 'admin-console', 'content-studio', 'marketing-site', 'desktop-app', 'ide'])
    .describe('What kind of UI this screenshot shows'),
  distinctiveSignature: z
    .string()
    .describe('One precise sentence: materials, type, accent scarcity, density, chrome'),
  polarity: z.enum(['dark-leaning', 'light-leaning', 'balanced']),
  colors: z
    .object({
      bg: Hex.describe('Main canvas / window background'),
      fg: Hex.describe('Primary readable ink'),
      primary: Hex.describe('Accent / primary action color'),
      secondary: Hex.optional().describe('Secondary fill or muted accent'),
      muted: Hex.optional().describe('Muted text or quiet surface'),
      border: Hex.optional().describe('Hairline / divider color'),
      panel: Hex.optional().describe('Sidebar or panel background if distinct from bg'),
      danger: Hex.optional(),
      success: Hex.optional(),
    })
    .describe('Observed colors only — sample from the image, do not invent brand palettes'),
  typography: z.object({
    headlineFont: z.string().describe('Best-guess font family stack for titles/UI chrome'),
    bodyFont: z.string().describe('Best-guess font family stack for body/UI text'),
    baseSizePx: z.number().min(10).max(24),
    headlineSizePx: z.number().min(12).max(72).optional(),
    headlineWeight: z.number().min(100).max(900).optional(),
    bodyWeight: z.number().min(100).max(900).optional(),
    typeVoice: z.string().describe('Short type voice note'),
  }),
  spacingBasePx: z.number().min(2).max(16),
  radius: z.object({
    controlPx: z.number().min(0).max(40),
    surfacePx: z.number().min(0).max(48),
    character: z.string(),
  }),
  depth: z.enum(['flat', 'hairline', 'soft', 'layered']),
  density: z.enum(['sparse', 'balanced', 'dense', 'operational']),
  shell: z.object({
    hasSidebar: z.boolean(),
    sidebarWidthPx: z.number().nullable(),
    hasTopBar: z.boolean(),
    topBarHeightPx: z.number().nullable(),
    chromeNote: z.string(),
  }),
  components: z.object({
    buttonPrimary: z
      .object({
        backgroundColor: Hex,
        textColor: Hex,
        roundedPx: z.number().min(0).max(40),
        paddingYPx: z.number().min(0).max(32).optional(),
        paddingXPx: z.number().min(0).max(48).optional(),
      })
      .optional(),
    buttonSecondary: z
      .object({
        backgroundColor: Hex.optional(),
        textColor: Hex,
        borderColor: Hex.optional(),
        roundedPx: z.number().min(0).max(40),
      })
      .optional(),
    input: z
      .object({
        backgroundColor: Hex.optional(),
        textColor: Hex.optional(),
        borderColor: Hex.optional(),
        roundedPx: z.number().min(0).max(40).optional(),
      })
      .optional(),
    surfaceCard: z
      .object({
        backgroundColor: Hex.optional(),
        textColor: Hex.optional(),
        roundedPx: z.number().min(0).max(48).optional(),
      })
      .optional(),
  }),
  motionGuess: z
    .enum(['instant', 'brisk', 'relaxed', 'unknown'])
    .describe('Inferred from UI genre; screenshots rarely show motion'),
  preferred: z.array(z.string()).min(3).max(6),
  dos: z.array(z.string()).min(3).max(6),
  donts: z.array(z.string()).min(3).max(6),
  overview: z.string().describe('2–3 sentences for DESIGN.md Overview'),
})

export type VisionContractDraft = z.infer<typeof VisionDraftSchema>

export type ExtractScreenshotContractInput = {
  imageBase64: string
  mimeType?: string
  /** Optional product hint, e.g. "Cursor IDE" */
  nameHint?: string | null
  /** Force application bias (default true for this flow) */
  preferApp?: boolean
}

const PROFILE_FOR: Record<EngineAppType, EngineProfile> = {
  'saas-workbench': 'web-app',
  'admin-console': 'web-app',
  'content-studio': 'web-app',
  'marketing-site': 'web-marketing',
}

function mapSurfaceToAppType(
  surface: VisionContractDraft['surfaceKind'],
  preferApp: boolean
): { appType: EngineAppType; profile: EngineProfile; reasons: string[] } {
  if (surface === 'marketing-site' && !preferApp) {
    return {
      appType: 'marketing-site',
      profile: 'web-marketing',
      reasons: ['Vision classified the screenshot as marketing UI'],
    }
  }
  if (surface === 'admin-console') {
    return {
      appType: 'admin-console',
      profile: 'web-app',
      reasons: ['Vision classified dense admin/console chrome'],
    }
  }
  if (surface === 'content-studio') {
    return {
      appType: 'content-studio',
      profile: 'web-app',
      reasons: ['Vision classified a content/editor studio'],
    }
  }
  // ide / desktop-app / saas-workbench / forced app
  return {
    appType: 'saas-workbench',
    profile: 'web-app',
    reasons: [
      preferApp
        ? 'Screenshot → application Design Contract (web-app default)'
        : `Vision surfaceKind=${surface}`,
    ],
  }
}

function recipeFromVision(
  partial:
    | {
        backgroundColor?: string
        textColor?: string
        borderColor?: string
        roundedPx?: number
        paddingYPx?: number
        paddingXPx?: number
      }
    | undefined
): MeasuredComponentRecipe | null {
  if (!partial) return null
  const padding =
    partial.paddingYPx != null || partial.paddingXPx != null
      ? `${Math.round(partial.paddingYPx ?? 8)}px ${Math.round(partial.paddingXPx ?? 14)}px`
      : undefined
  return {
    backgroundColor: partial.backgroundColor,
    textColor: partial.textColor,
    borderColor: partial.borderColor,
    rounded: partial.roundedPx != null ? `${Math.round(partial.roundedPx)}px` : undefined,
    padding,
    sampleCount: 1,
  }
}

/** Run multimodal structured extraction. Throws if Gateway missing. */
export async function extractVisionContractDraft(
  input: ExtractScreenshotContractInput
): Promise<VisionContractDraft> {
  if (!isAiGatewayConfigured()) {
    throw new Error(
      'AI Gateway is required for screenshot → Design Contract. Set AI_GATEWAY_API_KEY or deploy on Vercel.'
    )
  }

  const modelId =
    process.env.DESIGN_VISION_MODEL?.trim() ||
    process.env.DESIGN_COMPOSER_MODEL?.trim() ||
    process.env.DESIGN_AGENT_MODEL?.trim() ||
    'openai/gpt-5.4-mini'

  const preferApp = input.preferApp !== false
  const hint = input.nameHint?.trim()

  const { object } = await generateObject({
    model: agentModel(modelId),
    schema: VisionDraftSchema,
    temperature: 0.2,
    messages: [
      {
        role: 'system',
        content: `You are a principal product designer reconstructing an APPLICATION design system from a single screenshot.

Rules:
- Sample real colors from the pixels. Output valid hex only.
- Prefer application chrome (sidebar, top bar, dense panels, editor, lists) over marketing hero language.
- ${preferApp ? 'Bias toward web-app / workbench classification unless the image is clearly a marketing landing page.' : 'Classify honestly.'}
- Guess fonts from visual character (geometric sans, humanist, mono) — say so as stacks, e.g. "Inter, system-ui, sans-serif".
- Do not invent loud accents the UI does not use. Scarcity matters.
- Density and shell measurements should match what you see.
- No marketing fluff. No emoji.`,
      },
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: hint
              ? `Extract a Design Contract draft from this application screenshot of "${hint}".`
              : 'Extract a Design Contract draft from this application screenshot.',
          },
          {
            type: 'image',
            image: Buffer.from(input.imageBase64, 'base64'),
            mediaType: input.mimeType || 'image/png',
          },
        ],
      },
    ],
  })

  return object
}

export type ScreenshotContractMapped = {
  draft: VisionContractDraft
  appType: EngineAppType
  profile: EngineProfile
  reasons: string[]
  confidence: number
  designMdInput: Omit<DesignMdInput, 'domain' | 'url'> & {
    domain: string
    url: string
  }
  philosophy: DesignPhilosophy
}

/** Map a vision draft into DESIGN.md / pack inputs. */
export function mapVisionDraftToContractInput(args: {
  draft: VisionContractDraft
  domain: string
  url: string
  preferApp?: boolean
}): ScreenshotContractMapped {
  const preferApp = args.preferApp !== false
  const { appType, profile, reasons } = mapSurfaceToAppType(args.draft.surfaceKind, preferApp)
  const draft = args.draft
  const colors = draft.colors

  const curatedTokens: DesignMdInput['curatedTokens'] = {
    colors: [
      { name: 'bg', value: colors.bg, usage: 40, semantic: 'bg' },
      { name: 'fg', value: colors.fg, usage: 36, semantic: 'fg' },
      { name: 'primary', value: colors.primary, usage: 20, semantic: 'primary' },
      ...(colors.secondary
        ? [{ name: 'secondary', value: colors.secondary, usage: 12, semantic: 'secondary' }]
        : []),
      ...(colors.muted ? [{ name: 'muted', value: colors.muted, usage: 14, semantic: 'muted' }] : []),
      ...(colors.border
        ? [{ name: 'border', value: colors.border, usage: 10, semantic: 'border' }]
        : []),
      ...(colors.panel ? [{ name: 'panel', value: colors.panel, usage: 18, semantic: 'neutral' }] : []),
      ...(colors.danger ? [{ name: 'danger', value: colors.danger, usage: 4 }] : []),
      ...(colors.success ? [{ name: 'success', value: colors.success, usage: 4 }] : []),
    ],
    typography: {
      families: [
        { name: 'display', value: draft.typography.headlineFont, usage: 20 },
        { name: 'body', value: draft.typography.bodyFont, usage: 40 },
      ],
      sizes: [
        {
          name: 'h1',
          value: `${Math.round(draft.typography.headlineSizePx ?? draft.typography.baseSizePx * 1.75)}px`,
          usage: 4,
        },
        { name: 'body', value: `${Math.round(draft.typography.baseSizePx)}px`, usage: 40 },
        {
          name: 'label',
          value: `${Math.max(11, Math.round(draft.typography.baseSizePx - 2))}px`,
          usage: 12,
        },
      ],
      weights: [
        {
          name: 'headline',
          value: String(draft.typography.headlineWeight ?? 600),
          usage: 10,
        },
        {
          name: 'body',
          value: String(draft.typography.bodyWeight ?? 400),
          usage: 40,
        },
      ],
    },
    spacing: [2, 1, 2, 3, 4, 6, 8]
      .map((n) => Math.round(draft.spacingBasePx * n))
      .filter((v, i, arr) => arr.indexOf(v) === i)
      .map((px) => ({ value: `${px}px`, usage: 20 })),
    radius: [
      { value: `${Math.round(Math.max(0, draft.radius.controlPx - 2))}px`, usage: 8 },
      { value: `${Math.round(draft.radius.controlPx)}px`, usage: 20 },
      { value: `${Math.round(draft.radius.surfacePx)}px`, usage: 12 },
    ],
    shadows:
      draft.depth === 'flat'
        ? []
        : draft.depth === 'hairline'
          ? [{ value: `0 0 0 1px ${colors.border || colors.muted || '#00000022'}`, usage: 8 }]
          : [{ value: '0 1px 2px rgba(0,0,0,0.12)', usage: 6 }],
    motion:
      draft.motionGuess === 'instant'
        ? [
            { value: '80ms', usage: 4 },
            { value: 'ease-out', usage: 4 },
          ]
        : draft.motionGuess === 'relaxed'
          ? [
              { value: '240ms', usage: 4 },
              { value: 'ease-in-out', usage: 4 },
            ]
          : [
              { value: '160ms', usage: 4 },
              { value: 'ease-out', usage: 4 },
            ],
  }

  const densityScore =
    draft.density === 'operational' || draft.density === 'dense'
      ? 380
      : draft.density === 'sparse'
        ? 140
        : 240

  const uxEvidence = {
    shell: {
      header: draft.shell.hasTopBar
        ? {
            height: Math.round(draft.shell.topBarHeightPx ?? 48),
            sticky: true,
          }
        : null,
      sidebar: draft.shell.hasSidebar
        ? {
            width: Math.round(draft.shell.sidebarWidthPx ?? 240),
            fixed: true,
          }
        : null,
      footer: null,
    },
    density: {
      elementsInViewport: densityScore,
      imageAreaRatio: 0.05,
      textChars: densityScore * 4,
    },
    interaction: null,
    keyframeCount: 0,
    pagesAudited: 0,
  }

  const philosophy = generatePhilosophy({
    domain: args.domain,
    curated: curatedTokens,
    personality: draft.distinctiveSignature,
    primaryFont: draft.typography.headlineFont,
    ux: uxEvidence,
  })

  const measuredComponents: Record<string, MeasuredComponentRecipe | null> = {
    'button-primary': recipeFromVision(draft.components.buttonPrimary),
    'button-secondary': recipeFromVision(draft.components.buttonSecondary),
    input: recipeFromVision(draft.components.input),
    'surface-card': recipeFromVision(draft.components.surfaceCard),
  }

  const confidence =
    preferApp && draft.surfaceKind !== 'marketing-site'
      ? 72
      : draft.surfaceKind === 'marketing-site'
        ? 58
        : 68

  const designMdInput: ScreenshotContractMapped['designMdInput'] = {
    domain: args.domain,
    url: args.url,
    curatedTokens,
    brandAnalysis: {
      primaryColors: [colors.primary, colors.secondary, colors.bg].filter(
        (value): value is string => Boolean(value)
      ),
      personality: draft.distinctiveSignature,
    },
    confidence,
    philosophy,
    uxEvidence,
    measuredComponents,
    layoutDNA: {
      containers: {
        maxWidth: null,
        strategy: draft.shell.hasSidebar ? 'app-shell' : 'fluid',
      },
      breakpoints: [768, 1024, 1280],
      gridSystem: draft.shell.hasSidebar ? 'sidebar-app' : 'stack',
      spacingBase: draft.spacingBasePx,
      archetypes: [
        {
          type:
            appType === 'admin-console'
              ? 'dashboard'
              : appType === 'content-studio'
                ? 'editor'
                : 'workbench',
          confidence: 0.75,
        },
      ],
    },
    aiProse: {
      distinctiveSignature: draft.distinctiveSignature,
      overview: draft.overview,
      preferred: draft.preferred,
      dos: draft.dos,
      donts: draft.donts,
      motionGuidance:
        draft.motionGuess === 'unknown'
          ? 'Motion was not visible in the screenshot — keep transitions under 200ms and prefer opacity/color feedback.'
          : `Inferred motion tempo: ${draft.motionGuess}. Prefer short feedback transitions; honor reduced motion.`,
      typeVoice: draft.typography.typeVoice,
    },
  }

  return {
    draft,
    appType,
    profile: PROFILE_FOR[appType],
    reasons,
    confidence,
    designMdInput,
    philosophy,
  }
}

export function syntheticUploadDomain(nameHint?: string | null): string {
  const base = (nameHint || 'app-ui')
    .toLowerCase()
    .replace(/^www\./, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 36) || 'app-ui'
  const id = Math.random().toString(36).slice(2, 8)
  return `${base}-${id}.upload`
}
