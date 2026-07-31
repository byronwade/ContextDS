import type { Metadata } from 'next'
import McpClient from '@/components/mcp/mcp-client'

export const metadata: Metadata = {
  title: 'MCP server — Design Contracts in your agent | designcontracts.sh',
  description:
    'Connect Claude, Cursor or any MCP client to designcontracts.sh: scan sites, fetch tokens, profile layout and compose installable Design Contract packs. A Pro feature.',
}

export default function McpPage() {
  return <McpClient />
}
