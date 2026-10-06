import { describe, expect, it } from 'vitest'
import type { GameNumber } from '../database/models/game.model'
import {
  MumbleVerificationMethod,
  PlayerRole,
  type PlayerModel,
} from '../database/models/player.model'
import { mergePlayers } from './merge-players'

function player(overrides: Partial<PlayerModel>): PlayerModel {
  return {
    name: 'player',
    steamId: '1',
    joinedAt: new Date('2024-01-01'),
    roles: [],
    hasAcceptedRules: false,
    cooldownLevel: 0,
    preferences: {},
    stats: { totalGames: 0, gamesByClass: {} },
    ...overrides,
  } as PlayerModel
}

const numberMap = new Map([[3, 103 as GameNumber]])

function certificate(hash: string): NonNullable<PlayerModel['mumbleCertificate']> {
  return { hash, boundAt: new Date('2024-01-01'), method: MumbleVerificationMethod.code }
}

describe('mergePlayers()', () => {
  it('adds players only on the incoming instance, without their roles', () => {
    const [added] = mergePlayers(
      [],
      [player({ steamId: '2', roles: [PlayerRole.admin] })],
      numberMap,
    )
    expect(added!.roles).toEqual([])
  })

  it('frees players only on the incoming instance from their last game', async () => {
    const [added] = mergePlayers(
      [],
      [player({ steamId: '2', activeGame: 3 as GameNumber })],
      numberMap,
    )
    expect(added).not.toHaveProperty('activeGame')
  })

  it("keeps the incoming player's Mumble certificate when the primary has none", () => {
    const [merged] = mergePlayers(
      [player({ steamId: '2' })],
      [player({ steamId: '2', mumbleCertificate: certificate('a') })],
      numberMap,
    )
    expect(merged!.mumbleCertificate?.hash).toBe('a')
  })

  it("keeps the primary's Mumble certificate over the incoming one", () => {
    const [merged] = mergePlayers(
      [player({ steamId: '2', mumbleCertificate: certificate('a') })],
      [player({ steamId: '2', mumbleCertificate: certificate('b') })],
      numberMap,
    )
    expect(merged!.mumbleCertificate?.hash).toBe('a')
  })

  it('drops an incoming Mumble certificate linked to another primary player', () => {
    const [added] = mergePlayers(
      [player({ steamId: '1', mumbleCertificate: certificate('a') })],
      [player({ steamId: '2', mumbleCertificate: certificate('a') })],
      numberMap,
    )
    expect(added).not.toHaveProperty('mumbleCertificate')
  })

  it("keeps the primary's identity and roles, and merges the rest", () => {
    const [merged] = mergePlayers(
      [
        player({
          name: 'primary',
          roles: [PlayerRole.admin],
          joinedAt: new Date('2024-06-01'),
          skill: { '6v6': { scout: 3 } },
          stats: { totalGames: 2, gamesByClass: { '6v6': { scout: 2 } } },
        }),
      ],
      [
        player({
          name: 'incoming',
          roles: [PlayerRole.superUser],
          joinedAt: new Date('2023-01-01'),
          cooldownLevel: 2,
          verified: true,
          skill: { '6v6': { scout: 9 }, '9v9': { spy: 4 } },
          stats: { totalGames: 3, gamesByClass: { '6v6': { scout: 1 }, '9v9': { spy: 2 } } },
          eloHistory: [
            { at: new Date(), gamemode: '9v9', elo: { spy: 1510 }, game: 3 as GameNumber },
          ],
          skillHistory: [
            {
              at: new Date(),
              gamemode: '9v9',
              skill: { spy: 4 },
              actor: '9',
              lastGame: 3 as GameNumber,
            },
          ],
        } as Partial<PlayerModel>),
      ],
      numberMap,
    )

    expect(merged).toMatchObject({
      name: 'primary',
      roles: [PlayerRole.admin],
      joinedAt: new Date('2023-01-01'),
      cooldownLevel: 2,
      verified: true,
      skill: { '6v6': { scout: 3 }, '9v9': { spy: 4 } },
      stats: { totalGames: 5, gamesByClass: { '6v6': { scout: 3 }, '9v9': { spy: 2 } } },
    })
    expect(merged!.eloHistory![0]!.game).toBe(103)
    expect(merged!.skillHistory![0]!.lastGame).toBe(103)
  })
})
