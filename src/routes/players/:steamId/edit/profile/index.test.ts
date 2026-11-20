import { describe, it, expect } from 'vitest'
import { milliseconds } from 'date-fns'
import { buildProfileUpdate } from './build-profile-update'

const month = milliseconds({ months: 1 })

describe('buildProfileUpdate', () => {
  it('includes $push with old name when name changes', () => {
    const result = buildProfileUpdate(
      { name: 'OldName', cooldownLevel: 0 },
      { name: 'NewName', cooldownLevel: 0 },
      month,
    )
    expect(result.$set).toEqual({ name: 'NewName' })
    expect(result.$push).toEqual({
      nameHistory: { name: 'OldName', changedAt: expect.any(Date) },
    })
  })

  it('omits $push when name is unchanged', () => {
    const result = buildProfileUpdate(
      { name: 'SameName', cooldownLevel: 0 },
      { name: 'SameName', cooldownLevel: 0 },
      month,
    )
    expect(result.$set).toEqual({ name: 'SameName' })
    expect(result.$push).toBeUndefined()
  })

  it('records the cooldown level and restarts the decay clock when it changes', () => {
    const result = buildProfileUpdate(
      { name: 'Name', cooldownLevel: 1, cooldownLevelUpdatedAt: new Date() },
      { name: 'Name', cooldownLevel: 5 },
      month,
    )
    expect(result.$set).toEqual({
      name: 'Name',
      cooldownLevel: 5,
      cooldownLevelUpdatedAt: expect.any(Date),
    })
  })

  it('does not touch the cooldown when the submitted level matches the decayed one', () => {
    const result = buildProfileUpdate(
      {
        name: 'Name',
        cooldownLevel: 3,
        cooldownLevelUpdatedAt: new Date(Date.now() - 2 * month),
      },
      { name: 'Name', cooldownLevel: 1 },
      month,
    )
    expect(result.$set).toEqual({ name: 'Name' })
  })

  it('keeps the decay when the level decayed after the form was rendered', () => {
    // the form showed the level as it was a month ago, and it has decayed since then
    const result = buildProfileUpdate(
      {
        name: 'Name',
        cooldownLevel: 3,
        cooldownLevelUpdatedAt: new Date(Date.now() - 2 * month),
      },
      { name: 'Name', cooldownLevel: 2, cooldownLevelAsShown: 2 },
      month,
    )
    expect(result.$set).toEqual({ name: 'Name' })
  })

  it('records the level the admin typed even when it matches the stored one', () => {
    const result = buildProfileUpdate(
      {
        name: 'Name',
        cooldownLevel: 3,
        cooldownLevelUpdatedAt: new Date(Date.now() - 2 * month),
      },
      { name: 'Name', cooldownLevel: 3, cooldownLevelAsShown: 1 },
      month,
    )
    expect(result.$set).toEqual({
      name: 'Name',
      cooldownLevel: 3,
      cooldownLevelUpdatedAt: expect.any(Date),
    })
  })
})
