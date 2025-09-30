import { NextRequest, NextResponse } from 'next/server'
import { db, tokenSets } from '@/lib/db'
import { eq } from 'drizzle-orm'
import { compareTokenSets, generateChangelog } from '@/lib/analyzers/version-diff'

/**
 * POST /api/versions/compare
 * Compare two token set versions
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { oldVersionId, newVersionId } = body

    if (!oldVersionId || !newVersionId) {
      return NextResponse.json(
        { error: 'Both oldVersionId and newVersionId are required' },
        { status: 400 }
      )
    }

    // Fetch both versions
    const [oldVersion] = await db
      .select()
      .from(tokenSets)
      .where(eq(tokenSets.id, oldVersionId))
      .limit(1)

    const [newVersion] = await db
      .select()
      .from(tokenSets)
      .where(eq(tokenSets.id, newVersionId))
      .limit(1)

    if (!oldVersion || !newVersion) {
      return NextResponse.json(
        { error: 'Version not found' },
        { status: 404 }
      )
    }

    // Generate diff
    const diff = compareTokenSets(oldVersion.tokensJson, newVersion.tokensJson)
    const changelog = generateChangelog(diff)

    return NextResponse.json({
      diff,
      changelog,
      oldVersion: {
        id: oldVersion.id,
        number: oldVersion.versionNumber,
        createdAt: oldVersion.createdAt.toISOString()
      },
      newVersion: {
        id: newVersion.id,
        number: newVersion.versionNumber,
        createdAt: newVersion.createdAt.toISOString()
      }
    })
  } catch (error) {
    console.error('Failed to compare versions:', error)
    return NextResponse.json(
      { error: 'Failed to compare versions' },
      { status: 500 }
    )
  }
}