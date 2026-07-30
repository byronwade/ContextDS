import { defineConfig } from 'drizzle-kit'
import * as dotenv from 'dotenv'

// Load environment variables (optional for tooling like Knip)
dotenv.config({ path: '.env.local' })

const databaseUrl = process.env.DATABASE_URL || 'postgres://localhost:5432/designcontracts'

export default defineConfig({
  schema: './lib/db/schema.ts',
  out: './lib/db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: databaseUrl,
  },
  verbose: Boolean(process.env.DATABASE_URL),
  strict: true,
  migrations: {
    prefix: 'supabase',
  },
})
