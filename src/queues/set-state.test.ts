import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../database/collections', () => ({
  collections: {
    queueSlots: {
      countDocuments: vi.fn(),
    },
    queueState: {
      updateOne: vi.fn(),
    },
  },
}))

vi.mock('../events', () => ({
  events: { emit: vi.fn() },
}))

vi.mock('../logger', () => ({
  logger: { trace: vi.fn(), info: vi.fn() },
}))

vi.mock('../pre-ready', () => ({
  preReady: { start: vi.fn() },
}))

vi.mock('./with-queue-lock', () => ({
  withQueueLock: vi.fn(
    async (_queue: unknown, _operation: string, fn: () => Promise<unknown>) => await fn(),
  ),
}))

import { ObjectId } from 'mongodb'
import { setState } from './set-state'
import type { QueueId } from '../database/models/queue.model'
import { QueueState } from '../database/models/queue-state.model'
import { collections } from '../database/collections'
import { events } from '../events'

const queue = new ObjectId() as QueueId

describe('setState()', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('when transitioning to launching', () => {
    it('rejects when a queue slot is empty or unready', async () => {
      vi.mocked(collections.queueSlots.countDocuments).mockResolvedValue(1)

      await expect(setState(queue, QueueState.launching)).rejects.toThrow(
        'cannot launch: queue is no longer full and ready',
      )
      expect(collections.queueState.updateOne).not.toHaveBeenCalled()
      expect(events.emit).not.toHaveBeenCalled()
    })

    it('proceeds when every slot is taken and ready', async () => {
      vi.mocked(collections.queueSlots.countDocuments).mockResolvedValue(0)

      await setState(queue, QueueState.launching)

      expect(collections.queueState.updateOne).toHaveBeenCalledWith(
        { queue },
        { $set: { state: QueueState.launching } },
      )
      expect(events.emit).toHaveBeenCalledWith('queue/state:updated', {
        queue,
        state: QueueState.launching,
      })
    })
  })

  it('does not verify slots for other transitions', async () => {
    await setState(queue, QueueState.waiting)

    expect(collections.queueSlots.countDocuments).not.toHaveBeenCalled()
    expect(collections.queueState.updateOne).toHaveBeenCalledWith(
      { queue },
      { $set: { state: QueueState.waiting } },
    )
  })
})
