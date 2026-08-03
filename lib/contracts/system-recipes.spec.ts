import { describe, expect, it } from 'vitest'
import { buildStudioContractPack } from '@/lib/contracts/authored-contract'
import {
  listSystemRecipes,
  recipeToStudioSystem,
  SYSTEM_RECIPES,
} from '@/lib/contracts/system-recipes'

describe('system recipes', () => {
  it('lists all industry recipes with engine profile + app-type', () => {
    const list = listSystemRecipes()
    expect(list.length).toBe(SYSTEM_RECIPES.length)
    expect(list.every((recipe) => recipe.profile && recipe.appType)).toBe(true)
    expect(list.map((recipe) => recipe.id)).toContain('saas-workbench')
    expect(list.map((recipe) => recipe.id)).toContain('editorial-magazine')
  })

  it('builds installable packs with matching --profile / --app-type', () => {
    for (const recipe of SYSTEM_RECIPES) {
      const { system, packOptions } = recipeToStudioSystem(recipe.id, `${recipe.label} Test`)
      const { pack, zip, fileName } = buildStudioContractPack(system, packOptions)
      expect(zip.byteLength).toBeGreaterThan(500)
      expect(fileName).toMatch(/design-contract\.zip$/)
      expect(pack.installCommand).toContain(`--profile ${recipe.profile}`)
      expect(pack.installCommand).toContain(`--app-type ${recipe.appType}`)
      expect(pack.designMd.markdown).toContain(system.name)
    }
  })

  it('rejects unknown recipe ids', () => {
    expect(() => recipeToStudioSystem('not-a-recipe')).toThrow(/Unknown recipe/)
  })
})
