#!/usr/bin/env bun

/**
 * Database Optimization Script
 *
 * Applies performance indexes to the database
 * Run with: bun scripts/apply-db-optimizations.ts
 */

import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';
import fs from 'fs/promises';
import path from 'path';

async function applyOptimizations() {
  console.log('🚀 Starting database optimization...\n');

  try {
    // Read the migration SQL file
    const migrationPath = path.join(process.cwd(), 'lib/db/migrations/0002_performance_indexes.sql');
    const migrationSQL = await fs.readFile(migrationPath, 'utf-8');

    console.log('📄 Loaded migration file');
    console.log(`📊 Migration size: ${migrationSQL.length} bytes\n`);

    // Split into individual statements (rough split by semicolon at end of line)
    const statements = migrationSQL
      .split(';\n')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'))
      .map(s => s + ';');

    console.log(`📝 Found ${statements.length} SQL statements to execute\n`);

    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];

      // Extract operation type for logging
      const match = statement.match(/^(CREATE|ANALYZE|ALTER|DROP)\s+(\w+)/i);
      const operation = match ? `${match[1]} ${match[2]}` : 'STATEMENT';

      try {
        process.stdout.write(`[${i + 1}/${statements.length}] ${operation}... `);

        await db.execute(sql.raw(statement));

        console.log('✅');
        successCount++;
      } catch (error: any) {
        if (error.message?.includes('already exists')) {
          console.log('⏭️  (already exists)');
          skipCount++;
        } else {
          console.log('❌');
          console.error(`   Error: ${error.message}\n`);
          errorCount++;
        }
      }
    }

    console.log('\n' + '='.repeat(80));
    console.log('📊 OPTIMIZATION SUMMARY');
    console.log('='.repeat(80));
    console.log(`✅ Successful: ${successCount}`);
    console.log(`⏭️  Skipped (already exists): ${skipCount}`);
    console.log(`❌ Failed: ${errorCount}`);
    console.log(`📝 Total statements: ${statements.length}`);
    console.log('='.repeat(80) + '\n');

    if (errorCount === 0) {
      console.log('🎉 Database optimization completed successfully!\n');

      // Check index creation
      console.log('🔍 Verifying indexes...\n');

      const indexes = await db.execute(sql`
        SELECT
          schemaname,
          tablename,
          indexname,
          pg_size_pretty(pg_relation_size(indexrelid)) as size
        FROM pg_stat_user_indexes
        WHERE schemaname = 'public'
        ORDER BY pg_relation_size(indexrelid) DESC
        LIMIT 20;
      `);

      console.log('📊 Top 20 largest indexes:');
      console.log('─'.repeat(80));
      indexes.rows.forEach((row: any) => {
        console.log(`  ${row.tablename}.${row.indexname} - ${row.size}`);
      });
      console.log('');

      // Check table sizes
      const tableSizes = await db.execute(sql`
        SELECT
          schemaname,
          tablename,
          pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS total_size,
          pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) AS table_size,
          pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename)) AS index_size
        FROM pg_tables
        WHERE schemaname = 'public'
        ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
        LIMIT 10;
      `);

      console.log('📊 Top 10 largest tables (with index sizes):');
      console.log('─'.repeat(80));
      tableSizes.rows.forEach((row: any) => {
        console.log(`  ${row.tablename}`);
        console.log(`    Total: ${row.total_size} (Table: ${row.table_size}, Indexes: ${row.index_size})`);
      });
      console.log('');

      console.log('✅ All optimizations verified!\n');
      console.log('💡 Next steps:');
      console.log('  1. Monitor query performance with pg_stat_statements');
      console.log('  2. Run stress tests to validate improvements');
      console.log('  3. Check index usage after 1-2 days');
      console.log('  4. Remove unused indexes if any\n');
    } else {
      console.log('⚠️  Some optimizations failed. Please review errors above.\n');
      process.exit(1);
    }

  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  applyOptimizations()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export { applyOptimizations };