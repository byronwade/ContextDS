#!/usr/bin/env bun

/**
 * Apply Analytics Migration
 *
 * Applies the comprehensive analytics schema to the database
 * Run with: bun scripts/apply-analytics-migration.ts
 */

import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';
import fs from 'fs/promises';
import path from 'path';

async function applyAnalyticsMigration() {
  console.log('🚀 Applying analytics migration...\n');

  try {
    // Read the analytics migration file
    const migrationPath = path.join(process.cwd(), 'lib/db/migrations/0003_analytics_schema.sql');
    const migrationSQL = await fs.readFile(migrationPath, 'utf-8');

    console.log('📄 Loaded analytics migration');
    console.log(`📊 Migration size: ${migrationSQL.length} bytes\n`);

    // Execute the entire migration as a single transaction
    // PostgreSQL can handle multiple statements separated by semicolons
    console.log('📝 Executing migration as single transaction...\n');

    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;

    try {
      await db.execute(sql.raw(migrationSQL));
      console.log('✅ Migration executed successfully\n');
      successCount = 1;
    } catch (error: any) {
      if (error.message?.includes('already exists')) {
        console.log('⏭️  Migration already applied\n');
        skipCount = 1;
      } else {
        console.log('❌ Migration failed\n');
        console.error(`Error: ${error.message}\n`);
        errorCount = 1;
      }
    }

    console.log('\n' + '='.repeat(80));
    console.log('📊 ANALYTICS MIGRATION SUMMARY');
    console.log('='.repeat(80));
    console.log(`✅ Successful: ${successCount}`);
    console.log(`⏭️  Skipped (already exists): ${skipCount}`);
    console.log(`❌ Failed: ${errorCount}`);
    console.log('='.repeat(80) + '\n');

    if (errorCount === 0) {
      console.log('🎉 Analytics migration completed successfully!\n');

      // Verify analytics tables
      console.log('🔍 Verifying analytics tables...\n');

      const tables = await db.execute(sql`
        SELECT tablename
        FROM pg_tables
        WHERE schemaname = 'public'
          AND tablename LIKE '%analytics%'
        ORDER BY tablename;
      `);

      console.log('📊 Analytics tables created:');
      console.log('─'.repeat(80));
      tables.rows.forEach((row: any) => {
        console.log(`  ✓ ${row.tablename}`);
      });
      console.log('');

      console.log('✅ Analytics system ready!\n');
      console.log('💡 Next steps:');
      console.log('  1. Start tracking events with analytics.trackEvent()');
      console.log('  2. Query metrics with analytics service functions');
      console.log('  3. Refresh materialized views daily');
      console.log('  4. Monitor analytics dashboard\n');
    } else {
      console.log('⚠️  Some statements failed. Please review errors above.\n');
      process.exit(1);
    }

  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  applyAnalyticsMigration()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export { applyAnalyticsMigration };