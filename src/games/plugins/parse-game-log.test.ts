import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('fastify-plugin', () => ({
  default: <T>(fn: T): T => fn,
}))

vi.mock('../../events', () => ({
  events: { on: vi.fn(), emit: vi.fn() },
}))

vi.mock('../../logger', () => ({
  logger: { info: vi.fn(), error: vi.fn() },
}))

vi.mock('../../otel', () => ({
  meter: { createCounter: () => ({ add: vi.fn() }) },
}))

vi.mock('../update', () => ({
  update: vi.fn().mockResolvedValue({}),
}))

vi.mock('../../database/collections', () => ({
  collections: {
    games: { findOne: vi.fn() },
    gamesLogParseState: { findOne: vi.fn(), updateOne: vi.fn() },
  },
}))

import { events } from '../../events'
import { collections } from '../../database/collections'
import plugin from './parse-game-log'

const gameNumber = 4242
const logSecret = 'secret-1'

// let the fire-and-forget per-game queue drain; every mocked db call resolves
// immediately, so one macrotask flush is enough
const flush = () => new Promise(resolve => setImmediate(resolve))

type Handler = (params: { message: { payload: string; password: string } }) => void

describe('parse-game-log', () => {
  let onMessage: Handler

  beforeEach(async () => {
    vi.clearAllMocks()
    vi.mocked(collections.games.findOne).mockResolvedValue({ number: gameNumber } as never)
    vi.mocked(collections.gamesLogParseState.findOne).mockResolvedValue(null as never)
    vi.mocked(collections.gamesLogParseState.updateOne).mockResolvedValue({} as never)

    await (plugin as unknown as () => Promise<void>)()
    const call = vi.mocked(events.on).mock.calls.find(([event]) => event === 'gamelog:message')
    onMessage = call![1] as Handler
  })

  const feed = async (payload: string) => {
    onMessage({ message: { payload, password: logSecret } })
    await flush()
  }

  it('persists the context when a line changes it', async () => {
    await feed('07/13/2026 - 17:00:00: World triggered "Round_Start"')
    expect(collections.gamesLogParseState.updateOne).toHaveBeenCalledWith(
      { gameNumber },
      expect.objectContaining({ $set: expect.objectContaining({ context: expect.anything() }) }),
      { upsert: true },
    )
  })

  it('does not touch the database for a line that leaves the context unchanged', async () => {
    await feed(
      '07/13/2026 - 17:00:00: "Foo<3><[U:1:1]><Red>" killed "Bar<4><[U:1:2]><Blue>" with "scattergun"',
    )
    expect(collections.gamesLogParseState.updateOne).not.toHaveBeenCalled()
  })

  it('reads the game number and context once, then serves them from memory', async () => {
    await feed('an unrecognized log line')
    await feed('another unrecognized log line')
    expect(collections.games.findOne).toHaveBeenCalledTimes(1)
    expect(collections.gamesLogParseState.findOne).toHaveBeenCalledTimes(1)
  })

  it('marks the line unhandled and does nothing when the game is unknown', async () => {
    vi.mocked(collections.games.findOne).mockResolvedValue(null as never)
    await feed('07/13/2026 - 17:00:00: World triggered "Round_Start"')
    expect(collections.gamesLogParseState.findOne).not.toHaveBeenCalled()
    expect(collections.gamesLogParseState.updateOne).not.toHaveBeenCalled()
  })
})
