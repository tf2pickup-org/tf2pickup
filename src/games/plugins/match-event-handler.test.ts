import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('fastify-plugin', () => ({
  default: <T>(fn: T): T => fn,
}))

vi.mock('../../events', () => ({
  events: {
    on: vi.fn(),
    emit: vi.fn(),
  },
}))

vi.mock('../update', () => ({
  update: vi.fn(),
}))

vi.mock('../../utils/safe', () => ({
  safe: <T>(fn: T): T => fn,
}))

vi.mock('../../database/collections', () => ({
  collections: {
    games: {
      findOne: vi.fn(),
    },
  },
}))

import { events } from '../../events'
import { update } from '../update'
import { collections } from '../../database/collections'
import { GameState } from '../../database/models/game.model'
import { GameEventType } from '../../database/models/game-event.model'
import { Tf2Team } from '../../shared/types/tf2-team'
import plugin from './match-event-handler'
import type { GameNumber } from '../../database/models/game.model'

const gameNumber = 7615 as GameNumber

describe('match-event-handler', () => {
  let scoreResetHandler: (params: { gameNumber: GameNumber }) => Promise<void>

  beforeEach(async () => {
    vi.clearAllMocks()
    await (plugin as unknown as () => Promise<void>)()

    const call = vi
      .mocked(events.on)
      .mock.calls.find(([event]: [string, ...unknown[]]) => event === 'match/score:reset')
    scoreResetHandler = call![1] as typeof scoreResetHandler
  })

  it('zeroes the score and records the restart for a started game', async () => {
    vi.mocked(collections.games.findOne).mockResolvedValue({
      state: GameState.started,
    } as never)
    const updated = { number: gameNumber } as never
    vi.mocked(update).mockResolvedValue(updated)

    await scoreResetHandler({ gameNumber })

    expect(update).toHaveBeenCalledWith(
      { number: gameNumber, state: GameState.started },
      expect.objectContaining({
        $set: { score: { [Tf2Team.blu]: 0, [Tf2Team.red]: 0 } },
        $push: {
          events: expect.objectContaining({ event: GameEventType.gameRestarted }),
        },
      }),
    )
    expect(events.emit).toHaveBeenCalledWith('game:restarted', { game: updated })
  })

  it('ignores the reset when the game is not started', async () => {
    vi.mocked(collections.games.findOne).mockResolvedValue({
      state: GameState.launching,
    } as never)

    await scoreResetHandler({ gameNumber })

    expect(update).not.toHaveBeenCalled()
    expect(events.emit).not.toHaveBeenCalled()
  })
})
