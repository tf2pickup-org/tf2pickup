import { describe, expect, it, vi } from 'vitest'

vi.mock('../../database/collections', () => {
  const collection = () => ({ deleteMany: vi.fn() })
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
vi.mock('./queue-command', () => ({
  queueCommand: vi.fn(async (_operation: string, fn: () => unknown) => await fn()),
}))

import { ObjectId } from 'mongodb'
import { collections } from '../../database/collections'
import type { QueueId } from '../../database/models/queue.model'
import { tasks } from '../../tasks'
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
})
