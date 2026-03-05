import { describe, it, expect } from 'vitest'
import { buildProfileUpdate } from './build-profile-update'

describe('buildProfileUpdate', () => {
  it('includes $push with old name when name changes', () => {
    const result = buildProfileUpdate('OldName', { name: 'NewName', cooldownLevel: 0 })
    expect(result.$set).toEqual({ name: 'NewName', cooldownLevel: 0 })
    expect(result.$push).toEqual({
      nameHistory: { name: 'OldName', changedAt: expect.any(Date) },
    })
  })

  it('omits $push when name is unchanged', () => {
    const result = buildProfileUpdate('SameName', { name: 'SameName', cooldownLevel: 0 })
    expect(result.$set).toEqual({ name: 'SameName', cooldownLevel: 0 })
    expect(result.$push).toBeUndefined()
  })
})
