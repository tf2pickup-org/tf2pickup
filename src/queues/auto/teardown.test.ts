import { describe, expect, it, vi } from 'vitest'

vi.mock('../../database/collections', () => {
  const collection = () => ({
    deleteMany: vi.fn(),
    find: vi.fn(() => ({ toArray: vi.fn().mockResolvedValue([]) })),
  })
  return {
    collections: {
      queueSlots: collection(),
      queueState: collection(),
      queueMapOptions: collection(),
      queueMapVotes: collection(),
      queueFriends: collection(),
    },
  }
})
vi.mock('../../tasks', () => ({ tasks: { cancel: vi.fn() } }))
vi.mock('../get', () => ({ get: vi.fn().mockResolvedValue({ launchMode: 'auto' }) }))
vi.mock('./kick', () => ({ kick: vi.fn() }))
vi.mock('../queue-command', () => ({
  queueCommand: vi.fn(async (_operation: string, fn: () => unknown) => await fn()),
}))

import { ObjectId } from 'mongodb'
import { collections } from '../../database/collections'
import type { QueueId } from '../../database/models/queue.model'
import type { SteamId64 } from '../../shared/types/steam-id-64'
import { tasks } from '../../tasks'
import { kick } from './kick'
import { teardown } from './teardown'

describe('teardown()', () => {
  it("cancels the queue's timeouts and clears its runtime state", async () => {
    const queue = new ObjectId() as QueueId

    await teardown(queue)

    expect(tasks.cancel).toHaveBeenCalledWith('queue:readyUpTimeout', { queue })
    expect(tasks.cancel).toHaveBeenCalledWith('queue:unready', { queue })
    for (const collection of [
      collections.queueSlots,
      collections.queueState,
      collections.queueMapOptions,
      collections.queueMapVotes,
      collections.queueFriends,
    ]) {
      expect(collection.deleteMany).toHaveBeenCalledWith({ queue })
    }
  })

  it('kicks the players before clearing the slots', async () => {
    const queue = new ObjectId() as QueueId
    const steamId = '76561198000000001' as SteamId64
    vi.mocked(collections.queueSlots.find).mockReturnValueOnce({
      toArray: vi.fn().mockResolvedValue([{ player: { steamId } }]),
    } as never)

    await teardown(queue)

    expect(kick).toHaveBeenCalledWith(steamId)
  })

  it('leaves the queue in place when the kick fails', async () => {
    vi.mocked(kick).mockRejectedValueOnce(new Error('invalid queue state'))
    vi.mocked(collections.queueSlots.deleteMany).mockClear()

    await expect(teardown(new ObjectId() as QueueId)).rejects.toThrow('invalid queue state')
    expect(collections.queueSlots.deleteMany).not.toHaveBeenCalled()
  })
})
