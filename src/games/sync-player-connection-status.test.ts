import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { secondsToMilliseconds } from 'date-fns'
import type { GameNumber } from '../database/models/game.model'
import { PlayerConnectionStatus } from '../database/models/game-slot.model'
import type { SteamId64 } from '../shared/types/steam-id-64'
import type { Rcon } from './rcon/with-rcon'
import { syncPlayerConnectionStatus } from './sync-player-connection-status'

const mockFindOne = vi.hoisted(() => vi.fn())
vi.mock('./find-one', () => ({
  findOne: mockFindOne,
}))

const mockSend = vi.hoisted(() => vi.fn())
const mockWithRcon = vi.hoisted(() => vi.fn())
vi.mock('./rcon/with-rcon', () => ({
  withRcon: mockWithRcon,
}))

const mockParseStatus = vi.hoisted(() => vi.fn())
vi.mock('./rcon/parse-status', () => ({
  parseStatus: mockParseStatus,
}))

const mockUpdate = vi.hoisted(() => vi.fn())
vi.mock('./update', () => ({
  update: mockUpdate,
}))

const mockEmit = vi.hoisted(() => vi.fn())
vi.mock('../events', () => ({
  events: { emit: mockEmit },
}))

vi.mock('../logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn() },
}))

const player1 = 'PLAYER_1' as SteamId64
const player2 = 'PLAYER_2' as SteamId64

// A fresh game number per test keeps the module-level throttle/memoize cache
// (keyed by game number) from leaking state between tests.
let nextGameNumber = 1
function newGameNumber(): GameNumber {
  return nextGameNumber++ as GameNumber
}

function slot(player: SteamId64, connectionStatus: PlayerConnectionStatus) {
  return { player, connectionStatus }
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.clearAllMocks()
  mockWithRcon.mockImplementation(
    async (_game: unknown, callback: (args: { rcon: Rcon }) => Promise<unknown>) =>
      callback({ rcon: { send: mockSend } }),
  )
  mockSend.mockResolvedValue('FAKE_STATUS')
  mockParseStatus.mockReturnValue([])
  mockUpdate.mockResolvedValue({ number: 0 })
})

afterEach(() => {
  vi.useRealTimers()
})

it('marks a player as connected when on the server but not yet marked connected', async () => {
  const number = newGameNumber()
  mockFindOne.mockResolvedValue({
    number,
    gameServer: { name: 'FAKE_SERVER' },
    slots: [slot(player1, PlayerConnectionStatus.offline)],
  })
  mockParseStatus.mockReturnValue([{ steamId: player1 }])

  await syncPlayerConnectionStatus(number)

  expect(mockUpdate).toHaveBeenCalledWith(
    number,
    { $set: { 'slots.$[element].connectionStatus': PlayerConnectionStatus.connected } },
    { arrayFilters: [{ 'element.player': { $eq: player1 } }] },
  )
  expect(mockEmit).toHaveBeenCalledWith(
    'game:playerConnectionStatusUpdated',
    expect.objectContaining({
      player: player1,
      playerConnectionStatus: PlayerConnectionStatus.connected,
    }),
  )
})

it('marks a player as offline when not on the server but not yet marked offline', async () => {
  const number = newGameNumber()
  mockFindOne.mockResolvedValue({
    number,
    gameServer: { name: 'FAKE_SERVER' },
    slots: [slot(player1, PlayerConnectionStatus.connected)],
  })
  mockParseStatus.mockReturnValue([])

  await syncPlayerConnectionStatus(number)

  expect(mockUpdate).toHaveBeenCalledWith(
    number,
    { $set: { 'slots.$[element].connectionStatus': PlayerConnectionStatus.offline } },
    { arrayFilters: [{ 'element.player': { $eq: player1 } }] },
  )
  expect(mockEmit).toHaveBeenCalledWith(
    'game:playerConnectionStatusUpdated',
    expect.objectContaining({
      player: player1,
      playerConnectionStatus: PlayerConnectionStatus.offline,
    }),
  )
})

it('does nothing when the stored status already matches the server', async () => {
  const number = newGameNumber()
  mockFindOne.mockResolvedValue({
    number,
    gameServer: { name: 'FAKE_SERVER' },
    slots: [
      slot(player1, PlayerConnectionStatus.connected),
      slot(player2, PlayerConnectionStatus.offline),
    ],
  })
  mockParseStatus.mockReturnValue([{ steamId: player1 }])

  await syncPlayerConnectionStatus(number)

  expect(mockUpdate).not.toHaveBeenCalled()
  expect(mockEmit).not.toHaveBeenCalled()
})

it('reconciles multiple slots with mixed states in a single call', async () => {
  const number = newGameNumber()
  mockFindOne.mockResolvedValue({
    number,
    gameServer: { name: 'FAKE_SERVER' },
    slots: [
      slot(player1, PlayerConnectionStatus.offline),
      slot(player2, PlayerConnectionStatus.connected),
    ],
  })
  mockParseStatus.mockReturnValue([{ steamId: player1 }])

  await syncPlayerConnectionStatus(number)

  expect(mockUpdate).toHaveBeenCalledTimes(2)
  expect(mockEmit).toHaveBeenCalledWith(
    'game:playerConnectionStatusUpdated',
    expect.objectContaining({
      player: player1,
      playerConnectionStatus: PlayerConnectionStatus.connected,
    }),
  )
  expect(mockEmit).toHaveBeenCalledWith(
    'game:playerConnectionStatusUpdated',
    expect.objectContaining({
      player: player2,
      playerConnectionStatus: PlayerConnectionStatus.offline,
    }),
  )
})

it('swallows rcon failures without throwing', async () => {
  const number = newGameNumber()
  mockFindOne.mockResolvedValue({
    number,
    gameServer: { name: 'FAKE_SERVER' },
    slots: [slot(player1, PlayerConnectionStatus.offline)],
  })
  mockWithRcon.mockRejectedValue(new Error('rcon unreachable'))

  await expect(syncPlayerConnectionStatus(number)).resolves.toBeUndefined()
  expect(mockUpdate).not.toHaveBeenCalled()
})

it('throttles repeated syncs of the same game and runs again after the window elapses', async () => {
  const number = newGameNumber()
  mockFindOne.mockResolvedValue({
    number,
    gameServer: { name: 'FAKE_SERVER' },
    slots: [slot(player1, PlayerConnectionStatus.connected)],
  })
  mockParseStatus.mockReturnValue([{ steamId: player1 }])

  await syncPlayerConnectionStatus(number)
  await syncPlayerConnectionStatus(number)
  expect(mockWithRcon).toHaveBeenCalledTimes(1)

  vi.advanceTimersByTime(secondsToMilliseconds(30))

  await syncPlayerConnectionStatus(number)
  expect(mockWithRcon).toHaveBeenCalledTimes(2)
})
