import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../database/collections', () => ({
  collections: { queueSlots: { countDocuments: vi.fn() } },
}))
vi.mock('../../events', () => ({ events: { emit: vi.fn() } }))
vi.mock('../get-state', () => ({ getState: vi.fn() }))
vi.mock('./enter-state', () => ({ enterState: vi.fn() }))
vi.mock('../with-queue-lock', () => ({
  withQueueLock: vi.fn(async (_queue: unknown, _operation: string, fn: () => Promise<unknown>) => {
    try {
      return await fn()
    } finally {
      locked = false
    }
  }),
}))

let locked = true

import { ObjectId } from 'mongodb'
import { collections } from '../../database/collections'
import type { QueueId } from '../../database/models/queue.model'
import type { QueueSlotModel } from '../../database/models/queue-slot.model'
import { QueueState } from '../../database/models/queue-state.model'
import { events } from '../../events'
import { getState } from '../get-state'
import { enterState } from './enter-state'
import { queueCommand } from './queue-command'

const queue = new ObjectId() as QueueId
const slot = (id: string, ready: boolean) => ({ id, ready }) as QueueSlotModel

function givenQueue(state: QueueState, players: number, ready: number, slots = 12) {
  vi.mocked(getState).mockResolvedValue(state)
  vi.mocked(collections.queueSlots.countDocuments).mockImplementation((async (filter?: object) => {
    if (filter && 'player' in filter) return players
    if (filter && 'ready' in filter) return ready
    return slots
  }) as never)
}

describe('queueCommand()', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    locked = true
  })

  it('emits events only after the lock is released', async () => {
    givenQueue(QueueState.waiting, 1, 0)
    vi.mocked(events.emit).mockImplementation(() => {
      expect(locked).toBe(false)
      return true
    })

    await queueCommand(queue, 'test', async emit => {
      emit('queue/slots:updated', { queue, slots: [slot('scout-1', false)] })
    })

    expect(events.emit).toHaveBeenCalledOnce()
  })

  it('merges slot updates into one event, each slot in its latest version', async () => {
    givenQueue(QueueState.waiting, 1, 0)

    await queueCommand(queue, 'test', async emit => {
      emit('queue/slots:updated', {
        queue,
        slots: [slot('scout-1', false), slot('scout-2', false)],
      })
      emit('queue/state:updated', { queue, state: QueueState.waiting })
      emit('queue/slots:updated', { queue, slots: [slot('scout-1', true)] })
    })

    expect(vi.mocked(events.emit).mock.calls).toEqual([
      ['queue/slots:updated', { queue, slots: [slot('scout-1', true), slot('scout-2', false)] }],
      ['queue/state:updated', { queue, state: QueueState.waiting }],
    ])
  })

  it('enters the next state when a slot change fills the queue', async () => {
    givenQueue(QueueState.waiting, 12, 0)
    vi.mocked(enterState).mockImplementation(async () => {
      vi.mocked(getState).mockResolvedValue(QueueState.ready)
    })

    await queueCommand(queue, 'test', async emit => {
      emit('queue/slots:updated', { queue, slots: [] })
    })

    expect(enterState).toHaveBeenCalledOnce()
    expect(enterState).toHaveBeenCalledWith(queue, QueueState.ready, expect.any(Function))
  })

  it('keeps advancing while transitions apply', async () => {
    givenQueue(QueueState.waiting, 12, 0)
    vi.mocked(enterState).mockImplementation(async (_queue, state) => {
      // entering ready readies everybody up (pre-ready)
      givenQueue(state, 12, 12)
    })

    await queueCommand(queue, 'test', async emit => {
      emit('queue/slots:updated', { queue, slots: [] })
    })

    expect(vi.mocked(enterState).mock.calls.map(([, state]) => state)).toEqual([
      QueueState.ready,
      QueueState.launching,
    ])
  })

  it('does not evaluate the queue state without a slot change', async () => {
    await queueCommand(queue, 'test', async emit => {
      emit('queue/mapVoteResults:updated', { queue, results: {} })
    })

    expect(getState).not.toHaveBeenCalled()
    expect(enterState).not.toHaveBeenCalled()
  })

  it('still emits what was collected when the command throws', async () => {
    await expect(
      queueCommand(queue, 'test', async emit => {
        emit('queue:playerKicked', { player: '1' as never })
        throw new Error('boom')
      }),
    ).rejects.toThrow('boom')

    expect(events.emit).toHaveBeenCalledWith('queue:playerKicked', { player: '1' })
  })
})
