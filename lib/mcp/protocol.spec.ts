import { describe, expect, it } from 'vitest'
import { handleRpc, listTools } from '@/lib/mcp/protocol'
import type { McpAuthContext } from '@/lib/mcp/access'

const anon: McpAuthContext = {
  authorized: true,
  authenticated: false,
  isPro: false,
  identity: 'anon:test',
}

const pro: McpAuthContext = {
  authorized: true,
  authenticated: true,
  isPro: true,
  customerId: 'cus_test',
  identity: 'pro:cus_test',
}

describe('MCP protocol tool surface', () => {
  it('lists live agent tools — not legacy scan_tokens names', () => {
    const names = listTools().map((tool) => tool.name)
    expect(names).toContain('scan_site')
    expect(names).toContain('get_tokens')
    expect(names).toContain('get_design_md')
    expect(names).toContain('get_contract_download')
    expect(names).not.toContain('scan_tokens')
    expect(names).not.toContain('layout_profile')
    expect(names).not.toContain('compose_pack')
  })

  it('blocks write tools for anonymous callers', async () => {
    const response = await handleRpc(
      {
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/call',
        params: { name: 'scan_site', arguments: { url: 'https://example.com' } },
      },
      anon
    )
    expect(response?.result).toMatchObject({ isError: true })
    const text = JSON.stringify(response?.result)
    expect(text).toMatch(/Pro required/i)
  })

  it('allows read tools without Pro', async () => {
    const response = await handleRpc(
      {
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/call',
        params: { name: 'check_contrast', arguments: { foreground: '#000', background: '#fff' } },
      },
      anon
    )
    expect(response?.error).toBeUndefined()
    expect(response?.result).toBeTruthy()
    expect((response?.result as { isError?: boolean })?.isError).not.toBe(true)
  })

  it('initialize mentions Pro write tools', async () => {
    const response = await handleRpc(
      { jsonrpc: '2.0', id: 3, method: 'initialize', params: {} },
      pro
    )
    const instructions = String(
      (response?.result as { instructions?: string })?.instructions || ''
    )
    expect(instructions).toMatch(/dc_live_/)
    expect(instructions).toMatch(/get_tokens/)
  })
})
