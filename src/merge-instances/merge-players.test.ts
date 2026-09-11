import { describe, expect, it } from 'vitest'
import { mergePlayer, mergePlayers } from './merge-players'
import { PlayerRole, type PlayerModel } from '../database/models/player.model'
import type { SteamId64 } from '../shared/types/steam-id-64'

function player(overrides: Partial<PlayerModel> = {}): PlayerModel {
  return {
    steamId: 'S1' as SteamId64,
    name: 'primary-name',
    joinedAt: new Date('2022-01-01'),
    roles: [],
    stats: { totalGames: 0, gamesByGamemode: {}, gamesByClass: {} },
    ...overrides,
  } as PlayerModel
}

describe('mergePlayer()', () => {
  it('keeps the primary identity and roles', () => {
    const primary = player({ name: 'keep-me', roles: [PlayerRole.admin] })
    const secondary = player({ name: 'drop-me', roles: [PlayerRole.superUser] })
    const merged = mergePlayer(primary, secondary)
    expect(merged.name).toBe('keep-me')
    expect(merged.roles).toEqual([PlayerRole.admin])
  })

  it('takes the earliest registration date', () => {
    const merged = mergePlayer(
      player({ joinedAt: new Date('2023-05-01') }),
      player({ joinedAt: new Date('2021-02-01') }),
    )
    expect(merged.joinedAt).toEqual(new Date('2021-02-01'))
  })

  it('unions bans from both instances', () => {
    type Ban = NonNullable<PlayerModel['bans']>[number]
    const a = { reason: 'a' } as unknown as Ban
    const b = { reason: 'b' } as unknown as Ban
    const merged = mergePlayer(player({ bans: [a] }), player({ bans: [b] }))
    expect(merged.bans).toEqual([a, b])
  })

  it('unions per-gamemode stats and totals', () => {
    const merged = mergePlayer(
      player({ stats: { totalGames: 3, gamesByGamemode: { '6v6': 3 }, gamesByClass: {} } }),
      player({ stats: { totalGames: 5, gamesByGamemode: { '9v9': 5 }, gamesByClass: {} } }),
    )
    expect(merged.stats.totalGames).toBe(8)
    expect(merged.stats.gamesByGamemode).toEqual({ '6v6': 3, '9v9': 5 })
  })
})

describe('mergePlayers()', () => {
  it('merges players present on both by steamId', () => {
    const primary = [player({ steamId: 'S1' as SteamId64, name: 'p1' })]
    const secondary = [player({ steamId: 'S1' as SteamId64, name: 's1' })]
    const merged = mergePlayers(primary, secondary)
    expect(merged).toHaveLength(1)
    expect(merged[0]!.name).toBe('p1')
  })

  it('imports a secondary-only player but strips their roles', () => {
    const secondaryOnly = player({ steamId: 'S2' as SteamId64, roles: [PlayerRole.admin] })
    const merged = mergePlayers([], [secondaryOnly])
    expect(merged).toHaveLength(1)
    expect(merged[0]!.steamId).toBe('S2')
    expect(merged[0]!.roles).toEqual([])
  })

  it('carries a primary-only player over unchanged', () => {
    const primaryOnly = player({ steamId: 'S3' as SteamId64, roles: [PlayerRole.admin] })
    const merged = mergePlayers([primaryOnly], [])
    expect(merged[0]!.roles).toEqual([PlayerRole.admin])
  })
})
