import { describe, expect, it } from 'vitest'
import { canAccessSystem, type StoredSystem } from '@/lib/storage/system-store'

function stub(partial: Partial<StoredSystem>): StoredSystem {
  return {
    id: 'sys_test',
    slug: 'test',
    name: 'Test',
    system: {} as StoredSystem['system'],
    origin: { kind: 'blank' },
    visibility: 'public',
    ownerCustomerId: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    revisionCount: 1,
    preview: { colors: [], fonts: [], radius: null, personality: null },
    ...partial,
  }
}

describe('canAccessSystem', () => {
  it('allows anyone to read public systems', () => {
    expect(canAccessSystem(stub({ visibility: 'public' }), null)).toBe(true)
  })

  it('denies private systems without matching owner', () => {
    const privateSystem = stub({
      visibility: 'private',
      ownerCustomerId: 'cus_owner',
    })
    expect(canAccessSystem(privateSystem, null)).toBe(false)
    expect(canAccessSystem(privateSystem, 'cus_other')).toBe(false)
  })

  it('allows the owning Stripe customer', () => {
    const privateSystem = stub({
      visibility: 'private',
      ownerCustomerId: 'cus_owner',
    })
    expect(canAccessSystem(privateSystem, 'cus_owner')).toBe(true)
  })

  it('denies private systems with missing owner stamp', () => {
    expect(
      canAccessSystem(stub({ visibility: 'private', ownerCustomerId: null }), 'cus_x')
    ).toBe(false)
  })
})
