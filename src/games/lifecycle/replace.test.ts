import { beforeEach, expect, it, vi } from 'vitest'
import { GameState, type GameModel, type GameNumber } from '../../database/models/game.model'
import { SlotStatus } from '../../database/models/game-slot.model'
import type { SteamId64 } from '../../shared/types/steam-id-64'
import { replace } from './replace'
import { runningGameStates } from './running-game-states'

const mockGamesFindOne = vi.hoisted(() => vi.fn())
const mockPlayersFindOne = vi.hoisted(() => vi.fn())
const mockDeleteOne = vi.hoisted(() => vi.fn())
vi.mock('../../database/collections', () => ({
  collections: {
    games: { findOne: mockGamesFindOne },
    players: { findOne: mockPlayersFindOne },
    gamesSubstituteRequests: { deleteOne: mockDeleteOne },
  },
}))

const mockApplyTransition = vi.hoisted(() => vi.fn())
vi.mock('./apply-transition', () => ({ applyTransition: mockApplyTransition }))

const mockUpdate = vi.hoisted(() => vi.fn())
vi.mock('../update', () => ({ update: mockUpdate }))

const mockEmit = vi.hoisted(() => vi.fn())
vi.mock('../../events', () => ({ events: { emit: mockEmit } }))

const mockPlayersUpdate = vi.hoisted(() => vi.fn())
vi.mock('../../players', () => ({ players: { update: mockPlayersUpdate } }))

const mockKick = vi.hoisted(() => vi.fn())
vi.mock('../../queues', () => ({ queues: { kick: mockKick } }))

const mockApplyCooldown = vi.hoisted(() => vi.fn())
vi.mock('../apply-cooldown', () => ({ applyCooldown: mockApplyCooldown }))

const mockCalculateJoinGameserverTimeout = vi.hoisted(() => vi.fn())
vi.mock('../calculate-join-gameserver-timeout', () => ({
  calculateJoinGameserverTimeout: mockCalculateJoinGameserverTimeout,
}))

const mockLogError = vi.hoisted(() => vi.fn())
vi.mock('../../utils/log-error', () => ({ logError: mockLogError }))

vi.mock('../../logger', () => ({ logger: { trace: vi.fn() } }))

const number = 42 as GameNumber
const replacee = 'REPLACEE' as SteamId64
const replacement = 'REPLACEMENT' as SteamId64
const slotId = 1

function game(overrides: Partial<GameModel> = {}): GameModel {
  return {
    number,
    state: GameState.started,
    slots: [
      { id: slotId, player: replacee, status: SlotStatus.waitingForSubstitute, gameClass: 'scout' },
    ],
    ...overrides,
  } as unknown as GameModel
}

const newGame = { number, tag: 'newGame' } as unknown as GameModel
const updatedGame = { number, tag: 'updatedGame' } as unknown as GameModel

beforeEach(() => {
  vi.clearAllMocks()
  mockGamesFindOne.mockResolvedValue(game())
  mockPlayersFindOne.mockResolvedValue({ steamId: replacement, activeGame: undefined, bans: [] })
  mockApplyTransition.mockResolvedValue(newGame)
  mockUpdate.mockResolvedValue(updatedGame)
  mockCalculateJoinGameserverTimeout.mockResolvedValue(new Date('2026-01-01T00:00:00Z'))
})

it('commits the whole substitution transition and returns the updated game', async () => {
  const result = await replace({ number, replacee, replacement })

  // the replacement itself
  expect(mockApplyTransition).toHaveBeenCalledWith(
    'replace',
    number,
    runningGameStates,
    expect.objectContaining({
      $set: expect.objectContaining({ 'slots.$[slot].player': replacement }),
    }),
    expect.anything(),
  )
  expect(mockDeleteOne).toHaveBeenCalledWith({ gameNumber: number, slotId })

  // activeGame moved from replacee to replacement
  expect(mockPlayersUpdate).toHaveBeenCalledWith(replacement, { $set: { activeGame: number } })
  expect(mockPlayersUpdate).toHaveBeenCalledWith(replacee, { $unset: { activeGame: 1 } })
  expect(mockPlayersUpdate.mock.invocationCallOrder[0]).toBeLessThan(
    mockApplyTransition.mock.invocationCallOrder[0]!,
  )

  // replacement leaves the queue
  expect(mockKick).toHaveBeenCalledWith(replacement)

  // shouldJoinBy written on the replacement's slot
  expect(mockUpdate).toHaveBeenCalledWith(
    number,
    expect.objectContaining({
      $set: expect.objectContaining({ 'slots.$[slot].shouldJoinBy': expect.any(Date) }),
    }),
    expect.anything(),
  )

  // exactly one notification, carrying the post-transition game
  expect(mockEmit).toHaveBeenCalledWith('game:playerReplaced', {
    game: updatedGame,
    replacee,
    replacement,
    slotId,
  })
  expect(
    mockEmit.mock.calls.filter(([e]: [string, ...unknown[]]) => e === 'game:playerReplaced'),
  ).toHaveLength(1)

  // the bug fix: returns the updated game, not the pre-update snapshot
  expect(result).toBe(updatedGame)
})

it('kicks the substitute from whatever queue they are in', async () => {
  await replace({ number, replacee, replacement })

  expect(mockKick).toHaveBeenCalledWith(replacement)
})

it('completes the substitution even when kicking from the queue fails', async () => {
  mockKick.mockRejectedValueOnce(new Error('invalid queue state'))

  const result = await replace({ number, replacee, replacement })

  expect(mockLogError).toHaveBeenCalled()
  expect(mockEmit).toHaveBeenCalledWith(
    'game:playerReplaced',
    expect.objectContaining({ replacee, replacement }),
  )
  expect(result).toBe(updatedGame)
})

it('skips the shouldJoinBy write when no timeout applies', async () => {
  mockCalculateJoinGameserverTimeout.mockResolvedValue(undefined)

  const result = await replace({ number, replacee, replacement })

  expect(mockUpdate).not.toHaveBeenCalled()
  expect(mockEmit).toHaveBeenCalledWith(
    'game:playerReplaced',
    expect.objectContaining({ game: newGame }),
  )
  expect(result).toBe(newGame)
})

it('releases the claimed seat and leaves the queue alone when the game is no longer running', async () => {
  mockApplyTransition.mockResolvedValue(undefined)

  const result = await replace({ number, replacee, replacement })

  expect(result).toBeUndefined()
  expect(mockDeleteOne).not.toHaveBeenCalled()
  expect(mockPlayersUpdate.mock.calls).toEqual([
    [replacement, { $set: { activeGame: number } }],
    [replacement, { $unset: { activeGame: 1 } }],
  ])
  expect(mockKick).not.toHaveBeenCalled()
  expect(mockEmit).not.toHaveBeenCalledWith('game:playerReplaced', expect.anything())
})

it('aborts the substitution when the replacement cannot be seated', async () => {
  mockPlayersUpdate.mockRejectedValueOnce(new Error('db down'))

  await expect(replace({ number, replacee, replacement })).rejects.toThrow('db down')
  expect(mockApplyTransition).not.toHaveBeenCalled()
  expect(mockEmit).not.toHaveBeenCalledWith('game:playerReplaced', expect.anything())
})

it('makes no occupancy writes when a player takes their own slot back', async () => {
  await replace({ number, replacee, replacement: replacee })

  expect(mockPlayersUpdate).not.toHaveBeenCalled()
})

it('refuses to take a slot nobody asked a substitute for', async () => {
  mockGamesFindOne.mockResolvedValue(
    game({
      slots: [{ id: slotId, player: replacee, status: SlotStatus.active, gameClass: 'scout' }],
    } as Partial<GameModel>),
  )

  await expect(replace({ number, replacee, replacement })).rejects.toThrow(
    'no substitute requested',
  )
  expect(mockApplyTransition).not.toHaveBeenCalled()
})

it.each([
  ['already in a game', { activeGame: 7 as GameNumber, bans: [] }, 'You are already in a game'],
  [
    'banned',
    {
      activeGame: undefined,
      bans: [{ actor: replacee, start: new Date(0), end: new Date(8.64e15), reason: 'griefing' }],
    },
    'You have active bans',
  ],
])(
  'rejects a substitute who is %s with a 400 carrying the slot lock reason',
  async (_, player, reason) => {
    mockPlayersFindOne.mockResolvedValue({ steamId: replacement, ...player })

    await expect(replace({ number, replacee, replacement })).rejects.toMatchObject({
      statusCode: 400,
      message: reason,
    })
    expect(mockApplyTransition).not.toHaveBeenCalled()
  },
)

it('finishes one replacement before the next one starts', async () => {
  let releaseKick!: () => void
  mockKick.mockImplementationOnce(
    async () =>
      await new Promise<void>(resolve => {
        releaseKick = resolve
      }),
  )
  const next = 'NEXT' as SteamId64

  const first = replace({ number, replacee, replacement })
  await vi.waitFor(() => expect(mockKick).toHaveBeenCalledTimes(1))
  const second = replace({ number, replacee, replacement: next })
  await new Promise(resolve => setImmediate(resolve))
  expect(mockApplyTransition).toHaveBeenCalledTimes(1)

  releaseKick()
  await Promise.all([first, second])

  const replaced = mockEmit.mock.calls
    .filter(([e]: [string, ...unknown[]]) => e === 'game:playerReplaced')
    .map(([, payload]: [string, { replacement: SteamId64 }]) => payload.replacement)
  expect(replaced).toEqual([replacement, next])
})
