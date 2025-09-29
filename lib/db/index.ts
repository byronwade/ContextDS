import { drizzle } from 'drizzle-orm/postgres-js'
import { sql } from 'drizzle-orm'
import postgres from 'postgres'
import * as schema from './schema'

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is required')
}

console.log('🔗 Connecting to Neon PostgreSQL with ultrathink optimization...')

// Ultrathink optimized connection to Neon database
const client = postgres(process.env.DATABASE_URL, {
  // Connection pooling optimization
  max: 20,                    // Maximum connections in pool
  idle_timeout: 20,           // Close idle connections after 20s
  connect_timeout: 10,        // Connection timeout in seconds

  // Performance optimization
  prepare: true,              // Enable prepared statements for repeated queries
  ssl: 'require',             // Required for Neon

  // Query optimization
  transform: {
    undefined: null           // Convert undefined to null for cleaner queries
  },

  // Connection metadata
  connection: {
    application_name: 'contextds-production',
    statement_timeout: '30s',                    // Prevent hanging queries
    idle_in_transaction_session_timeout: '10s', // Prevent idle transactions
    tcp_keepalives_idle: '60',                   // TCP keepalive for stable connections
    tcp_keepalives_interval: '30',
    tcp_keepalives_count: '3'
  },

  // Debugging and monitoring
  debug: process.env.NODE_ENV === 'development',

  // Error handling
  onnotice: (notice) => {
    if (notice.severity === 'WARNING') {
      console.warn('PostgreSQL warning:', notice.message)
    }
  }
})

export const db = drizzle(client, {
  schema,
  logger: process.env.NODE_ENV === 'development'
})

// Connection health monitoring
const connectionHealth = {
  isHealthy: true,
  lastCheck: Date.now(),
  errorCount: 0,
  queryCount: 0
}

// Health check function
export async function checkDatabaseHealth(): Promise<{
  healthy: boolean
  responseTime: number
  errorCount: number
  queryCount: number
}> {
  const start = Date.now()

  try {
    // Simple health check query
    await db.execute(sql`SELECT 1`)

    const responseTime = Date.now() - start
    connectionHealth.isHealthy = true
    connectionHealth.lastCheck = Date.now()
    connectionHealth.queryCount++

    console.log(`✅ Database health check: ${responseTime}ms`)

    return {
      healthy: true,
      responseTime,
      errorCount: connectionHealth.errorCount,
      queryCount: connectionHealth.queryCount
    }

  } catch (error) {
    connectionHealth.isHealthy = false
    connectionHealth.errorCount++

    console.error('❌ Database health check failed:', error)

    return {
      healthy: false,
      responseTime: Date.now() - start,
      errorCount: connectionHealth.errorCount,
      queryCount: connectionHealth.queryCount
    }
  }
}

// Performance monitoring wrapper
export async function queryWithMetrics<T>(
  queryFn: () => Promise<T>,
  queryName: string
): Promise<T> {
  const start = Date.now()

  try {
    const result = await queryFn()
    const duration = Date.now() - start

    connectionHealth.queryCount++

    // Log performance metrics
    if (duration > 1000) {
      console.warn(`🐌 Slow query detected: ${queryName} took ${duration}ms`)
    } else if (process.env.NODE_ENV === 'development') {
      console.log(`⚡ Query ${queryName}: ${duration}ms`)
    }

    return result

  } catch (error) {
    connectionHealth.errorCount++
    console.error(`❌ Query ${queryName} failed:`, error)
    throw error
  }
}

// Initialize database optimization
async function initializeOptimization() {
  try {
    console.log('🚀 Initializing ContextDS database optimization...')

    // Check if optimization tables exist
    const hasOptimization = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'sites'
      )
    `)

    if (hasOptimization && hasOptimization.length > 0) {
      console.log('✅ Database tables confirmed')

      // Run initial health check
      await checkDatabaseHealth()

      // Set up periodic health monitoring (every 5 minutes)
      setInterval(() => {
        checkDatabaseHealth().catch(console.error)
      }, 5 * 60 * 1000)

    } else {
      console.warn('⚠️  Database tables not found - run migrations first')
    }

  } catch (error) {
    console.error('❌ Database optimization initialization failed:', error)
  }
}

// Initialize on import
if (typeof window === 'undefined') {
  initializeOptimization()
}

console.log('✅ Ultrathink database connection established with performance monitoring')

export * from './schema'
export { sql } from 'drizzle-orm'