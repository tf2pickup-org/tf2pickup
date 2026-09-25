import { ObjectId } from 'mongodb'
import { describe, expect, it, vi } from 'vitest'
import type { QueueId } from '../../database/models/queue.model'
import { QueueState } from '../../database/models/queue-state.model'
import { tasks } from '../../tasks'
import { setState } from '../set-state'
import { unready } from './unready'
import { unreadyQueue } from './unready-queue'

vi.mock('../../database/collections', () => ({
  collections: {
    queueSlots: {
      find: () => ({ toArray: () => Promise.resolve([{ player: { steamId: '1' } }]) }),
    },
  },
}))
vi.mock('../../logger', () => ({ logger: { info: vi.fn() } }))
vi.mock('../../tasks', () => ({ tasks: { cancel: vi.fn() } }))
vi.mock('../set-state', () => ({ setState: vi.fn() }))
vi.mock('./unready', () => ({ unready: vi.fn() }))

describe('unreadyQueue()', () => {
  it("cancels the queue's pending ready-up timeouts", async () => {
    const queue = new ObjectId() as QueueId
    await unreadyQueue(queue)
    expect(tasks.cancel).toHaveBeenCalledWith('queue:readyUpTimeout', { queue })
    expect(tasks.cancel).toHaveBeenCalledWith('queue:unready', { queue })
    expect(setState).toHaveBeenCalledWith(queue, QueueState.waiting)
    expect(unready).toHaveBeenCalledWith(queue, '1')
  })
})
