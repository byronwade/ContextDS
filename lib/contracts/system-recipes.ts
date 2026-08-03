/**
 * Industry recipe presets — seed a full StudioSystem + engine profile/app-type
 * without a live scan. Deterministic; safe for offline Create / MCP / tests.
 */

import type { EngineAppType, EngineProfile } from '@/lib/analyzers/app-type'
import {
  type StudioPackOptions,
  type StudioSystem,
  slugify,
} from '@/lib/contracts/authored-contract'

export type SystemRecipeId =
  | 'saas-workbench'
  | 'admin-console'
  | 'content-studio'
  | 'marketing-site'
  | 'editorial-magazine'
  | 'commerce-storefront'

export type SystemRecipe = {
  id: SystemRecipeId
  label: string
  blurb: string
  profile: EngineProfile
  appType: EngineAppType
  system: StudioSystem
}

function recipe(
  id: SystemRecipeId,
  label: string,
  blurb: string,
  profile: EngineProfile,
  appType: EngineAppType,
  partial: Omit<StudioSystem, 'slug'> & { slug?: string }
): SystemRecipe {
  const name = partial.name
  return {
    id,
    label,
    blurb,
    profile,
    appType,
    system: {
      ...partial,
      slug: partial.slug || slugify(name),
    },
  }
}

export const SYSTEM_RECIPES: SystemRecipe[] = [
  recipe(
    'saas-workbench',
    'SaaS workbench',
    'Dense product chrome — sidebar, teal accent, 4px grid, sharp controls.',
    'web-app',
    'saas-workbench',
    {
      name: 'SaaS Workbench',
      philosophyNote:
        'Operational product UI: calm dark surfaces, high-signal accent, dense but readable type.',
      colors: [
        { id: 'background', role: 'background', value: '#0e0f12' },
        { id: 'foreground', role: 'foreground', value: '#f4f4f5' },
        { id: 'muted', role: 'muted', value: '#8b8f98' },
        { id: 'primary', role: 'primary', value: '#2dd4bf' },
        { id: 'border', role: 'border', value: '#26282e' },
      ],
      fontDisplay: 'IBM Plex Sans',
      fontBody: 'IBM Plex Sans',
      fontMono: 'IBM Plex Mono',
      baseSize: 14,
      scaleRatio: 1.2,
      scaleSteps: 6,
      spacingBase: 4,
      spacingSteps: 10,
      radius: 6,
      depth: 'flat',
    }
  ),
  recipe(
    'admin-console',
    'Admin console',
    'Data-heavy console — tabular density, indigo accent, soft elevation.',
    'web-app',
    'admin-console',
    {
      name: 'Admin Console',
      philosophyNote:
        'Admin tooling with clear hierarchy, tabular rhythm, and restrained accent color.',
      colors: [
        { id: 'background', role: 'background', value: '#f8fafc' },
        { id: 'foreground', role: 'foreground', value: '#0f172a' },
        { id: 'muted', role: 'muted', value: '#64748b' },
        { id: 'primary', role: 'primary', value: '#4f46e5' },
        { id: 'border', role: 'border', value: '#e2e8f0' },
      ],
      fontDisplay: 'Inter',
      fontBody: 'Inter',
      fontMono: 'JetBrains Mono',
      baseSize: 14,
      scaleRatio: 1.2,
      scaleSteps: 5,
      spacingBase: 4,
      spacingSteps: 10,
      radius: 8,
      depth: 'soft',
    }
  ),
  recipe(
    'content-studio',
    'Content studio',
    'Writing / CMS surface — readable body, generous measure, calm neutrals.',
    'web-app',
    'content-studio',
    {
      name: 'Content Studio',
      philosophyNote:
        'Editor-first surfaces: long-form readability, quiet chrome, soft paper depth.',
      colors: [
        { id: 'background', role: 'background', value: '#faf9f7' },
        { id: 'foreground', role: 'foreground', value: '#1c1917' },
        { id: 'muted', role: 'muted', value: '#78716c' },
        { id: 'primary', role: 'primary', value: '#0d9488' },
        { id: 'border', role: 'border', value: '#e7e5e4' },
      ],
      fontDisplay: 'Source Serif 4',
      fontBody: 'Source Sans 3',
      fontMono: 'Source Code Pro',
      baseSize: 16,
      scaleRatio: 1.25,
      scaleSteps: 6,
      spacingBase: 8,
      spacingSteps: 8,
      radius: 10,
      depth: 'soft',
    }
  ),
  recipe(
    'marketing-site',
    'Marketing site',
    'Launch landing — bold display, large type steps, layered hero depth.',
    'web-marketing',
    'marketing-site',
    {
      name: 'Marketing Site',
      philosophyNote:
        'Campaign-ready marketing system with confident type scale and layered surfaces.',
      colors: [
        { id: 'background', role: 'background', value: '#09090b' },
        { id: 'foreground', role: 'foreground', value: '#fafafa' },
        { id: 'muted', role: 'muted', value: '#a1a1aa' },
        { id: 'primary', role: 'primary', value: '#f97316' },
        { id: 'border', role: 'border', value: '#27272a' },
      ],
      fontDisplay: 'Geist',
      fontBody: 'Geist',
      fontMono: 'Geist Mono',
      baseSize: 16,
      scaleRatio: 1.333,
      scaleSteps: 7,
      spacingBase: 8,
      spacingSteps: 8,
      radius: 14,
      depth: 'layered',
    }
  ),
  recipe(
    'editorial-magazine',
    'Editorial magazine',
    'Serif-led publication — cream paper, terracotta accent, classic scale.',
    'web-marketing',
    'marketing-site',
    {
      name: 'Editorial Magazine',
      philosophyNote:
        'Publication grammar: serif display, cream paper, measured accent, quiet rules.',
      colors: [
        { id: 'background', role: 'background', value: '#f7f4ef' },
        { id: 'foreground', role: 'foreground', value: '#1c1917' },
        { id: 'muted', role: 'muted', value: '#78716c' },
        { id: 'primary', role: 'primary', value: '#c2410c' },
        { id: 'border', role: 'border', value: '#e7e5e4' },
      ],
      fontDisplay: 'Libre Baskerville',
      fontBody: 'Source Serif 4',
      fontMono: 'IBM Plex Mono',
      baseSize: 17,
      scaleRatio: 1.333,
      scaleSteps: 6,
      spacingBase: 8,
      spacingSteps: 8,
      radius: 2,
      depth: 'flat',
    }
  ),
  recipe(
    'commerce-storefront',
    'Commerce storefront',
    'Product retail — clean whites, rose accent, soft cards, shopper clarity.',
    'web-marketing',
    'marketing-site',
    {
      name: 'Commerce Storefront',
      philosophyNote:
        'Retail clarity: generous product imagery space, soft cards, confident CTA accent.',
      colors: [
        { id: 'background', role: 'background', value: '#ffffff' },
        { id: 'foreground', role: 'foreground', value: '#18181b' },
        { id: 'muted', role: 'muted', value: '#71717a' },
        { id: 'primary', role: 'primary', value: '#e11d48' },
        { id: 'border', role: 'border', value: '#e4e4e7' },
      ],
      fontDisplay: 'DM Sans',
      fontBody: 'DM Sans',
      fontMono: 'Geist Mono',
      baseSize: 16,
      scaleRatio: 1.25,
      scaleSteps: 6,
      spacingBase: 8,
      spacingSteps: 8,
      radius: 12,
      depth: 'soft',
    }
  ),
]

export function listSystemRecipes(): Array<
  Pick<SystemRecipe, 'id' | 'label' | 'blurb' | 'profile' | 'appType'>
> {
  return SYSTEM_RECIPES.map(({ id, label, blurb, profile, appType }) => ({
    id,
    label,
    blurb,
    profile,
    appType,
  }))
}

export function getSystemRecipe(id: string): SystemRecipe | null {
  return SYSTEM_RECIPES.find((entry) => entry.id === id) ?? null
}

/** Clone a recipe into a named StudioSystem + pack options. */
export function recipeToStudioSystem(
  id: string,
  name?: string
): { system: StudioSystem; packOptions: StudioPackOptions; recipe: SystemRecipe } {
  const found = getSystemRecipe(id)
  if (!found) {
    throw new Error(`Unknown recipe "${id}"`)
  }
  const systemName = name?.trim() || found.system.name
  const system: StudioSystem = {
    ...found.system,
    name: systemName,
    slug: slugify(systemName),
    colors: found.system.colors.map((color) => ({ ...color })),
  }
  return {
    system,
    recipe: found,
    packOptions: {
      profile: found.profile,
      appType: found.appType,
      confidence: 95,
      driftKind: 'recipe-preset',
      driftSummary: `Design Contract seeded from industry recipe "${found.label}".`,
      driftEvidence: { recipeId: found.id },
    },
  }
}
