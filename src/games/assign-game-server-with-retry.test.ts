import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('es-toolkit', () => ({
  retry: vi.fn(async (fn: () => Promise<unknown>, options: { retries: number }) => {
    const retries = options?.retries ?? 0
    let lastError: unknown
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        return await fn()
      } catch (err) {
        lastError = err
      }
    }
    throw lastError
  }),
}))

vi.mock('./assign-game-server', () => ({
  assignGameServer: vi.fn(),
}))

vi.mock('../logger', () => ({
  logger: { info: vi.fn(), error: vi.fn(), trace: vi.fn(), warn: vi.fn() },
}))

vi.mock('../discord/notify-game-server-assignment-failed', () => ({
  notifyGameServerAssignmentFailed: vi.fn(),
}))

vi.mock('./update', () => ({
  update: vi.fn(),
}))

import { assignGameServerWithRetry } from './assign-game-server-with-retry'
import { assignGameServer } from './assign-game-server'
import { notifyGameServerAssignmentFailed } from '../discord/notify-game-server-assignment-failed'
import { update } from './update'
import type { GameModel, GameNumber } from '../database/models/game.model'

const fakeGame = { number: 1 } as GameModel

describe('assignGameServerWithRetry()', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('retries assignGameServer up to 3 times before giving up', async () => {
    vi.mocked(assignGameServer).mockRejectedValue(new Error('no servers available'))
    vi.mocked(update).mockResolvedValue(fakeGame)
    vi.mocked(notifyGameServerAssignmentFailed).mockResolvedValue(undefined)

    await expect(assignGameServerWithRetry(1 as GameNumber)).rejects.toThrow('no servers available')
    // 1 initial attempt + 3 retries = 4 calls
    expect(assignGameServer).toHaveBeenCalledTimes(4)
  })

  it('records gameServerAssignmentFailed event when all retries are exhausted', async () => {
    vi.mocked(assignGameServer).mockRejectedValue(new Error('no servers available'))
    vi.mocked(update).mockResolvedValue(fakeGame)
    vi.mocked(notifyGameServerAssignmentFailed).mockResolvedValue(undefined)

    await expect(assignGameServerWithRetry(1 as GameNumber)).rejects.toThrow()

    expect(update).toHaveBeenCalledWith(
      1,
      expect.objectContaining({
        $push: expect.objectContaining({
          events: expect.objectContaining({ event: 'game server assignment failed' }),
        }),
      }),
    )
  })

  it('notifies Discord when game server assignment fails', async () => {
    vi.mocked(assignGameServer).mockRejectedValue(new Error('no servers available'))
    vi.mocked(update).mockResolvedValue(fakeGame)
    vi.mocked(notifyGameServerAssignmentFailed).mockResolvedValue(undefined)

    await expect(assignGameServerWithRetry(1 as GameNumber)).rejects.toThrow()

    expect(notifyGameServerAssignmentFailed).toHaveBeenCalledWith(1, 'no game servers available')
  })
})
