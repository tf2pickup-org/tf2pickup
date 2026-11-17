import { describe, expect, it, vi } from 'vitest'

vi.mock('../../database/collections', () => {
  const find = (rows: object[]) => vi.fn(() => ({ toArray: () => Promise.resolve(rows) }))
  return {
    collections: {
      queueSlots: { find: find([]) },
      queueFriends: {
        find: find([{ source: '76561198074409147', target: '76561198074409148' }]),
        deleteMany: vi.fn(),
      },
    },
  }
})
vi.mock('../../events', () => ({ events: { emit: vi.fn() } }))
const emit = vi.hoisted(() => vi.fn())
vi.mock('./queue-command', () => ({
  queueCommand: vi.fn(
    async (_operation: string, fn: (e: typeof emit) => unknown) => await fn(emit),
  ),
}))

import { ObjectId } from 'mongodb'
import { collections } from '../../database/collections'
import type { QueueId } from '../../database/models/queue.model'
import { events } from '../../events'
import { cleanupFriendships } from './cleanup-friendships'
import { queueCommand } from './queue-command'

describe('cleanupFriendships()', () => {
  it('drops friendships of sources no longer queued as medics, inside a queue command', async () => {
    const queue = new ObjectId() as QueueId

    await cleanupFriendships(queue)

    expect(queueCommand).toHaveBeenCalledOnce()
    expect(collections.queueFriends.deleteMany).toHaveBeenCalledWith({
      queue,
      source: { $in: ['76561198074409147'] },
    })
    expect(emit).toHaveBeenCalledWith('queue/friendship:removed', {
      queue,
      source: '76561198074409147',
      target: '76561198074409148',
    })
    expect(events.emit).not.toHaveBeenCalled()
  })
})
