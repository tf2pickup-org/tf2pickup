import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../database/collections', () => ({
  collections: {
    queuePlayers: {
      findOneAndDelete: vi.fn(),
      find: vi.fn(() => ({ toArray: vi.fn().mockResolvedValue([]) })),
    },
  },
}))

vi.mock('../events', () => ({ events: { emit: vi.fn() } }))
vi.mock('../logger', () => ({ logger: { trace: vi.fn() } }))
vi.mock('../pre-ready', () => ({ preReady: { cancel: vi.fn() } }))
vi.mock('../queue/get-state', () => ({ getState: vi.fn() }))
vi.mock('../queue/with-queue-lock', () => ({
  withQueueLock: vi.fn(async (_operation: string, fn: () => Promise<unknown>) => await fn()),
}))

import { leave } from './leave'
import { QueueState } from '../database/models/queue-state.model'
import { collections } from '../database/collections'
import { getState } from '../queue/get-state'
import type { SteamId64 } from '../shared/types/steam-id-64'

const steamId = '76561198074409147' as SteamId64

describe('leave()', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(collections.queuePlayers.findOneAndDelete).mockResolvedValue({ steamId: 'x' } as any)
  })

  // Regression: this used to reject only `launching`, letting a drafted player
  // leave mid-draft while the draft still referenced them.
  it('refuses to let a player leave during the draft', async () => {
    vi.mocked(getState).mockResolvedValue(QueueState.draft)

    await expect(leave(steamId)).rejects.toThrow('invalid queue state')
    expect(collections.queuePlayers.findOneAndDelete).not.toHaveBeenCalled()
  })

  it('refuses to let a player leave while launching', async () => {
    vi.mocked(getState).mockResolvedValue(QueueState.launching)

    await expect(leave(steamId)).rejects.toThrow('invalid queue state')
  })

  it('lets a player leave while waiting', async () => {
    vi.mocked(getState).mockResolvedValue(QueueState.waiting)

    await leave(steamId)

    expect(collections.queuePlayers.findOneAndDelete).toHaveBeenCalledWith({
      steamId,
    })
  })
})
