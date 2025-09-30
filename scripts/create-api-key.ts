#!/usr/bin/env bun

/**
 * Create API Key Script
 *
 * Generates a secure API key for MCP server access
 *
 * Usage:
 *   bun run scripts/create-api-key.ts --name="Claude Desktop" --tier="pro"
 *   bun run scripts/create-api-key.ts --user-id="user-123" --tier="free"
 */

import { createHash, randomBytes } from 'node:crypto'
import { db } from '../lib/db'
import { apiKeys } from '../lib/db/schema'

async function createApiKey(options: {
  userId?: string
  name: string
  tier: 'free' | 'pro' | 'enterprise'
  expiresInDays?: number
}) {
  try {
    // Generate secure API key (64 hex characters)
    const rawKey = randomBytes(32).toString('hex')
    const keyHash = createHash('sha256').update(rawKey).digest('hex')

    // Calculate expiration
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + (options.expiresInDays || 365))

    // Insert into database
    const [newKey] = await db.insert(apiKeys).values({
      userId: options.userId || null,
      name: options.name,
      keyHash,
      tier: options.tier,
      isActive: true,
      expiresAt,
      createdAt: new Date()
    }).returning()

    console.log('\n✅ API Key Created Successfully!\n')
    console.log('═'.repeat(80))
    console.log(`📝 Name:        ${options.name}`)
    console.log(`🎫 Tier:        ${options.tier}`)
    console.log(`🔑 API Key:     ${rawKey}`)
    console.log(`📅 Expires:     ${expiresAt.toISOString()}`)
    console.log(`🆔 Key ID:      ${newKey.id}`)
    console.log('═'.repeat(80))
    console.log('\n⚠️  IMPORTANT: Save this API key now! It cannot be retrieved later.\n')
    console.log('Add to your environment:')
    console.log(`export CONTEXTDS_API_KEY="${rawKey}"`)
    console.log('\nOr add to Claude Desktop config:')
    console.log(JSON.stringify({
      mcpServers: {
        contextds: {
          command: 'node',
          args: ['/path/to/mcp-server-wrapper.js'],
          env: {
            CONTEXTDS_API_KEY: rawKey,
            CONTEXTDS_API_URL: API_URL || 'http://localhost:3000/api/mcp'
          }
        }
      }
    }, null, 2))
    console.log('')

  } catch (error) {
    console.error('❌ Failed to create API key:', error)
    process.exit(1)
  } finally {
    process.exit(0)
  }
}

// Parse command line arguments
const args = process.argv.slice(2)
const options = {
  userId: args.find(a => a.startsWith('--user-id='))?.split('=')[1],
  name: args.find(a => a.startsWith('--name='))?.split('=')[1] || 'MCP Client',
  tier: (args.find(a => a.startsWith('--tier='))?.split('=')[1] || 'free') as 'free' | 'pro' | 'enterprise',
  expiresInDays: parseInt(args.find(a => a.startsWith('--expires='))?.split('=')[1] || '365')
}

createApiKey(options)