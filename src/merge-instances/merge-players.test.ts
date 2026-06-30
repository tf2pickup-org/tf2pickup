import { describe, expect, it } from 'vitest'
import { mergePlayer, mergePlayers } from './merge-players'
import type { PlayerModel } from '../database/models/player.model'
import { PlayerRole } from '../database/models/player.model'
import { Gamemode } from '../shared/types/gamemode'
import { Tf2ClassName } from '../shared/types/tf2-class-name'
import type { SteamId64 } from '../shared/types/steam-id-64'

function player(overrides: Partial<PlayerModel> & { steamId: SteamId64 }): PlayerModel {
  return {
    name: 'player',
    roles: [],
    stats: { totalGames: 0, gamesByGamemode: {}, gamesByClass: {} },
    ...overrides,
  } as unknown as PlayerModel
}

const steamId = '76561198000000001' as SteamId64

describe('mergePlayer', () => {
  it('unions per-gamemode skill, elo and stats', () => {
    const primary = player({
      steamId,
      skill: { [Gamemode.sixes]: { [Tf2ClassName.scout]: 4 } },
      elo: { [Gamemode.sixes]: { [Tf2ClassName.scout]: 1200 } },
      stats: {
        totalGames: 10,
        gamesByGamemode: { [Gamemode.sixes]: 10 },
        gamesByClass: { [Gamemode.sixes]: { [Tf2ClassName.scout]: 10 } },
      },
    })
    const secondary = player({
      steamId,
      skill: { [Gamemode.highlander]: { [Tf2ClassName.medic]: 7 } },
      elo: { [Gamemode.highlander]: { [Tf2ClassName.medic]: 1500 } },
      stats: {
        totalGames: 5,
        gamesByGamemode: { [Gamemode.highlander]: 5 },
        gamesByClass: { [Gamemode.highlander]: { [Tf2ClassName.medic]: 5 } },
      },
    })

    const merged = mergePlayer(primary, secondary)

    expect(merged.skill).toEqual({
      [Gamemode.sixes]: { [Tf2ClassName.scout]: 4 },
      [Gamemode.highlander]: { [Tf2ClassName.medic]: 7 },
    })
    expect(merged.elo).toEqual({
      [Gamemode.sixes]: { [Tf2ClassName.scout]: 1200 },
      [Gamemode.highlander]: { [Tf2ClassName.medic]: 1500 },
    })
    expect(merged.stats.totalGames).toBe(15)
    expect(merged.stats.gamesByGamemode).toEqual({
      [Gamemode.sixes]: 10,
      [Gamemode.highlander]: 5,
    })
  })

  it('unions roles so a secondary admin keeps authority', () => {
    const primary = player({ steamId, roles: [] })
    const secondary = player({ steamId, roles: [PlayerRole.admin] })

    expect(mergePlayer(primary, secondary).roles).toEqual([PlayerRole.admin])
  })

  it('keeps the primary instance profile fields', () => {
    const primary = player({ steamId, name: 'primary-name' })
    const secondary = player({ steamId, name: 'secondary-name' })

    expect(mergePlayer(primary, secondary).name).toBe('primary-name')
  })
})

describe('mergePlayers', () => {
  it('merges shared players and carries over the rest', () => {
    const other = '76561198000000002' as SteamId64
    const result = mergePlayers(
      [player({ steamId, roles: [PlayerRole.admin] })],
      [player({ steamId, roles: [PlayerRole.superUser] }), player({ steamId: other })],
    )

    expect(result).toHaveLength(2)
    const shared = result.find(p => p.steamId === steamId)!
    expect([...shared.roles].sort()).toEqual([PlayerRole.admin, PlayerRole.superUser].sort())
    expect(result.find(p => p.steamId === other)).toBeDefined()
  })
})
