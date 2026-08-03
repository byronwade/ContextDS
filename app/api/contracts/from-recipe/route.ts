/**
 * POST /api/contracts/from-recipe
 * Industry recipe preset → installable Design Contract ZIP (free, deterministic).
 * GET lists available recipes.
 */

import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { buildStudioContractPack } from '@/lib/contracts/authored-contract'
import {
  getSystemRecipe,
  listSystemRecipes,
  recipeToStudioSystem,
} from '@/lib/contracts/system-recipes'
import { agentRatelimit } from '@/lib/ratelimit'

export const runtime = 'nodejs'
export const maxDuration = 30

const bodySchema = z.object({
  recipeId: z.string().min(1).max(60),
  name: z.string().max(80).optional(),
  format: z.enum(['zip', 'json']).optional(),
})

export async function GET() {
  return NextResponse.json(
    { recipes: listSystemRecipes() },
    {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
      },
    }
  )
}

export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for') || 'anonymous'
  const limited = await agentRatelimit.limit(`recipe-pack:${ip}`)
  if (!limited.success) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })
  }

  try {
    const body = bodySchema.parse(await request.json())
    if (!getSystemRecipe(body.recipeId)) {
      return NextResponse.json(
        { error: `Unknown recipe "${body.recipeId}"`, recipes: listSystemRecipes() },
        { status: 400 }
      )
    }
    const { system, packOptions, recipe } = recipeToStudioSystem(
      body.recipeId,
      body.name
    )
    const { pack, zip, fileName } = buildStudioContractPack(system, packOptions)

    if (body.format === 'json') {
      return NextResponse.json({
        recipeId: recipe.id,
        profile: recipe.profile,
        appType: recipe.appType,
        system,
        installCommand: pack.installCommand,
        fileName,
        designMd: pack.designMd.markdown,
        fileCount: pack.files.length,
      })
    }

    return new NextResponse(Buffer.from(zip), {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Cache-Control': 'no-store',
        'X-Recipe-Id': recipe.id,
        'X-Design-Contract-Install': pack.installCommand,
      },
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid recipe payload', details: error.issues },
        { status: 400 }
      )
    }
    const message = error instanceof Error ? error.message : 'Recipe generation failed'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
