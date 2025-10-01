#!/usr/bin/env bun
import { config } from 'dotenv'
import postgres from 'postgres'
import { join } from 'path'

config({ path: join(process.cwd(), '.env.local') })

const sql = postgres(process.env.DATABASE_URL!, {
  max: 1,
  ssl: 'require'
})

async function verify() {
  console.log('🔍 Verifying migration...\n')

  // Check css_content table
  const cssContentCount = await sql`
    SELECT COUNT(*) as count FROM css_content
  `
  console.log(`✅ css_content table: ${cssContentCount[0].count} rows`)

  // Check css_sources foreign key
  const fkCheck = await sql`
    SELECT COUNT(*) as count
    FROM css_sources cs
    LEFT JOIN css_content cc ON cs.sha = cc.sha
    WHERE cs.sha IS NOT NULL AND cc.sha IS NULL
  `
  console.log(`✅ Orphaned css_sources references: ${fkCheck[0].count}`)

  if (parseInt(fkCheck[0].count) > 0) {
    console.log('⚠️  Found orphaned references, listing first 5:')
    const orphaned = await sql`
      SELECT cs.id, cs.sha, cs.url
      FROM css_sources cs
      LEFT JOIN css_content cc ON cs.sha = cc.sha
      WHERE cs.sha IS NOT NULL AND cc.sha IS NULL
      LIMIT 5
    `
    console.table(orphaned)
  }

  // Check screenshots constraint
  const duplicates = await sql`
    SELECT site_id, viewport, COUNT(*) as count
    FROM screenshots
    GROUP BY site_id, viewport
    HAVING COUNT(*) > 1
  `
  console.log(`✅ Duplicate screenshots: ${duplicates.length}`)

  if (duplicates.length > 0) {
    console.log('⚠️  Found duplicate screenshots:')
    console.table(duplicates)
  }

  // Check constraints
  const constraints = await sql`
    SELECT conname as constraint_name, contype as type
    FROM pg_constraint
    WHERE conrelid = 'screenshots'::regclass
  `
  console.log('\n📋 Screenshots table constraints:')
  console.table(constraints)

  await sql.end()
  console.log('\n✨ Verification complete!')
}

verify().catch(console.error)
