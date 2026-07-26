import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ObjectId } from 'mongodb'
import { cancelAll } from './cancel-all'
import { collections } from '../database/collections'
import { scheduledTaskTimers } from './scheduled-task-timers'

vi.mock('../database/collections', () => ({
  collections: {
    tasks: {
      find: vi.fn(),
      deleteMany: vi.fn(),
    },
  },
}))

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date(2000, 1, 1, 13))
  scheduledTaskTimers.clear()
  vi.mocked(collections.tasks.find).mockReturnValue({
    toArray: () => Promise.resolve([]),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any)
})

afterEach(() => {
  scheduledTaskTimers.clear()
  vi.clearAllMocks()
  vi.useRealTimers()
})

describe('cancelAll()', () => {
  it('should delete every task with the given name', async () => {
    await cancelAll('queue:readyUpTimeout')
    expect(collections.tasks.find).toHaveBeenCalledWith(
      { name: 'queue:readyUpTimeout' },
      { projection: { _id: 1 } },
    )
    expect(collections.tasks.deleteMany).toHaveBeenCalledWith({ name: 'queue:readyUpTimeout' })
  })

  it('should clear the in-memory timers of cancelled tasks', async () => {
    const _id = new ObjectId()
    const fn = vi.fn()
    scheduledTaskTimers.set(_id.toString(), setTimeout(fn, 5000))
    vi.mocked(collections.tasks.find).mockReturnValue({
      toArray: () => Promise.resolve([{ _id }]),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any)

    await cancelAll('queue:readyUpTimeout')

    expect(scheduledTaskTimers.has(_id.toString())).toBe(false)
    await vi.advanceTimersByTimeAsync(5000)
    expect(fn).not.toHaveBeenCalled()
  })
})
