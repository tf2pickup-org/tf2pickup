import { describe, expect, it, vi } from 'vitest'
import { QueueState } from '../../database/models/queue-state.model'
import { setState } from '../set-state'
import { tasks } from '../../tasks'
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
vi.mock('../../tasks', () => ({ tasks: { cancelAll: vi.fn() } }))
vi.mock('../set-state', () => ({ setState: vi.fn() }))
vi.mock('./unready', () => ({ unready: vi.fn() }))

describe('unreadyQueue()', () => {
  it('cancels the pending ready-up timeouts', async () => {
    await unreadyQueue()
    expect(tasks.cancelAll).toHaveBeenCalledWith('queue:readyUpTimeout')
    expect(tasks.cancelAll).toHaveBeenCalledWith('queue:unready')
    expect(setState).toHaveBeenCalledWith(QueueState.waiting)
    expect(unready).toHaveBeenCalledWith('1')
  })
})
