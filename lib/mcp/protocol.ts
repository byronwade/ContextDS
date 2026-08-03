/**
 * Model Context Protocol (JSON-RPC 2.0) for designcontracts.sh.
 *
 * The tool manifest is DERIVED from the same `designContractTools` the Scan
 * agent uses, so an MCP client and the chat can never drift apart: adding a
 * tool for one adds it for both. Zod schemas convert straight to the JSON
 * Schema that `tools/list` must advertise.
 */

import { z } from 'zod'
import { designContractTools } from '@/lib/agent/tools'
import { mcpWriteRequiresPro, type McpAuthContext } from '@/lib/mcp/access'

/** Protocol revision this server implements. */
export const PROTOCOL_VERSION = '2024-11-05'

export const SERVER_INFO = {
  name: 'designcontracts',
  title: 'Design Contracts',
  version: '1.0.0',
} as const

type AgentTool = {
  description?: string
  inputSchema?: unknown
  execute?: (input: unknown, options: unknown) => Promise<unknown>
}

const TOOLS = designContractTools as unknown as Record<string, AgentTool>

export type JsonRpcRequest = {
  jsonrpc?: string
  id?: string | number | null
  method?: string
  params?: Record<string, unknown>
}

export type JsonRpcResponse = {
  jsonrpc: '2.0'
  id: string | number | null
  result?: unknown
  error?: { code: number; message: string; data?: unknown }
}

// JSON-RPC 2.0 reserved codes.
export const PARSE_ERROR = -32700
export const INVALID_REQUEST = -32600
export const METHOD_NOT_FOUND = -32601
export const INVALID_PARAMS = -32602
export const INTERNAL_ERROR = -32603

function ok(id: string | number | null, result: unknown): JsonRpcResponse {
  return { jsonrpc: '2.0', id, result }
}

function fail(
  id: string | number | null,
  code: number,
  message: string,
  data?: unknown
): JsonRpcResponse {
  return { jsonrpc: '2.0', id, error: { code, message, ...(data ? { data } : {}) } }
}

/** Advertise every agent tool with a JSON Schema derived from its zod input. */
export function listTools() {
  return Object.entries(TOOLS)
    .filter(([, item]) => typeof item.execute === 'function')
    .map(([name, item]) => {
      let inputSchema: unknown = { type: 'object', properties: {} }
      try {
        if (item.inputSchema) {
          inputSchema = z.toJSONSchema(item.inputSchema as z.ZodType, { io: 'input' })
        }
      } catch {
        // A schema we cannot express still lists — better a callable tool with
        // a loose schema than a tool the client never sees.
        inputSchema = { type: 'object', additionalProperties: true }
      }
      return {
        name,
        description: item.description ?? name,
        inputSchema,
      }
    })
}

/** MCP content blocks — results are JSON, rendered as text for the client. */
function textContent(value: unknown) {
  const text =
    typeof value === 'string' ? value : JSON.stringify(value, null, 2) ?? String(value)
  return [{ type: 'text' as const, text }]
}

async function callTool(
  params: Record<string, unknown> | undefined,
  auth?: McpAuthContext
) {
  const name = typeof params?.name === 'string' ? params.name : ''
  const args = (params?.arguments ?? {}) as Record<string, unknown>
  const item = TOOLS[name]

  if (!item || typeof item.execute !== 'function') {
    return {
      content: textContent(`Unknown tool: ${name}`),
      isError: true,
    }
  }

  if (mcpWriteRequiresPro(name) && !auth?.isPro) {
    return {
      content: textContent({
        error: 'Pro required',
        tool: name,
        message:
          'This MCP write tool requires a Design Contracts Pro key. Generate one at /mcp after subscribing, then send Authorization: Bearer dc_live_…',
        upgradePath: '/pricing',
      }),
      isError: true,
    }
  }

  // Validate against the tool's own schema so a bad call fails with a useful
  // message instead of throwing somewhere deep in the pipeline.
  let input: unknown = args
  if (item.inputSchema) {
    const parsed = (item.inputSchema as z.ZodType).safeParse(args)
    if (!parsed.success) {
      return {
        content: textContent({
          error: 'Invalid arguments',
          issues: parsed.error.issues.map((issue) => ({
            path: issue.path.join('.'),
            message: issue.message,
          })),
        }),
        isError: true,
      }
    }
    input = parsed.data
  }

  const result = await item.execute(input, {
    toolCallId: `mcp-${name}-${Date.now()}`,
    messages: [],
  })
  return { content: textContent(result), structuredContent: result, isError: false }
}

/**
 * Handle one JSON-RPC message. Returns null for notifications (no `id`),
 * which per spec must not receive a response body.
 */
export async function handleRpc(
  message: JsonRpcRequest,
  auth?: McpAuthContext
): Promise<JsonRpcResponse | null> {
  const id = message?.id ?? null
  const method = message?.method
  const isNotification = message?.id === undefined || message?.id === null

  if (!method) {
    return isNotification ? null : fail(id, INVALID_REQUEST, 'Missing method')
  }

  // Notifications: acknowledge silently.
  if (method.startsWith('notifications/')) return null

  switch (method) {
    case 'initialize':
      return ok(id, {
        protocolVersion: PROTOCOL_VERSION,
        capabilities: { tools: { listChanged: false } },
        serverInfo: SERVER_INFO,
        instructions:
          'Scan public websites into installable Design Contracts. Call scan_site first for an unknown domain, then get_tokens / get_design_md / get_contract_download. Write tools (scan_site, contract_from_screenshot, refine_design_md, blend_systems, …) require a Pro MCP key (Authorization: Bearer dc_live_…).',
      })

    case 'ping':
      return ok(id, {})

    case 'tools/list':
      return ok(id, { tools: listTools() })

    case 'tools/call':
      try {
        return ok(id, await callTool(message.params, auth))
      } catch (error) {
        return ok(id, {
          content: textContent(
            error instanceof Error ? error.message : 'Tool execution failed'
          ),
          isError: true,
        })
      }

    default:
      return isNotification ? null : fail(id, METHOD_NOT_FOUND, `Unknown method: ${method}`)
  }
}

/** Handle a single message or a JSON-RPC batch. */
export async function handleMessage(
  payload: unknown,
  auth?: McpAuthContext
): Promise<JsonRpcResponse | JsonRpcResponse[] | null> {
  if (Array.isArray(payload)) {
    const responses = await Promise.all(
      payload.map((entry) => handleRpc(entry as JsonRpcRequest, auth))
    )
    const real = responses.filter((entry): entry is JsonRpcResponse => entry !== null)
    return real.length > 0 ? real : null
  }
  return handleRpc(payload as JsonRpcRequest, auth)
}
