import { beforeEach, describe, expect, it, vi } from 'vitest'
import { GameState, type GameNumber } from '../../database/models/game.model'
import { PlayerConnectionStatus, SlotStatus } from '../../database/models/game-slot.model'
import { GameEndedReason, GameEventType } from '../../database/models/game-event.model'
import type { SteamId64 } from '../../shared/types/steam-id-64'
import { gameLifecycle } from '.'

const store = vi.hoisted(() => ({ game: null as Record<string, unknown> | null }))

function matches(filter: Record<string, unknown>) {
  const game = store.game
  if (!game || filter['number'] !== game['number']) return false
  const state = filter['state'] as { $in?: GameState[] } | undefined
  return !state?.$in || state.$in.includes(game['state'] as GameState)
}

const mockFindOneAndUpdate = vi.hoisted(() => vi.fn())
const mockDeleteMany = vi.hoisted(() => vi.fn())
const mockInsertOne = vi.hoisted(() => vi.fn())
vi.mock('../../database/collections', () => ({
  collections: {
    games: {
      findOne: vi.fn(async (filter: Record<string, unknown>) =>
        matches(filter) ? { ...store.game } : null,
      ),
      findOneAndUpdate: mockFindOneAndUpdate.mockImplementation(
        async (filter: Record<string, unknown>, update: { $set?: Record<string, unknown> }) => {
          if (!matches(filter)) return null
          const state = update.$set?.['state']
          if (state) store.game = { ...store.game, state }
          return { ...store.game }
        },
      ),
    },
    gamesSubstituteRequests: { deleteMany: mockDeleteMany, insertOne: mockInsertOne },
    players: { findOne: vi.fn(async () => ({ bans: [] })) },
  },
}))

const mockEmit = vi.hoisted(() => vi.fn())
vi.mock('../../events', () => ({ events: { emit: mockEmit } }))

const mockRecord = vi.hoisted(() => vi.fn())
vi.mock('../../activity-log', () => ({ activityLog: { record: mockRecord } }))

vi.mock('../../logger', () => ({ logger: { info: vi.fn(), trace: vi.fn() } }))

const mockPlayersUpdate = vi.hoisted(() => vi.fn())
vi.mock('../../players', () => ({
  players: { update: mockPlayersUpdate, restrictions: { active: () => [] } },
}))
vi.mock('../../queues', () => ({ queues: { kick: vi.fn() } }))

const mockSchedule = vi.hoisted(() => vi.fn())
vi.mock('../../tasks', () => ({ tasks: { schedule: mockSchedule } }))
vi.mock('../../configuration', () => ({
  configuration: { get: vi.fn(async () => ({ scout: 5000 })) },
}))

const mockLogError = vi.hoisted(() => vi.fn())
vi.mock('../../utils/log-error', () => ({ logError: mockLogError }))

const number = 1 as GameNumber
const player = 'PLAYER' as SteamId64
const replacement = 'REPLACEMENT' as SteamId64

function given(state: GameState, slotStatus = SlotStatus.active) {
  store.game = {
    number,
    state,
    slots: [{ id: 1, player, status: slotStatus, gameClass: 'scout' }],
    events: [],
  }
}

function emitted(event: string) {
  return mockEmit.mock.calls.filter(([e]) => e === event)
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('interrupt', () => {
  it('ends a running game once', async () => {
    given(GameState.started)

    const game = await gameLifecycle.interrupt(number, 'bot', GameEndedReason.interrupted)

    expect(game?.state).toBe(GameState.interrupted)
    expect(mockDeleteMany).toHaveBeenCalledWith({ gameNumber: number })
    expect(emitted('game:ended')).toHaveLength(1)
    expect(mockRecord).toHaveBeenCalledWith(expect.objectContaining({ type: 'game force-ended' }))
  })

  it('leaves a game that has already ended alone', async () => {
    given(GameState.ended)

    const game = await gameLifecycle.interrupt(number, 'bot')

    expect(game).toBeUndefined()
    expect(store.game?.['state']).toBe(GameState.ended)
    expect(mockFindOneAndUpdate).not.toHaveBeenCalled()
    expect(mockDeleteMany).not.toHaveBeenCalled()
    expect(emitted('game:ended')).toHaveLength(0)
    expect(mockRecord).not.toHaveBeenCalled()
  })
})

describe('end', () => {
  it('ends a started game', async () => {
    given(GameState.started)

    expect((await gameLifecycle.end(number))?.state).toBe(GameState.ended)
    expect(emitted('game:ended')).toHaveLength(1)
  })

  it('schedules freeing every player before announcing the end', async () => {
    given(GameState.started)
    await gameLifecycle.end(number)

    expect(mockSchedule).toHaveBeenCalledExactlyOnceWith('games.freePlayer', 5000, { player })
    expect(mockSchedule.mock.invocationCallOrder[0]).toBeLessThan(
      mockEmit.mock.invocationCallOrder.at(-1)!,
    )
    expect(emitted('game:ended')).toHaveLength(1)
  })

  it('frees a substitute without the join cooldown', async () => {
    given(GameState.started)
    store.game!['events'] = [
      {
        event: GameEventType.playerReplaced,
        replacee: 'SOMEONE',
        replacement: player,
        gameClass: 'scout',
      },
    ]

    await gameLifecycle.end(number)

    expect(mockSchedule).toHaveBeenCalledExactlyOnceWith('games.freePlayer', 0, { player })
  })

  it('still announces the end when scheduling the release fails', async () => {
    given(GameState.started)
    mockSchedule.mockRejectedValueOnce(new Error('db down'))

    await gameLifecycle.end(number)

    expect(mockLogError).toHaveBeenCalled()
    expect(emitted('game:ended')).toHaveLength(1)
  })

  it('ignores a repeated match end', async () => {
    given(GameState.started)
    await gameLifecycle.end(number)
    mockEmit.mockClear()

    expect(await gameLifecycle.end(number)).toBeUndefined()
    expect(emitted('game:ended')).toHaveLength(0)
  })
})

describe('start', () => {
  it('starts a launching game and ignores the repeats', async () => {
    given(GameState.launching)

    expect((await gameLifecycle.start(number))?.state).toBe(GameState.started)
    expect(await gameLifecycle.start(number)).toBeUndefined()
  })
})

describe('configure and launch', () => {
  it('reconfigures a game mid-match', async () => {
    given(GameState.started)

    expect((await gameLifecycle.configure(number, '123'))?.state).toBe(GameState.configuring)
  })

  it('does not revive a game interrupted while it was being configured', async () => {
    given(GameState.interrupted)

    const game = await gameLifecycle.launch(number, { connectString: 'a', stvConnectString: 'b' })

    expect(game).toBeUndefined()
    expect(store.game?.['state']).toBe(GameState.interrupted)
    expect(emitted('game:gameServerInitialized')).toHaveLength(0)
  })
})

describe('setConnection', () => {
  it('ignores players leaving after the game is over', async () => {
    given(GameState.ended)

    expect(
      await gameLifecycle.setConnection(number, player, PlayerConnectionStatus.offline),
    ).toBeUndefined()
    expect(emitted('game:playerConnectionStatusUpdated')).toHaveLength(0)
  })
})

describe('substitutes', () => {
  it('does not open a substitute request for a finished game', async () => {
    given(GameState.interrupted)

    const game = await gameLifecycle.requestSubstitute({ number, replacee: player, actor: 'bot' })

    expect(game).toBeUndefined()
    expect(mockInsertOne).not.toHaveBeenCalled()
    expect(emitted('game:substituteRequested')).toHaveLength(0)
  })

  it('does not seat a replacement in a game interrupted before the replacement landed', async () => {
    given(GameState.started, SlotStatus.waitingForSubstitute)
    await gameLifecycle.interrupt(number, 'bot')
    mockEmit.mockClear()

    const game = await gameLifecycle.replace({ number, replacee: player, replacement })

    expect(game).toBeUndefined()
    expect(mockPlayersUpdate).not.toHaveBeenCalled()
    expect(emitted('game:playerReplaced')).toHaveLength(0)
  })
})

describe('locking', () => {
  it('serializes a replacement with a concurrent interrupt', async () => {
    given(GameState.started, SlotStatus.waitingForSubstitute)

    const [, replaced] = await Promise.all([
      gameLifecycle.interrupt(number, 'bot'),
      gameLifecycle.replace({ number, replacee: player, replacement }),
    ])

    expect(store.game?.['state']).toBe(GameState.interrupted)
    expect(replaced).toBeUndefined()
    expect(mockPlayersUpdate).not.toHaveBeenCalled()
  })
})
