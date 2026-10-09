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
  withQueueLock: vi.fn(async (_operation: string, fn: () => Promise<unknown>) => await fn()),
}))

import { setState } from './set-state'
import { QueueState } from '../database/models/queue-state.model'
import { collections } from '../database/collections'
import { events } from '../events'

describe('setState()', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('when transitioning to launching', () => {
    it('rejects when a queue slot is empty or unready', async () => {
      vi.mocked(collections.queueSlots.countDocuments).mockResolvedValue(1)

      await expect(setState(QueueState.launching)).rejects.toThrow(
        'cannot launch: queue is no longer full and ready',
      )
      expect(collections.queueState.updateOne).not.toHaveBeenCalled()
      expect(events.emit).not.toHaveBeenCalled()
    })

    it('proceeds when every slot is taken and ready', async () => {
      vi.mocked(collections.queueSlots.countDocuments).mockResolvedValue(0)

      await setState(QueueState.launching)

      expect(collections.queueState.updateOne).toHaveBeenCalledWith(
        {},
        { $set: { state: QueueState.launching } },
      )
      expect(events.emit).toHaveBeenCalledWith('queue/state:updated', {
        state: QueueState.launching,
      })
    })
  })

  it('does not verify slots for other transitions', async () => {
    await setState(QueueState.waiting)

    expect(collections.queueSlots.countDocuments).not.toHaveBeenCalled()
    expect(collections.queueState.updateOne).toHaveBeenCalledWith(
      {},
      { $set: { state: QueueState.waiting } },
    )
  })
})
