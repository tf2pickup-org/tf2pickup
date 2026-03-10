import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('fastify-plugin', () => ({
  default: <T>(fn: T): T => fn,
}))

vi.mock('../../events', () => ({
  events: {
    on: vi.fn(),
  },
}))

vi.mock('../../database/collections', () => ({
  collections: {
    stats: { updateOne: vi.fn() },
  },
}))

vi.mock('../../utils/safe', () => ({
  safe: <T>(fn: T): T => fn,
}))

import { events } from '../../events'
import { collections } from '../../database/collections'
import plugin from './update-game-stats'
import { GameState, type GameModel } from '../../database/models/game.model'
import { GameEventType } from '../../database/models/game-event.model'

describe('update-game-stats', () => {
  let gameEndedHandler: (params: { game: GameModel }) => Promise<void>

  beforeEach(async () => {
    vi.resetAllMocks()
    vi.mocked(collections.stats.updateOne).mockResolvedValue({} as never)
    await (plugin as unknown as () => Promise<void>)()
    const call = vi
      .mocked(events.on)
      .mock.calls.find(([event]: [string, ...unknown[]]) => event === 'game:ended')
    expect(call, 'plugin must register a game:ended handler').toBeDefined()
    gameEndedHandler = call![1] as typeof gameEndedHandler
  })

  it('increments totalDurationMs by game duration for ended games', async () => {
    const startedAt = new Date('2024-01-01T10:00:00Z')
    const endedAt = new Date('2024-01-01T11:00:00Z') // 3_600_000 ms

    const game = {
      state: GameState.ended,
      events: [
        { event: GameEventType.gameCreated, at: new Date('2024-01-01T09:50:00Z') },
        { event: GameEventType.gameStarted, at: startedAt },
        { event: GameEventType.gameEnded, at: endedAt, reason: 'match ended' },
      ],
    } as unknown as GameModel

    await gameEndedHandler({ game })

    expect(collections.stats.updateOne).toHaveBeenCalledWith(
      { _id: 'total' },
      { $inc: { totalDurationMs: 3_600_000 } },
      { upsert: true },
    )
  })

  it('ignores interrupted games', async () => {
    const game = {
      state: GameState.interrupted,
      events: [],
    } as unknown as GameModel

    await gameEndedHandler({ game })

    expect(collections.stats.updateOne).not.toHaveBeenCalled()
  })

  it('skips games without a gameStarted event', async () => {
    const game = {
      state: GameState.ended,
      events: [{ event: GameEventType.gameEnded, at: new Date(), reason: 'match ended' }],
    } as unknown as GameModel

    await gameEndedHandler({ game })

    expect(collections.stats.updateOne).not.toHaveBeenCalled()
  })

  it('skips games without a gameEnded event', async () => {
    const game = {
      state: GameState.ended,
      events: [{ event: GameEventType.gameStarted, at: new Date() }],
    } as unknown as GameModel

    await gameEndedHandler({ game })

    expect(collections.stats.updateOne).not.toHaveBeenCalled()
  })
})
