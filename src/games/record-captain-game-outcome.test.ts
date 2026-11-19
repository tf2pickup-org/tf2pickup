import { beforeEach, expect, it, vi } from 'vitest'
import { GameEndedReason, GameEventType } from '../database/models/game-event.model'
import { GameState, type GameModel } from '../database/models/game.model'
import type { PlayerModel } from '../database/models/player.model'
import { SlotStatus } from '../database/models/game-slot.model'
import { minutesToMilliseconds } from 'date-fns'
import type { SteamId64 } from '../shared/types/steam-id-64'
import { recordGameOutcome } from './record-game-outcome'

const mocks = vi.hoisted(() => ({ find: vi.fn(), update: vi.fn(), findOne: vi.fn() }))
vi.mock('../database/collections', () => ({
  collections: { players: { find: mocks.find, findOne: mocks.findOne } },
}))
vi.mock('../players', () => ({ players: { update: mocks.update } }))
const at = new Date('2026-01-01')
const endedAt = new Date(at.getTime() + minutesToMilliseconds(60))
const match = {
  number: 7,
  gamemode: '6v6',
  launchMode: 'captain',
  captains: { red: 'red', blu: 'blu' },
  state: GameState.ended,
  score: { red: 3, blu: 0 },
  slots: [
    { player: 'red', team: 'red', gameClass: 'scout', status: SlotStatus.active },
    { player: 'blu', team: 'blu', gameClass: 'scout', status: SlotStatus.active },
  ],
  events: [
    { event: GameEventType.gameCreated, at },
    { event: GameEventType.gameStarted, at },
    { event: GameEventType.gameEnded, at: endedAt, reason: GameEndedReason.matchEnded },
  ],
} as unknown as GameModel

beforeEach(() => {
  vi.clearAllMocks()
  mocks.find.mockReturnValue({ toArray: async () => [] })
  mocks.findOne.mockResolvedValue({ elo: { '6v6': { scout: 1500 } }, stats: { gamesByClass: {} } })
  mocks.update.mockResolvedValue({})
})

it('records a finished captain game separately, before incrementing shared stats', async () => {
  await recordGameOutcome(match)
  expect(mocks.findOne).not.toHaveBeenCalled()
  expect(mocks.find).toHaveBeenCalledTimes(1)
  const calls = mocks.update.mock.calls
  expect(calls).toHaveLength(4)
  const before = {
    captainModeElo: { '6v6': { classes: { medic: 1600 } } },
    elo: { '6v6': { scout: 1900 } },
  } as PlayerModel
  const update = calls[0]![1](before)
  expect(update).toEqual({
    $set: {
      'captainModeElo.6v6': { classes: { medic: 1600, scout: 1516 }, overall: 1516, captain: 1516 },
    },
    $push: {
      eloHistory: {
        at: endedAt,
        game: 7,
        gamemode: '6v6',
        launchMode: 'captain',
        elo: { scout: 1516 },
        overall: 1516,
        captain: 1516,
      },
    },
  })
  expect(calls[2]![1]).toEqual({
    $inc: { 'stats.totalGames': 1, 'stats.gamesByClass.6v6.scout': 1 },
  })
})

it('leaves auto persistence unchanged and never reads captain ratings', async () => {
  const auto = { ...match }
  delete auto.launchMode
  delete auto.captains
  await recordGameOutcome(auto)
  expect(mocks.find).not.toHaveBeenCalled()
  const before = { elo: { '6v6': { medic: 1600 } } } as PlayerModel
  expect(mocks.update.mock.calls[0]![1](before)).toEqual({
    $set: { 'elo.6v6': { medic: 1600, scout: 1516 } },
    $push: { eloHistory: { at: endedAt, game: 7, gamemode: '6v6', elo: { scout: 1516 } } },
  })
})

it('fetches original captains even when their slots belong to substitutes', async () => {
  await recordGameOutcome({
    ...match,
    slots: match.slots.map(slot => ({ ...slot, player: `sub-${slot.player}` as SteamId64 })),
  })
  expect(mocks.find.mock.calls[0]![0]).toEqual({
    steamId: { $in: ['sub-red', 'sub-blu', 'red', 'blu'] },
  })
  expect(mocks.update.mock.calls.map(call => call[0])).toContain('red')
})
