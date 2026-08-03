import { describe, expect, it } from 'vitest'
import { MCP_WRITE_TOOLS, mcpWriteRequiresPro } from '@/lib/mcp/access'

describe('MCP write gating', () => {
  it('marks costly / mutating tools as write', () => {
    expect(mcpWriteRequiresPro('scan_site')).toBe(true)
    expect(mcpWriteRequiresPro('contract_from_screenshot')).toBe(true)
    expect(mcpWriteRequiresPro('refine_design_md')).toBe(true)
    expect(mcpWriteRequiresPro('blend_systems')).toBe(true)
    expect(mcpWriteRequiresPro('generate_from_brief')).toBe(true)
    expect(mcpWriteRequiresPro('import_design_tokens')).toBe(true)
    expect(mcpWriteRequiresPro('compose_design_artifacts')).toBe(true)
  })

  it('keeps read tools public', () => {
    expect(mcpWriteRequiresPro('get_tokens')).toBe(false)
    expect(mcpWriteRequiresPro('get_design_md')).toBe(false)
    expect(mcpWriteRequiresPro('get_contract_download')).toBe(false)
    expect(mcpWriteRequiresPro('compare_systems')).toBe(false)
    expect(mcpWriteRequiresPro('check_contrast')).toBe(false)
    expect(mcpWriteRequiresPro('find_similar_systems')).toBe(false)
  })

  it('has a stable write-tool set size', () => {
    expect(MCP_WRITE_TOOLS.size).toBeGreaterThanOrEqual(6)
  })
})
