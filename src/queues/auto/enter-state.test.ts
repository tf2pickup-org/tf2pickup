import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../database/collections', () => ({
  collections: {
    queueState: { updateOne: vi.fn(), findOne: vi.fn() },
    queueSlots: {
      updateMany: vi.fn(),
      find: vi.fn(() => ({ toArray: () => Promise.resolve([{ id: 'scout-1' }]) })),
    },
    players: {
      find: vi.fn(() => ({ toArray: () => Promise.resolve([{ steamId: 'pre' }]) })),
    },
  },
}))
vi.mock('../../logger', () => ({ logger: { info: vi.fn() } }))
vi.mock('../../pre-ready', () => ({ preReady: { start: vi.fn() } }))
vi.mock('../../tasks', () => ({ tasks: { cancel: vi.fn(), schedule: vi.fn() } }))
vi.mock('./take-launch-snapshot', () => ({
  takeLaunchSnapshot: vi.fn().mockResolvedValue('snapshot'),
}))
vi.mock('../get', () => ({ get: vi.fn().mockResolvedValue({ readyUpTimeout: 40_000 }) }))

import { ObjectId } from 'mongodb'
import { collections } from '../../database/collections'
import type { QueueId } from '../../database/models/queue.model'
import { QueueState } from '../../database/models/queue-state.model'
import { preReady } from '../../pre-ready'
import { tasks } from '../../tasks'
import { enterState } from './enter-state'

const queue = new ObjectId() as QueueId
const emit = vi.fn()

describe('enterState()', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('waiting', () => {
    it('cancels the ready-up timeouts and unreadies everybody', async () => {
      await enterState(queue, QueueState.waiting, emit)

      expect(tasks.cancel).toHaveBeenCalledWith('queue:readyUpTimeout', { queue })
      expect(tasks.cancel).toHaveBeenCalledWith('queue:unready', { queue })
      expect(collections.queueSlots.updateMany).toHaveBeenCalledWith(
        { queue, player: { $ne: null } },
        { $set: { ready: false } },
      )
      expect(emit).toHaveBeenCalledWith('queue/slots:updated', {
        queue,
        slots: [{ id: 'scout-1' }],
      })
      expect(emit).toHaveBeenLastCalledWith('queue/state:updated', {
        queue,
        state: QueueState.waiting,
      })
    })
  })

  describe('ready', () => {
    it('readies up the pre-readied players and the last to join, and arms the ready-up timeout', async () => {
      vi.mocked(collections.queueState.findOne).mockResolvedValue({ last: 'last' } as never)

      await enterState(queue, QueueState.ready, emit)

      expect(collections.queueState.updateOne).toHaveBeenCalledWith(
        { queue },
        { $set: { state: QueueState.ready } },
      )
      expect(collections.queueSlots.updateMany).toHaveBeenCalledWith(
        { queue, 'player.steamId': { $in: ['pre', 'last'] } },
        { $set: { ready: true } },
      )
      expect(preReady.start).toHaveBeenCalledWith('last')
      expect(tasks.schedule).toHaveBeenCalledWith('queue:readyUpTimeout', 40_000, { queue })
      expect(emit).toHaveBeenLastCalledWith('queue/state:updated', {
        queue,
        state: QueueState.ready,
      })
    })

    it('rejects a queue without the last player', async () => {
      vi.mocked(collections.queueState.findOne).mockResolvedValue({} as never)

      await expect(enterState(queue, QueueState.ready, emit)).rejects.toThrow('last undefined')
    })
  })

  describe('launching', () => {
    it('cancels the ready-up timeouts and hands over the launch snapshot', async () => {
      await enterState(queue, QueueState.launching, emit)

      expect(tasks.cancel).toHaveBeenCalledWith('queue:readyUpTimeout', { queue })
      expect(tasks.cancel).toHaveBeenCalledWith('queue:unready', { queue })
      expect(tasks.schedule).not.toHaveBeenCalled()
      expect(emit.mock.calls).toEqual([
        ['queue/state:updated', { queue, state: QueueState.launching }],
        ['queue:launching', 'snapshot'],
      ])
    })
  })
})
