import type { TokenSet } from "@/lib/db/schema"

type AnalyzerToken = {
  name: string
  value: string
  type: "color" | "typography" | "spacing" | "radius" | "shadow" | "motion"
  confidence: number
  usage: number
  category?: string
}

type AnalyzerTokenSet = {
  id: string
  version: string
  consensusScore: number
  tokens: {
    colors: AnalyzerToken[]
    typography: AnalyzerToken[]
    spacing: AnalyzerToken[]
    radius: AnalyzerToken[]
    shadows: AnalyzerToken[]
    motion: AnalyzerToken[]
  }
  metadata: {
    extractedAt: string
    cssSourceCount: number
    totalAnalyzed: number
  }
}

function emptyTokens() {
  return {
    colors: [] as AnalyzerToken[],
    typography: [] as AnalyzerToken[],
    spacing: [] as AnalyzerToken[],
    radius: [] as AnalyzerToken[],
    shadows: [] as AnalyzerToken[],
    motion: [] as AnalyzerToken[],
  }
}

function mapCategory(category: string): AnalyzerToken["type"] {
  if (category === "color") return "color"
  if (category === "typography" || category === "font") return "typography"
  if (category === "dimension" || category === "spacing") return "spacing"
  if (category === "radius" || category === "borderRadius") return "radius"
  if (category === "shadow") return "shadow"
  if (category === "motion" || category === "duration") return "motion"
  return "spacing"
}

function pushToken(
  tokens: ReturnType<typeof emptyTokens>,
  category: string,
  name: string,
  value: string,
  confidence = 0.8
) {
  const type = mapCategory(category)
  const token: AnalyzerToken = {
    name,
    value,
    type,
    confidence,
    usage: 1,
    category,
  }

  switch (type) {
    case "color":
      tokens.colors.push(token)
      break
    case "typography":
      tokens.typography.push(token)
      break
    case "spacing":
      tokens.spacing.push(token)
      break
    case "radius":
      tokens.radius.push(token)
      break
    case "shadow":
      tokens.shadows.push(token)
      break
    case "motion":
      tokens.motion.push(token)
      break
  }
}

function fromCurated(curated: Record<string, unknown>): ReturnType<typeof emptyTokens> {
  const tokens = emptyTokens()

  const colors = curated.colors
  if (Array.isArray(colors)) {
    colors.forEach((item, index) => {
      if (item && typeof item === "object" && "value" in item) {
        pushToken(
          tokens,
          "color",
          String((item as { name?: string }).name ?? `color-${index + 1}`),
          String((item as { value: string }).value)
        )
      }
    })
  }

  const typography = curated.typography as Record<string, unknown> | undefined
  if (typography) {
    const families = typography.families
    if (Array.isArray(families)) {
      families.forEach((item, index) => {
        if (typeof item === "string") {
          pushToken(tokens, "typography", `font-${index + 1}`, item)
        } else if (item && typeof item === "object" && "value" in item) {
          pushToken(
            tokens,
            "typography",
            String((item as { name?: string }).name ?? `font-${index + 1}`),
            String((item as { value: string }).value)
          )
        }
      })
    }
    const sizes = typography.sizes
    if (Array.isArray(sizes)) {
      sizes.forEach((item, index) => {
        if (item && typeof item === "object" && "value" in item) {
          pushToken(
            tokens,
            "typography",
            String((item as { name?: string }).name ?? `size-${index + 1}`),
            String((item as { value: string }).value)
          )
        }
      })
    }
  }

  const spacing = curated.spacing
  if (Array.isArray(spacing)) {
    spacing.forEach((item, index) => {
      if (item && typeof item === "object" && "value" in item) {
        pushToken(
          tokens,
          "spacing",
          String((item as { name?: string }).name ?? `space-${index + 1}`),
          String((item as { value: string }).value)
        )
      }
    })
  }

  const radius = curated.radius
  if (Array.isArray(radius)) {
    radius.forEach((item, index) => {
      if (item && typeof item === "object" && "value" in item) {
        pushToken(
          tokens,
          "radius",
          String((item as { name?: string }).name ?? `radius-${index + 1}`),
          String((item as { value: string }).value)
        )
      }
    })
  }

  const shadows = curated.shadows
  if (Array.isArray(shadows)) {
    shadows.forEach((item, index) => {
      if (item && typeof item === "object" && "value" in item) {
        pushToken(
          tokens,
          "shadow",
          String((item as { name?: string }).name ?? `shadow-${index + 1}`),
          String((item as { value: string }).value)
        )
      }
    })
  }

  return tokens
}

function fromW3C(tokensJson: Record<string, unknown>): ReturnType<typeof emptyTokens> {
  const tokens = emptyTokens()

  function walk(node: unknown, path: string[], category: string) {
    if (!node || typeof node !== "object") return

    const record = node as Record<string, unknown>
    if ("$value" in record) {
      pushToken(tokens, category, path.join(".") || category, String(record.$value))
      return
    }

    for (const [key, value] of Object.entries(record)) {
      if (key.startsWith("$")) continue
      const nextCategory = path.length === 0 ? key : category
      walk(value, [...path, key], nextCategory)
    }
  }

  for (const [category, value] of Object.entries(tokensJson)) {
    if (category.startsWith("$")) continue
    walk(value, [category], category)
  }

  return tokens
}

export function transformTokenSetForAnalyzer(
  tokenSet: Pick<TokenSet, "id" | "version" | "consensusScore" | "tokensJson" | "createdAt">
): AnalyzerTokenSet {
  const tokensJson = tokenSet.tokensJson as Record<string, unknown>
  const hasCuratedShape =
    Array.isArray(tokensJson.colors) ||
    (tokensJson.typography && typeof tokensJson.typography === "object")

  const tokens = hasCuratedShape ? fromCurated(tokensJson) : fromW3C(tokensJson)
  const totalAnalyzed = Object.values(tokens).reduce((sum, list) => sum + list.length, 0)

  return {
    id: tokenSet.id,
    version: tokenSet.version,
    consensusScore: Number(tokenSet.consensusScore ?? 0) * 100,
    tokens,
    metadata: {
      extractedAt: tokenSet.createdAt.toISOString(),
      cssSourceCount: 0,
      totalAnalyzed,
    },
  }
}

export function buildLayoutDNAFromProfile(profile: {
  profileJson: unknown
  containers?: unknown
  archetypes?: unknown
  gridFlex?: unknown
  spacingScale?: unknown
}) {
  const profileJson =
    profile.profileJson && typeof profile.profileJson === "object"
      ? (profile.profileJson as Record<string, unknown>)
      : {}

  return {
    ...profileJson,
    containers: profile.containers ?? profileJson.containers,
    archetypes: profile.archetypes ?? profileJson.archetypes,
    gridSystem: profile.gridFlex ?? profileJson.gridSystem,
    spacingBase:
      typeof profile.spacingScale === "object" &&
      profile.spacingScale &&
      "base" in (profile.spacingScale as Record<string, unknown>)
        ? Number((profile.spacingScale as { base: number }).base)
        : undefined,
  }
}
