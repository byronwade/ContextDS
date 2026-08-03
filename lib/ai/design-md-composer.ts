/**
 * Design-director AI composition for DESIGN.md prose.
 *
 * Keeps YAML / token values deterministic from the analyzer. Only rewrites
 * human/agent guidance sections so packs sound site-specific and elite —
 * never invents hex, font sizes, or radii.
 */

import { generateObject } from 'ai'
import { z } from 'zod'
import { agentModel, isAiGatewayConfigured } from '@/lib/ai/gateway'
import type { DesignPhilosophy } from '@/lib/analyzers/design-philosophy'

const ProseSchema = z.object({
  distinctiveSignature: z
    .string()
    .describe(
      'One precise sentence naming what makes this product’s UI unmistakable — materials, type pairing, accent scarcity, density. No generic marketing.'
    ),
  overview: z
    .string()
    .describe(
      '2–3 sentences: what the reconstructed system is, how it feels, and how agents should uphold it. Ground in measured evidence only.'
    ),
  preferred: z
    .array(z.string())
    .min(3)
    .max(6)
    .describe('Site-specific preferred guidance bullets (no leading dashes).'),
  dos: z
    .array(z.string())
    .min(3)
    .max(6)
    .describe('Concrete Do rules tied to this site’s tokens and voice.'),
  donts: z
    .array(z.string())
    .min(3)
    .max(6)
    .describe('Concrete Don’t rules — forbid the generics this site deliberately avoids.'),
  motionGuidance: z
    .string()
    .describe(
      '1–2 sentences on tempo, easing character, and when motion is allowed vs forbidden.'
    ),
  typeVoice: z
    .string()
    .describe(
      '1–2 sentences on headline vs body pairing, weight discipline, and scale character.'
    ),
})

export type DesignMdProse = z.infer<typeof ProseSchema>

export type ComposeDesignMdProseInput = {
  domain: string
  url: string
  philosophy: DesignPhilosophy
  archetype: string
  confidence: number
  colorKeys: string[]
  headlineFont: string
  bodyFont: string
  spacingBase: number
  motionTempo: string | null
  shellSummary: string | null
  densitySummary?: string | null
  interactionSummary?: string | null
  measuredComponentsSummary?: string | null
  keyframeSummary?: string | null
  /** Optional homepage screenshot (base64, no data: prefix) for visual grounding */
  screenshotBase64?: string | null
  screenshotMime?: string | null
}

/**
 * Ask a design-director model to author site-specific prose from measured
 * philosophy. Returns null when Gateway is unavailable or the call fails —
 * callers keep deterministic philosophy prose.
 */
export async function composeDesignMdProse(
  input: ComposeDesignMdProseInput
): Promise<DesignMdProse | null> {
  if (!isAiGatewayConfigured()) return null
  if (process.env.DESIGN_MD_AI === '0' || process.env.DESIGN_MD_AI === 'false') {
    return null
  }

  const modelId =
    process.env.DESIGN_COMPOSER_MODEL?.trim() ||
    process.env.DESIGN_AGENT_MODEL?.trim() ||
    'openai/gpt-5.4-mini'

  const evidenceBlock = `Author DESIGN.md guidance for ${input.domain} (${input.url}).

Archetype: ${input.archetype}
Extraction confidence: ${Math.round(input.confidence)}%
Headline font: ${input.headlineFont}
Body font: ${input.bodyFont}
Spacing base: ${input.spacingBase}px
Motion tempo: ${input.motionTempo ?? 'unknown'}
Shell: ${input.shellSummary ?? 'unknown'}
Density: ${input.densitySummary ?? 'unknown'}
Interaction feedback: ${input.interactionSummary ?? 'unknown'}
Measured components: ${input.measuredComponentsSummary ?? 'none'}
Named keyframes: ${input.keyframeSummary ?? 'none'}
Color roles present: ${input.colorKeys.join(', ')}

Philosophy title: ${input.philosophy.title}
Philosophy statement: ${input.philosophy.statement}
Traits: ${input.philosophy.traits.join(', ')}
Principles:
${input.philosophy.principles.map((p) => `- ${p.title}: ${p.body}`).join('\n')}

Color science: polarity=${input.philosophy.systems.color.polarity}, temperature=${input.philosophy.systems.color.temperature}, accent=${input.philosophy.systems.color.accent?.hex ?? 'none'}
Type voice: ${input.philosophy.systems.type.voice}, scale=${input.philosophy.systems.type.scaleLabel ?? 'optical'}
Shape: ${input.philosophy.systems.shape.character}, depth=${input.philosophy.systems.shape.depth}
Motion: tempo=${input.philosophy.systems.motion.tempo ?? 'n/a'}, durations=${input.philosophy.systems.motion.durationsMs.slice(0, 6).join(', ') || 'n/a'}ms`

  const system = `You are a principal design systems director writing DESIGN.md guidance for AI coding agents.

Rules:
- Ground every claim in the measured philosophy / evidence / screenshot provided. Never invent colors, fonts, sizes, or radii.
- Sound specific to THIS product — reject generic SaaS boilerplate ("clean modern minimal").
- Prefer scarce accent, clear type pairing, measurable density, and honest motion language.
- Write for agents that will resolve → check → verify against this contract.
- Prefer short, imperative bullets. No emoji. No marketing fluff.
- If a screenshot is provided, use it only to sharpen material, density, and hierarchy language — never to invent new tokens.`

  try {
    const hasImage = Boolean(input.screenshotBase64 && input.screenshotBase64.length > 200)
    const { object } = await generateObject({
      model: agentModel(modelId),
      schema: ProseSchema,
      temperature: 0.35,
      ...(hasImage
        ? {
            messages: [
              { role: 'system' as const, content: system },
              {
                role: 'user' as const,
                content: [
                  { type: 'text' as const, text: evidenceBlock },
                  {
                    type: 'image' as const,
                    image: Buffer.from(input.screenshotBase64!, 'base64'),
                    mediaType: input.screenshotMime || 'image/png',
                  },
                ],
              },
            ],
          }
        : {
            system,
            prompt: evidenceBlock,
          }),
    })
    return object
  } catch (error) {
    console.warn(
      '[design-md-composer] AI prose failed; using deterministic philosophy',
      error instanceof Error ? error.message : error
    )
    return null
  }
}
