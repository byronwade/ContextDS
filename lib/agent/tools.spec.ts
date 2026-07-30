import { describe, expect, it } from 'vitest'
import { designContractTools } from '@/lib/agent/tools'

describe('designContractTools', () => {
  it('exposes the core Design Contract tool surface', () => {
    expect(Object.keys(designContractTools).sort()).toEqual(
      ['get_contract_download', 'get_design_md', 'get_tokens', 'resolve_graph', 'scan_site'].sort()
    )
  })
})
