import type { Metadata } from 'next'
import McpClient from '@/components/mcp/mcp-client'
import { listTools } from '@/lib/mcp/protocol'

export const metadata: Metadata = {
  title: 'MCP server — Design Contracts in your agent | designcontracts.sh',
  description:
    'Connect Claude, Cursor or any MCP client to designcontracts.sh: scan sites, blend systems, open the design canvas and pull installable Design Contract packs.',
}

export default function McpPage() {
  // Read the live manifest the endpoint serves, so this page can never
  // advertise a tool the server does not actually expose.
  const tools = listTools().map((tool) => ({
    name: tool.name,
    description: tool.description,
  }))
  return <McpClient tools={tools} />
}
