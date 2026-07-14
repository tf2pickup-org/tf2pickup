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
  })

  const roundStart = (timestamp: string) => ({
    message: { payload: `${timestamp}: World triggered "Round_Start"`, password: logSecret },
  })

  it('emits match:started for a regular round start', async () => {
    await onGameLogMessage(roundStart('07/13/2026 - 17:44:53'))
    expect(events.emit).toHaveBeenCalledWith('match:started', { gameNumber })
    expect(events.emit).not.toHaveBeenCalledWith('match/score:reset', { gameNumber })
  })

  it('emits match/score:reset for a doubled round start', async () => {
    await onGameLogMessage(roundStart('07/13/2026 - 17:39:30'))
    await onGameLogMessage(roundStart('07/13/2026 - 17:39:30'))
    expect(events.emit).toHaveBeenCalledWith('match/score:reset', { gameNumber })
  })

  it('does not emit match/score:reset for round starts at different times', async () => {
    await onGameLogMessage(roundStart('07/13/2026 - 18:01:44'))
    await onGameLogMessage(roundStart('07/13/2026 - 18:07:40'))
    expect(events.emit).not.toHaveBeenCalledWith('match/score:reset', { gameNumber })
  })
})
