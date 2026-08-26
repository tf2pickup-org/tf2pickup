import { beforeEach, expect, it, vi } from 'vitest'
import { GameState, type GameModel } from '../database/models/game.model'
import type { SteamId64 } from '../shared/types/steam-id-64'
import { recordGameOutcome } from './record-game-outcome'

const mockFindOne = vi.hoisted(() => vi.fn())
vi.mock('../database/collections', () => ({
  collections: { players: { findOne: mockFindOne } },
}))

const mockPlayersUpdate = vi.hoisted(() => vi.fn())
vi.mock('../players', () => ({ players: { update: mockPlayersUpdate } }))

const mockCalculateEloUpdates = vi.hoisted(() => vi.fn())
vi.mock('./calculate-elo-updates', () => ({
  calculateEloUpdates: mockCalculateEloUpdates,
  defaultElo: 1500,
}))

const p1 = 'P1' as SteamId64
const p2 = 'P2' as SteamId64

function endedGame(): GameModel {
  return {
    number: 5,
    state: GameState.ended,
    slots: [
      { player: p1, gameClass: 'scout' },
      { player: p2, gameClass: 'soldier' },
    ],
  } as unknown as GameModel
}

beforeEach(() => {
  vi.clearAllMocks()
  mockFindOne.mockResolvedValue({ elo: { scout: 1500 }, stats: { gamesByClass: { scout: 9 } } })
  mockPlayersUpdate.mockResolvedValue({} as never)
  mockCalculateEloUpdates.mockReturnValue([
    { steamId: p1, gameClass: 'scout', newElo: 1520, at: new Date('2026-01-01'), game: 5 },
  ])
})

it('reads counts and persists ELO before incrementing stats', async () => {
  const order: string[] = []
  mockFindOne.mockImplementation(async () => {
    order.push('read')
    return { elo: { scout: 1500 }, stats: { gamesByClass: { scout: 9 } } }
  })
  mockPlayersUpdate.mockImplementation(async (_steamId: SteamId64, update: unknown) => {
    order.push(typeof update === 'function' ? 'elo' : 'stats')
    return {}
  })

  await recordGameOutcome(endedGame())

  const lastRead = order.lastIndexOf('read')
  const firstStats = order.indexOf('stats')
  const eloIdx = order.indexOf('elo')

  expect(firstStats).toBeGreaterThan(-1)
  expect(eloIdx).toBeGreaterThan(-1)
  // the race fix: every gamesByClass read happens before any stats increment
  expect(lastRead).toBeLessThan(firstStats)
  // ELO is persisted before stats are incremented
  expect(eloIdx).toBeLessThan(firstStats)
})

it('increments totalGames and gamesByClass once per slot', async () => {
  await recordGameOutcome(endedGame())

  expect(mockPlayersUpdate).toHaveBeenCalledWith(p1, {
    $inc: { 'stats.totalGames': 1, 'stats.gamesByClass.scout': 1 },
  })
  expect(mockPlayersUpdate).toHaveBeenCalledWith(p2, {
    $inc: { 'stats.totalGames': 1, 'stats.gamesByClass.soldier': 1 },
  })
})

it('is a no-op for a game that did not end normally', async () => {
  const interrupted = { ...endedGame(), state: GameState.interrupted } as GameModel

  await recordGameOutcome(interrupted)

  expect(mockFindOne).not.toHaveBeenCalled()
  expect(mockCalculateEloUpdates).not.toHaveBeenCalled()
  expect(mockPlayersUpdate).not.toHaveBeenCalled()
})
