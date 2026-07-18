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

vi.mock('../../logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
  },
}))

vi.mock('../../database/collections', () => ({
  collections: {
    games: {
      findOne: vi.fn(),
    },
  },
}))

vi.mock('../../otel', () => ({
  meter: {
    createCounter: () => ({ add: vi.fn() }),
  },
}))

import { events } from '../../events'
import { collections } from '../../database/collections'
import plugin from './match-event-listener'

const gameNumber = 7615
const logSecret = '12345'

describe('match-event-listener', () => {
  let onGameLogMessage: (params: {
    message: { payload: string; password: string }
  }) => Promise<void>

  beforeEach(async () => {
    vi.clearAllMocks()
    vi.mocked(collections.games.findOne).mockResolvedValue({ number: gameNumber } as never)
    await (plugin as unknown as () => Promise<void>)()

    const call = vi
      .mocked(events.on)
      .mock.calls.find(([event]: [string, ...unknown[]]) => event === 'gamelog:message')
    onGameLogMessage = call![1] as typeof onGameLogMessage

    // reset the module-level round start tracking between tests
    await onGameLogMessage({
      message: {
        payload: '07/13/2026 - 00:00:00: World triggered "Game_Over" reason "test reset"',
        password: logSecret,
      },
    })
    vi.mocked(events.emit).mockClear()
  })

  const roundStart = (timestamp: string) => ({
    message: { payload: `${timestamp}: World triggered "Round_Start"`, password: logSecret },
  })

  it('emits match:started for a regular round start', async () => {
    await onGameLogMessage(roundStart('07/13/2026 - 17:44:53'))
    expect(events.emit).toHaveBeenCalledWith('match:started', { gameNumber })
    expect(events.emit).not.toHaveBeenCalledWith('match/score:reset', { gameNumber })
  })

  it('emits match/score:reset for a doubled round start mid-game', async () => {
    // the real sequence of https://tf2pickup.pl/games/7615: the round started
    // at 17:35:10 was aborted (everyone left to spectator) and the match was
    // restarted at 17:39:30
    await onGameLogMessage(roundStart('07/13/2026 - 17:35:10'))
    await onGameLogMessage(roundStart('07/13/2026 - 17:39:30'))
    await onGameLogMessage(roundStart('07/13/2026 - 17:39:30'))
    expect(events.emit).toHaveBeenCalledWith('match/score:reset', { gameNumber })
  })

  it('does not emit match/score:reset for the doubled round start at the initial match start', async () => {
    await onGameLogMessage(roundStart('07/13/2026 - 17:33:28'))
    await onGameLogMessage(roundStart('07/13/2026 - 17:33:28'))
    expect(events.emit).not.toHaveBeenCalledWith('match/score:reset', { gameNumber })
  })

  it('does not emit match/score:reset for round starts at different times', async () => {
    await onGameLogMessage(roundStart('07/13/2026 - 18:01:44'))
    await onGameLogMessage(roundStart('07/13/2026 - 18:07:40'))
    expect(events.emit).not.toHaveBeenCalledWith('match/score:reset', { gameNumber })
  })

  it('does not emit match/score:reset when a round ended in a stalemate in between', async () => {
    // stalemates end a round with no Round_Win line; in compressed-timestamp
    // log replays the post-stalemate round start shares the second with the
    // previous one
    await onGameLogMessage(roundStart('05/16/2026 - 16:46:17'))
    await onGameLogMessage({
      message: {
        payload: '05/16/2026 - 16:46:17: World triggered "Round_Stalemate"',
        password: logSecret,
      },
    })
    await onGameLogMessage(roundStart('05/16/2026 - 16:46:17'))
    expect(events.emit).not.toHaveBeenCalledWith('match/score:reset', { gameNumber })
  })

  it('emits match/score:reset for a doubled round start straddling a second boundary mid-game', async () => {
    await onGameLogMessage(roundStart('07/13/2026 - 17:30:00'))
    await onGameLogMessage(roundStart('07/13/2026 - 17:35:10'))
    await onGameLogMessage(roundStart('07/13/2026 - 17:35:11'))
    expect(events.emit).toHaveBeenCalledWith('match/score:reset', { gameNumber })
  })

  it('does not emit match/score:reset for the initial doubled round start straddling a second boundary', async () => {
    // real case: https://logs.tf/4084159
    await onGameLogMessage(roundStart('07/13/2026 - 16:35:01'))
    await onGameLogMessage(roundStart('07/13/2026 - 16:35:02'))
    expect(events.emit).not.toHaveBeenCalledWith('match/score:reset', { gameNumber })
  })

  it('does not emit match/score:reset when a round was won in between', async () => {
    // log replays re-stamp lines with the current time, so consecutive rounds
    // can share a timestamp — a completed round marks a regular transition
    await onGameLogMessage(roundStart('06/16/2026 - 10:38:23'))
    await onGameLogMessage({
      message: {
        payload: '06/16/2026 - 10:38:23: World triggered "Round_Win" (winner "Blue")',
        password: logSecret,
      },
    })
    await onGameLogMessage(roundStart('06/16/2026 - 10:38:23'))
    expect(events.emit).not.toHaveBeenCalledWith('match/score:reset', { gameNumber })
  })
})
