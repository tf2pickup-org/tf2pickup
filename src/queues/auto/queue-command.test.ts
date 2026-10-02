import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../database/collections', () => ({
  collections: { queueSlots: { countDocuments: vi.fn() } },
}))
vi.mock('../../events', () => ({ events: { emit: vi.fn() } }))
vi.mock('../metrics', () => ({
  queueMutexWaitDuration: { record: vi.fn() },
  queueMutexHoldDuration: { record: vi.fn() },
}))
vi.mock('../get-state', () => ({ getState: vi.fn() }))
vi.mock('./enter-state', () => ({ enterState: vi.fn() }))

import { ObjectId } from 'mongodb'
import { collections } from '../../database/collections'
import type { QueueId } from '../../database/models/queue.model'
import type { QueueSlotModel } from '../../database/models/queue-slot.model'
import { QueueState } from '../../database/models/queue-state.model'
import { events } from '../../events'
import { getState } from '../get-state'
import { queueMutexHoldDuration, queueMutexWaitDuration } from '../metrics'
import { enterState } from './enter-state'
import { queueCommand } from './queue-command'

const queue = new ObjectId() as QueueId
const other = new ObjectId() as QueueId
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
    vi.resetAllMocks()
  })

  it('runs one command at a time, across queues', async () => {
    const order: string[] = []
    let release!: () => void
    const first = queueCommand('first', async () => {
      order.push('first:start')
      await new Promise<void>(resolve => (release = resolve))
      order.push('first:end')
    })
    const second = queueCommand('second', async () => {
      order.push('second')
    })

    await vi.waitFor(() => expect(order).toEqual(['first:start']))
    release()
    await Promise.all([first, second])

    expect(order).toEqual(['first:start', 'first:end', 'second'])
  })

  it('emits events only after the lock is released', async () => {
    givenQueue(QueueState.waiting, 1, 0)
    let released = false
    vi.mocked(events.emit).mockImplementation(() => {
      // the lock is free: a new command runs right away
      void queueCommand('probe', async () => {
        released = true
      })
      return true
    })

    await queueCommand('test', async emit => {
      emit('queue/slots:updated', { queue, slots: [slot('scout-1', false)] })
    })
    await vi.waitFor(() => expect(released).toBe(true))
  })

  it('merges slot updates into one event per queue, each slot in its latest version', async () => {
    givenQueue(QueueState.waiting, 1, 0)

    await queueCommand('test', async emit => {
      emit('queue/slots:updated', {
        queue,
        slots: [slot('scout-1', false), slot('scout-2', false)],
      })
      emit('queue/slots:updated', { queue: other, slots: [slot('scout-1', true)] })
      emit('queue/state:updated', { queue, state: QueueState.waiting })
      emit('queue/slots:updated', { queue, slots: [slot('scout-1', true)] })
    })

    expect(vi.mocked(events.emit).mock.calls).toEqual([
      ['queue/slots:updated', { queue, slots: [slot('scout-1', true), slot('scout-2', false)] }],
      ['queue/slots:updated', { queue: other, slots: [slot('scout-1', true)] }],
      ['queue/state:updated', { queue, state: QueueState.waiting }],
    ])
  })

  it('enters the next state when a slot change fills the queue', async () => {
    givenQueue(QueueState.waiting, 12, 0)
    vi.mocked(enterState).mockImplementation(async () => {
      vi.mocked(getState).mockResolvedValue(QueueState.ready)
    })

    await queueCommand('test', async emit => {
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

    await queueCommand('test', async emit => {
      emit('queue/slots:updated', { queue, slots: [] })
    })

    expect(vi.mocked(enterState).mock.calls.map(([, state]) => state)).toEqual([
      QueueState.ready,
      QueueState.launching,
    ])
  })

  it('evaluates every queue whose slots changed', async () => {
    givenQueue(QueueState.waiting, 1, 0)

    await queueCommand('test', async emit => {
      emit('queue/slots:updated', { queue, slots: [] })
      emit('queue/slots:updated', { queue: other, slots: [] })
    })

    expect(vi.mocked(getState).mock.calls).toEqual([[queue], [other]])
  })

  it('does not evaluate the queue state without a slot change', async () => {
    await queueCommand('test', async emit => {
      emit('queue/mapVoteResults:updated', { queue, results: {} })
    })

    expect(getState).not.toHaveBeenCalled()
    expect(enterState).not.toHaveBeenCalled()
  })

  it('records how long the command waited for and held the lock', async () => {
    await queueCommand('test', () => Promise.resolve())

    expect(queueMutexWaitDuration.record).toHaveBeenCalledWith(expect.any(Number), {
      operation: 'test',
    })
    expect(queueMutexHoldDuration.record).toHaveBeenCalledWith(expect.any(Number), {
      operation: 'test',
    })
  })

  it('re-evaluates the queue state when the command throws after a slot change', async () => {
    givenQueue(QueueState.ready, 12, 12)
    vi.mocked(enterState).mockImplementation(async (_queue, state) => {
      givenQueue(state, 12, 12)
    })

    await expect(
      queueCommand('test', async emit => {
        emit('queue/slots:updated', { queue, slots: [slot('scout-1', true)] })
        throw new Error('boom')
      }),
    ).rejects.toThrow('boom')

    expect(enterState).toHaveBeenCalledWith(queue, QueueState.launching, expect.any(Function))
  })

  it('still emits what was collected when the command throws', async () => {
    await expect(
      queueCommand('test', async emit => {
        emit('queue:playerKicked', { player: '1' as never })
        throw new Error('boom')
      }),
    ).rejects.toThrow('boom')

    expect(events.emit).toHaveBeenCalledWith('queue:playerKicked', { player: '1' })
  })
})
