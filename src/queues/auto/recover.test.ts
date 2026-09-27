import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../database/collections', () => ({
  collections: {
    queueState: { findOne: vi.fn() },
    queueSlots: { countDocuments: vi.fn() },
  },
}))
vi.mock('../../logger', () => ({ logger: { info: vi.fn() } }))
vi.mock('./reset', () => ({ reset: vi.fn() }))
vi.mock('./take-launch-snapshot', () => ({
  takeLaunchSnapshot: vi.fn().mockResolvedValue('snapshot'),
}))
vi.mock('./queue-command', () => ({
  queueCommand: vi.fn(async (_operation: string, fn: (emit: unknown) => unknown) => await fn(emit)),
}))

const emit = vi.fn()

import { ObjectId } from 'mongodb'
import { collections } from '../../database/collections'
import type { QueueId } from '../../database/models/queue.model'
import { QueueState } from '../../database/models/queue-state.model'
import { recover } from './recover'
import { reset } from './reset'

const queue = new ObjectId() as QueueId

function given(state: QueueState | null, slots: number) {
  vi.mocked(collections.queueState.findOne).mockResolvedValue(
    (state ? { queue, state } : null) as never,
  )
  vi.mocked(collections.queueSlots.countDocuments).mockResolvedValue(slots)
}

describe('recover()', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('resets a queue without a state', async () => {
    given(null, 12)
    await recover(queue)
    expect(reset).toHaveBeenCalledWith(queue)
  })

  it('resets a queue without slots', async () => {
    given(QueueState.waiting, 0)
    await recover(queue)
    expect(reset).toHaveBeenCalledWith(queue)
  })

  it('launches a queue that was launching again', async () => {
    given(QueueState.launching, 12)
    await recover(queue)
    expect(reset).not.toHaveBeenCalled()
    expect(emit).toHaveBeenCalledWith('queue:launching', 'snapshot')
  })

  it.each([QueueState.waiting, QueueState.ready])('leaves a %s queue alone', async state => {
    given(state, 12)
    await recover(queue)
    expect(reset).not.toHaveBeenCalled()
    expect(emit).not.toHaveBeenCalled()
  })
})
