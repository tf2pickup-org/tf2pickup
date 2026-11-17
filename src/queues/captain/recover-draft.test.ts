import { beforeEach, describe, expect, it, vi } from 'vitest'

const store = vi.hoisted(() => ({
  state: 'drafting' as string | undefined,
  draft: undefined as { turnDeadline: Date; token: string; turn: number } | undefined,
}))

vi.mock('../../database/collections', () => ({
  collections: {
    queueState: {
      findOne: vi.fn(() => Promise.resolve(store.state ? { state: store.state } : null)),
    },
    captainDrafts: { findOne: vi.fn(() => Promise.resolve(store.draft ?? null)) },
  },
}))
vi.mock('../../logger', () => ({ logger: { info: vi.fn() } }))
vi.mock('../../tasks', () => ({ tasks: { cancel: vi.fn(), schedule: vi.fn() } }))
vi.mock('../auto/queue-command', () => ({
  queueCommand: vi.fn(async (_operation: string, fn: () => unknown) => await fn()),
}))

import { addSeconds, secondsToMilliseconds, subSeconds } from 'date-fns'
import { ObjectId } from 'mongodb'
import type { QueueModel } from '../../database/models/queue.model'
import { tasks } from '../../tasks'
import { recoverDraft } from './recover-draft'

const queue = { _id: new ObjectId(), launchMode: 'captain' } as unknown as QueueModel

beforeEach(() => {
  vi.clearAllMocks()
  store.state = 'drafting'
  store.draft = { turnDeadline: addSeconds(new Date(), 6), token: 't', turn: 3 }
})

describe('recoverDraft()', () => {
  it('schedules the turn timer again from the saved deadline', async () => {
    await recoverDraft(queue)
    expect(tasks.schedule).toHaveBeenCalledWith('queue/captain:turnTimeout', expect.any(Number), {
      queue: queue._id,
      token: 't',
      turn: 3,
    })
    const ms = vi.mocked(tasks.schedule).mock.calls[0]![1]
    expect(ms).toBeGreaterThan(secondsToMilliseconds(4))
    expect(ms).toBeLessThanOrEqual(secondsToMilliseconds(6))
  })

  it('fires at once when the deadline has passed', async () => {
    store.draft!.turnDeadline = subSeconds(new Date(), 30)
    await recoverDraft(queue)
    expect(vi.mocked(tasks.schedule).mock.calls[0]![1]).toBe(0)
  })

  it('leaves a queue that is not drafting alone', async () => {
    store.state = 'waiting'
    await recoverDraft(queue)
    expect(tasks.schedule).not.toHaveBeenCalled()
    expect(tasks.cancel).not.toHaveBeenCalled()
  })

  it('refuses an auto queue', async () => {
    await expect(recoverDraft({ ...queue, launchMode: 'auto' } as QueueModel)).rejects.toThrow(
      'not a captain queue',
    )
    expect(tasks.schedule).not.toHaveBeenCalled()
  })
})
