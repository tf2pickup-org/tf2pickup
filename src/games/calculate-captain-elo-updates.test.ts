import { describe, expect, it } from 'vitest'
import { minutesToMilliseconds } from 'date-fns'
import type { PlayerModel } from '../database/models/player.model'
import { GameState, type GameModel, type GameNumber } from '../database/models/game.model'
import { GameEndedReason, GameEventType } from '../database/models/game-event.model'
import { SlotStatus } from '../database/models/game-slot.model'
import { Tf2ClassName } from '../shared/types/tf2-class-name'
import { Tf2Team } from '../shared/types/tf2-team'
import { Gamemode } from '../shared/types/gamemode'
import type { SteamId64 } from '../shared/types/steam-id-64'
import { calculateCaptainEloUpdates } from './calculate-captain-elo-updates'

const red = 'red' as SteamId64
const blu = 'blu' as SteamId64
const enemy = 'enemy' as SteamId64
const startedAt = new Date('2026-01-01T10:00:00Z')
const endedAt = new Date(startedAt.getTime() + minutesToMilliseconds(60))

function game(): GameModel {
  return {
    number: 1,
    gamemode: Gamemode.sixes,
    launchMode: 'captain',
    captains: { red, blu },
    state: GameState.ended,
    score: { red: 3, blu: 0 },
    events: [
      { event: GameEventType.gameCreated, at: startedAt },
      { event: GameEventType.gameStarted, at: startedAt },
      { event: GameEventType.gameEnded, at: endedAt, reason: GameEndedReason.matchEnded },
    ],
    slots: [
      { player: red, team: Tf2Team.red, gameClass: Tf2ClassName.scout, status: SlotStatus.active },
      { player: blu, team: Tf2Team.blu, gameClass: Tf2ClassName.scout, status: SlotStatus.active },
      {
        player: enemy,
        team: Tf2Team.blu,
        gameClass: Tf2ClassName.soldier,
        status: SlotStatus.active,
      },
    ],
  } as unknown as GameModel
}

function history(
  count: number,
  fields: Partial<NonNullable<PlayerModel['eloHistory']>[number]> = {},
): NonNullable<PlayerModel['eloHistory']> {
  return Array.from({ length: count }, () => ({
    at: startedAt,
    game: 0 as GameNumber,
    gamemode: Gamemode.sixes,
    launchMode: 'captain' as const,
    elo: { scout: 1500 },
    ...fields,
  }))
}

describe('captain Elo ladders', () => {
  it('defaults all three ladders to 1500 and rates only captains on the captain ladder', () => {
    const updates = calculateCaptainEloUpdates(game(), new Map())
    expect(updates.find(u => u.steamId === red)?.history).toEqual({
      at: endedAt,
      game: 1,
      gamemode: Gamemode.sixes,
      launchMode: 'captain',
      elo: { scout: 1516 },
      overall: 1516,
      captain: 1516,
    })
    expect(updates.find(u => u.steamId === blu)?.history.captain).toBe(1484)
    expect(updates.find(u => u.steamId === enemy)?.history).toMatchObject({
      elo: { soldier: 1484 },
      overall: 1484,
    })
    expect(updates.find(u => u.steamId === enemy)?.history).not.toHaveProperty('captain')
  })

  it('compares classes against mirrors, overall against all eligible enemies, and captains against each other', () => {
    const updates = calculateCaptainEloUpdates(
      game(),
      new Map([
        [
          blu,
          { captainModeElo: { '6v6': { classes: { scout: 1400 }, overall: 1400, captain: 1600 } } },
        ],
        [enemy, { captainModeElo: { '6v6': { classes: { soldier: 2000 }, overall: 1800 } } }],
      ]),
    )
    expect(updates.find(u => u.steamId === red)?.history).toMatchObject({
      elo: { scout: 1512 },
      overall: 1520,
      captain: 1520,
    })
  })

  it.each([
    ['class', history(10), 1508, 1516, 1516],
    ['overall', history(10, { elo: { soldier: 1500 }, overall: 1500 }), 1516, 1508, 1516],
    ['captain', history(10, { elo: {}, captain: 1500 }), 1516, 1516, 1508],
    ['provisional', history(9, { captain: 1500 }), 1516, 1516, 1516],
    [
      'other mode',
      history(10, { captain: 1500 }).map(entry => {
        delete entry.launchMode
        return entry
      }),
      1516,
      1516,
      1516,
    ],
    [
      'other gamemode',
      history(10, { gamemode: Gamemode.highlander, captain: 1500 }),
      1516,
      1516,
      1516,
    ],
  ])('counts only rated games for %s', (_label, eloHistory, scout, overall, captain) => {
    const updates = calculateCaptainEloUpdates(game(), new Map([[red, { eloHistory }]]))
    expect(updates.find(u => u.steamId === red)?.history).toMatchObject({
      elo: { scout },
      overall,
      captain,
    })
  })

  it('uses all eligible class enemies when no mirror exists, excluding ineligible enemies from overall', () => {
    const match = game()
    match.slots[0]!.gameClass = Tf2ClassName.medic
    match.slots[2]!.status = SlotStatus.waitingForSubstitute
    const updates = calculateCaptainEloUpdates(
      match,
      new Map([
        [blu, { captainModeElo: { '6v6': { classes: { scout: 1400 }, overall: 1400 } } }],
        [enemy, { captainModeElo: { '6v6': { classes: { soldier: 2000 }, overall: 2000 } } }],
      ]),
    )
    expect(updates.find(u => u.steamId === red)?.history).toMatchObject({
      elo: { medic: 1512 },
      overall: 1512,
    })
    expect(updates.find(u => u.steamId === enemy)).toBeUndefined()
  })

  it('preserves all three ratings in an equally matched draw', () => {
    const updates = calculateCaptainEloUpdates({ ...game(), score: { red: 2, blu: 2 } }, new Map())
    expect(updates.find(u => u.steamId === red)?.history).toMatchObject({
      elo: { scout: 1500 },
      overall: 1500,
      captain: 1500,
    })
  })

  it('rates a captain below the play-time threshold without class or overall updates', () => {
    const match = game()
    match.slots[0]!.status = SlotStatus.waitingForSubstitute
    const updates = calculateCaptainEloUpdates(match, new Map())
    expect(updates.find(u => u.steamId === red)?.history).toMatchObject({ elo: {}, captain: 1516 })
    expect(updates.find(u => u.steamId === red)?.history).not.toHaveProperty('overall')
  })

  it('rates the original captain after a substitution, without rating the substitute as captain', () => {
    const match = game()
    match.slots[0]!.player = 'substitute' as SteamId64
    const updates = calculateCaptainEloUpdates(match, new Map())
    expect(updates.find(u => u.steamId === red)?.history).toMatchObject({ elo: {}, captain: 1516 })
    expect(updates.find(u => u.steamId === red)?.history).not.toHaveProperty('overall')
    expect(updates.find(u => u.steamId === 'substitute')?.history).not.toHaveProperty('captain')
  })

  it('does not rate an auto or interrupted game', () => {
    const match = game()
    delete match.launchMode
    expect(calculateCaptainEloUpdates(match, new Map())).toEqual([])
    expect(
      calculateCaptainEloUpdates({ ...game(), state: GameState.interrupted }, new Map()),
    ).toEqual([])
  })
})
