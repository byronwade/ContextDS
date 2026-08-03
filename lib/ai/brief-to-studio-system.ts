/**
 * Natural-language brief → StudioSystem (structured generation).
 *
 * Uses AI Gateway when configured; otherwise a deterministic heuristic
 * parser so Create / tests still work offline.
 */

import { generateObject } from 'ai'
import { z } from 'zod'
import { agentModel, isAiGatewayConfigured } from '@/lib/ai/gateway'
import {
  DEFAULT_STUDIO_SYSTEM,
  slugify,
  type StudioSystem,
} from '@/lib/contracts/authored-contract'

const StudioSchema = z.object({
  name: z.string().min(1).max(80),
  philosophyNote: z.string().max(600),
  colors: z
    .array(
      z.object({
        role: z.string().min(1).max(40),
        value: z.string().regex(/^#([0-9A-Fa-f]{6})$/),
      })
    )
    .min(3)
    .max(12),
  fontDisplay: z.string().min(1).max(60),
  fontBody: z.string().min(1).max(60),
  fontMono: z.string().min(1).max(60),
  baseSize: z.number().min(12).max(20),
  scaleRatio: z.number().min(1.1).max(1.618),
  spacingBase: z.union([z.literal(4), z.literal(8)]),
  radius: z.number().min(0).max(32),
  depth: z.enum(['flat', 'soft', 'layered']),
})

function heuristicFromBrief(brief: string, name?: string): StudioSystem {
  const lower = brief.toLowerCase()
  const dark = /dark|noir|midnight|obsidian|black/.test(lower)
  const warm = /warm|cream|editorial|paper|terracotta|serif/.test(lower)
  const sharp = /sharp|brutal|dense|ops|terminal|mono/.test(lower)
  const soft = /soft|friendly|rounded|playful|consumer/.test(lower)

  const system: StudioSystem = {
    ...DEFAULT_STUDIO_SYSTEM,
    name: name?.trim() || 'Brief system',
    slug: slugify(name?.trim() || 'brief-system'),
    philosophyNote: brief.trim().slice(0, 600),
    depth: sharp ? 'flat' : soft ? 'soft' : 'layered',
    radius: sharp ? 4 : soft ? 16 : 10,
    spacingBase: sharp ? 4 : 8,
    scaleRatio: warm ? 1.333 : sharp ? 1.2 : 1.25,
    fontDisplay: warm ? 'Georgia' : sharp ? 'IBM Plex Sans' : 'Geist',
    fontBody: warm ? 'Georgia' : sharp ? 'IBM Plex Sans' : 'Geist',
    fontMono: 'Geist Mono',
  }

  if (dark) {
    system.colors = [
      { id: 'background', role: 'background', value: '#0e0f12' },
      { id: 'foreground', role: 'foreground', value: '#f4f4f5' },
      { id: 'muted', role: 'muted', value: '#8b8f98' },
      {
        id: 'primary',
        role: 'primary',
        value: warm ? '#e8a87c' : sharp ? '#5eead4' : '#7c9cff',
      },
      { id: 'border', role: 'border', value: '#26282e' },
    ]
  } else if (warm) {
    system.colors = [
      { id: 'background', role: 'background', value: '#f7f4ef' },
      { id: 'foreground', role: 'foreground', value: '#1c1917' },
      { id: 'muted', role: 'muted', value: '#78716c' },
      { id: 'primary', role: 'primary', value: '#c2410c' },
      { id: 'border', role: 'border', value: '#e7e5e4' },
    ]
  } else {
    system.colors = [
      { id: 'background', role: 'background', value: '#fafafa' },
      { id: 'foreground', role: 'foreground', value: '#171717' },
      { id: 'muted', role: 'muted', value: '#737373' },
      { id: 'primary', role: 'primary', value: sharp ? '#0f766e' : '#2563eb' },
      { id: 'border', role: 'border', value: '#e5e5e5' },
    ]
  }

  return system
}

export async function briefToStudioSystem(input: {
  brief: string
  name?: string
}): Promise<{ system: StudioSystem; source: 'ai' | 'heuristic' }> {
  const brief = input.brief.trim()
  if (brief.length < 12) {
    throw new Error('Brief must be at least 12 characters')
  }

  if (!isAiGatewayConfigured()) {
    return { system: heuristicFromBrief(brief, input.name), source: 'heuristic' }
  }

  try {
    const { object } = await generateObject({
      model: agentModel(),
      schema: StudioSchema,
      temperature: 0.4,
      system: `You author installable design systems for AI coding agents.
Return concrete hex colors (#RRGGBB), real font family names, and measurable spacing/radius.
Prefer distinctive product identity over generic purple SaaS. Keep 5–8 color roles including background, foreground, muted, primary, border.`,
      prompt: `Design brief:\n${brief}\n\nPreferred name: ${input.name || '(derive from brief)'}`,
    })

    const system: StudioSystem = {
      ...DEFAULT_STUDIO_SYSTEM,
      name: object.name,
      slug: slugify(object.name),
      philosophyNote: object.philosophyNote || brief.slice(0, 600),
      colors: object.colors.map((color) => ({
        id: color.role,
        role: color.role,
        value: color.value,
      })),
      fontDisplay: object.fontDisplay,
      fontBody: object.fontBody,
      fontMono: object.fontMono,
      baseSize: object.baseSize,
      scaleRatio: object.scaleRatio,
      scaleSteps: 6,
      spacingBase: object.spacingBase,
      spacingSteps: 8,
      radius: Math.round(object.radius),
      depth: object.depth,
    }
    return { system, source: 'ai' }
  } catch (error) {
    console.warn('[brief-to-studio] AI failed, using heuristic:', error)
    return { system: heuristicFromBrief(brief, input.name), source: 'heuristic' }
  }
}
