import { describe, expect, it } from 'vitest'
import { designContractTools } from '@/lib/agent/tools'

describe('designContractTools', () => {
  it('exposes the Design Contract tool surface', () => {
    expect(Object.keys(designContractTools).sort()).toEqual(
      [
        'blend_systems',
        'check_contrast',
        'compare_systems',
        'compose_design_artifacts',
        'contract_from_screenshot',
        'critique_design',
        'find_similar_systems',
        'generate_from_brief',
        'generate_theme_css',
        'get_contract_download',
        'get_design_md',
        'get_tokens',
        'import_design_tokens',
        'open_canvas',
        'refine_design_md',
        'resolve_graph',
        'restyle_page',
        'scan_site',
        'update_canvas',
      ].sort()
    )
  })
})
