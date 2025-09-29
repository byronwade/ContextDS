import { defineConfig } from 'drizzle-kit'
import * as dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })

export default defineConfig({
  schema: './lib/db/schema.ts',
  out: './lib/db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_Jru6qUjQ9NCf@ep-delicate-breeze-adofco8i-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require',
  },
  verbose: true,
  strict: true,
  migrations: {
    prefix: 'supabase',
  },
})