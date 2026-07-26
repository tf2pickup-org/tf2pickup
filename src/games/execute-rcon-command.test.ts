import { beforeEach, expect, it, vi } from 'vitest'
import { GameState } from '../database/models/game.model'
import type { GameNumber } from '../database/models/game.model'
import { executeRconCommand } from './execute-rcon-command'
import type { SteamId64 } from '../shared/types/steam-id-64'

const mockFindOne = vi.hoisted(() => vi.fn())
vi.mock('../database/collections', () => ({
  collections: {
    games: {
      findOne: mockFindOne,
    },
  },
}))

const mockSend = vi.hoisted(() => vi.fn())
vi.mock('./rcon/with-rcon', () => ({
  withRcon: vi.fn(async (_game, callback) => await callback({ rcon: { send: mockSend } })),
}))

const mockRecord = vi.hoisted(() => vi.fn())
vi.mock('../activity-log', () => ({
  activityLog: { record: mockRecord },
}))

vi.mock('../logger', () => ({
  logger: { info: vi.fn(), error: vi.fn() },
}))

vi.mock('../errors', () => ({
  errors: {
    notFound: (msg: string) => new Error(msg),
    badRequest: (msg: string) => new Error(msg),
  },
}))

const actor = 'FAKE_ACTOR' as SteamId64
const number = 1 as GameNumber

beforeEach(() => {
  vi.clearAllMocks()
  mockFindOne.mockResolvedValue({
    number,
    state: GameState.started,
    gameServer: { name: 'FAKE_SERVER' },
  })
  mockSend.mockResolvedValue('FAKE_RESPONSE')
})

it('sends the command over rcon and returns the response', async () => {
  const response = await executeRconCommand(number, 'status', actor)
  expect(mockSend).toHaveBeenCalledWith('status')
  expect(response).toBe('FAKE_RESPONSE')
})

it('records the command in the activity log', async () => {
  await executeRconCommand(number, 'status', actor)
  expect(mockRecord).toHaveBeenCalledWith({
    type: 'rcon command executed',
    gameNumber: number,
    command: 'status',
    actor,
  })
})

it('throws when the game does not exist', async () => {
  mockFindOne.mockResolvedValue(null)
  await expect(executeRconCommand(number, 'status', actor)).rejects.toThrow()
  expect(mockSend).not.toHaveBeenCalled()
})

it('throws when the game is over', async () => {
  mockFindOne.mockResolvedValue({ number, state: GameState.ended, gameServer: { name: 'x' } })
  await expect(executeRconCommand(number, 'status', actor)).rejects.toThrow()
  expect(mockSend).not.toHaveBeenCalled()
})

it('throws when no game server is assigned', async () => {
  mockFindOne.mockResolvedValue({ number, state: GameState.started })
  await expect(executeRconCommand(number, 'status', actor)).rejects.toThrow()
  expect(mockSend).not.toHaveBeenCalled()
})
