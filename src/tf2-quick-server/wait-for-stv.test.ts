import { beforeEach, describe, expect, it, vi } from 'vitest'
import { secondsToMilliseconds } from 'date-fns'
import { GameEventType } from '../database/models/game-event.model'
import { GameServerProvider, GameState } from '../database/models/game.model'

vi.mock('../database/collections', () => ({
  collections: {
    games: {
      findOne: vi.fn(),
    },
  },
}))

vi.mock('../logger', () => ({
  logger: { info: vi.fn() },
}))

vi.mock('es-toolkit', () => ({
  delay: vi.fn().mockResolvedValue(undefined),
}))

import { waitForStv } from './wait-for-stv'
import { collections } from '../database/collections'
import { delay } from 'es-toolkit'

describe('waitForStv()', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('does nothing when no previous game is found', async () => {
    vi.mocked(collections.games.findOne).mockResolvedValue(null)
    await waitForStv('server-1')
    expect(delay).not.toHaveBeenCalled()
  })

  it('does nothing when the previous game has no gameEnded event', async () => {
    vi.mocked(collections.games.findOne).mockResolvedValue({
      number: 1,
      state: GameState.ended,
      events: [{ event: GameEventType.gameCreated, at: new Date() }],
    } as never)
    await waitForStv('server-1')
    expect(delay).not.toHaveBeenCalled()
  })

  it('does nothing when the game ended more than 90 seconds ago', async () => {
    const endedAt = new Date(Date.now() - secondsToMilliseconds(91))
    vi.mocked(collections.games.findOne).mockResolvedValue({
      number: 1,
      state: GameState.ended,
      events: [
        { event: GameEventType.gameCreated, at: new Date(Date.now() - secondsToMilliseconds(200)) },
        { event: GameEventType.gameEnded, at: endedAt, reason: 'match ended' },
      ],
    } as never)
    await waitForStv('server-1')
    expect(delay).not.toHaveBeenCalled()
  })

  it('waits for the remaining STV delay when the game ended recently', async () => {
    const endedAt = new Date(Date.now() - secondsToMilliseconds(30))
    vi.mocked(collections.games.findOne).mockResolvedValue({
      number: 1,
      state: GameState.ended,
      events: [
        { event: GameEventType.gameCreated, at: new Date(Date.now() - secondsToMilliseconds(200)) },
        { event: GameEventType.gameEnded, at: endedAt, reason: 'match ended' },
      ],
    } as never)
    await waitForStv('server-1')
    expect(delay).toHaveBeenCalledOnce()
    const waitedMs = vi.mocked(delay).mock.calls[0]![0]
    expect(waitedMs).toBeGreaterThan(0)
    expect(waitedMs).toBeLessThanOrEqual(secondsToMilliseconds(60))
  })

  it('queries for the most recent ended/interrupted game for the given server', async () => {
    vi.mocked(collections.games.findOne).mockResolvedValue(null)
    await waitForStv('server-xyz')
    expect(collections.games.findOne).toHaveBeenCalledWith(
      {
        'gameServer.id': 'server-xyz',
        'gameServer.provider': GameServerProvider.tf2QuickServer,
        state: { $in: [GameState.ended, GameState.interrupted] },
      },
      { sort: { number: -1 }, projection: { events: 1 } },
    )
  })
})
