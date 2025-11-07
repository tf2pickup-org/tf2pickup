import { describe, expect, it } from 'vitest'
import { makePlayerChangesNotificationBody } from './make-player-changes-notification-body'
import { PlayerRole, type PlayerModel } from '../database/models/player.model'

describe('makePlayerChangesNotificationBody()', () => {
  it('should list changes in name, roles and cooldownLevel', () => {
    expect(
      makePlayerChangesNotificationBody({
        before: { name: 'old', roles: [] as PlayerRole[], cooldownLevel: 1 } as PlayerModel,
        after: { name: 'new', roles: [PlayerRole.admin], cooldownLevel: 2 } as PlayerModel,
      }),
    ).toBe(
      'Name: **old** => **new**\nRoles: **__none__** => **admin**\nCooldown level: **1** => **2**',
    )
  })

  it('should return empty string if there are no changes', () => {
    expect(
      makePlayerChangesNotificationBody({
        before: { name: 'test', roles: [PlayerRole.admin], cooldownLevel: 0 } as PlayerModel,
        after: { name: 'test', roles: [PlayerRole.admin], cooldownLevel: 0 } as PlayerModel,
      }),
    ).toBe('')
  })
})
