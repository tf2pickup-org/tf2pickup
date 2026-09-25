import { describe, expect, it, vi } from 'vitest'
import { ObjectId } from 'mongodb'
import { set } from './set'
import { collections } from '../../database/collections'
import type { QueueId } from '../../database/models/queue.model'

const events = vi.hoisted(() => ({ emit: vi.fn() }))

vi.mock('../../database/collections', () => ({
  collections: {
    queues: {
      updateOne: vi.fn().mockResolvedValue({}),
    },
  },
}))

vi.mock('../../events', () => ({ events }))

const queue = new ObjectId() as QueueId

describe('set()', () => {
  describe('when the pool has fewer than 3 maps', () => {
    it('should reject', async () => {
      await expect(set(queue, [{ name: 'cp_process_final' }])).rejects.toThrow()
      expect(collections.queues.updateOne).not.toHaveBeenCalled()
    })
  })

  it("should replace the queue's map pool and emit an event", async () => {
    const maps = [{ name: 'cp_process_final' }, { name: 'cp_badlands' }, { name: 'cp_granary' }]
    await set(queue, maps)
    expect(collections.queues.updateOne).toHaveBeenCalledWith({ _id: queue }, { $set: { maps } })
    expect(events.emit).toHaveBeenCalledWith('queue/mapPool:reset', { queue, maps })
  })
})
