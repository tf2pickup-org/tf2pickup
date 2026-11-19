import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../events', () => ({ events: { emit: vi.fn() } }))
vi.mock('./metrics', () => ({
  queueMutexWaitDuration: { record: vi.fn() },
  queueMutexHoldDuration: { record: vi.fn() },
}))
vi.mock('./get', () => ({ get: vi.fn() }))
vi.mock('./auto/step', () => ({ step: vi.fn() }))
vi.mock('./captain/step', () => ({ step: vi.fn() }))

import { ObjectId } from 'mongodb'
import type { QueueId, QueueModel } from '../database/models/queue.model'
import type { QueueSlotModel } from '../database/models/queue-slot.model'
import { QueueState } from '../database/models/queue-state.model'
import { events } from '../events'
import { step as autoStep } from './auto/step'
import { step as captainStep } from './captain/step'
import { get } from './get'
import { queueMutexHoldDuration, queueMutexWaitDuration } from './metrics'
import { queueCommand, type Emit } from './queue-command'

const queue = new ObjectId() as QueueId
const other = new ObjectId() as QueueId
const captain = new ObjectId() as QueueId
const slot = (id: string, ready: boolean) => ({ id, ready }) as QueueSlotModel
const settings = (id: QueueId) =>
  ({ _id: id, launchMode: id === captain ? 'captain' : 'auto' }) as QueueModel

describe('queueCommand()', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.mocked(get).mockImplementation(async id => settings(id))
    vi.mocked(autoStep).mockResolvedValue(false)
    vi.mocked(captainStep).mockResolvedValue(false)
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

  it('coalesces captain pool updates into one event per queue', async () => {
    await queueCommand('captain-change', async emit => {
      emit('queue/captainPool:updated', { queue: captain })
      emit('queue/captainPool:updated', { queue: other })
      emit('queue/state:updated', { queue: captain, state: QueueState.ready })
      emit('queue/captainPool:updated', { queue: captain })
    })
    expect(vi.mocked(events.emit).mock.calls).toEqual([
      ['queue/captainPool:updated', { queue: captain }],
      ['queue/captainPool:updated', { queue: other }],
      ['queue/state:updated', { queue: captain, state: QueueState.ready }],
    ])
  })

  it.each([
    ['slots', (emit: Emit, id: QueueId) => emit('queue/slots:updated', { queue: id, slots: [] })],
    ['captain pool', (emit: Emit, id: QueueId) => emit('queue/captainPool:updated', { queue: id })],
    [
      'state',
      (emit: Emit, id: QueueId) =>
        emit('queue/state:updated', { queue: id, state: QueueState.waiting }),
    ],
  ])('steps a queue whose %s the command touched', async (_, touch) => {
    await queueCommand('test', async emit => {
      touch(emit, captain)
    })

    expect(captainStep).toHaveBeenCalledWith(settings(captain), expect.any(Function))
    expect(autoStep).not.toHaveBeenCalled()
  })

  it("steps each touched queue through its own launch mode's transitions", async () => {
    await queueCommand('test', async emit => {
      emit('queue/slots:updated', { queue, slots: [] })
      emit('queue/captainPool:updated', { queue: captain })
      emit('queue/slots:updated', { queue, slots: [] })
    })

    expect(vi.mocked(autoStep).mock.calls.map(([{ _id }]) => _id)).toEqual([queue])
    expect(vi.mocked(captainStep).mock.calls.map(([{ _id }]) => _id)).toEqual([captain])
  })

  it('keeps stepping while transitions apply', async () => {
    vi.mocked(captainStep).mockResolvedValueOnce(true).mockResolvedValueOnce(true)

    await queueCommand('test', async emit => {
      emit('queue/captainPool:updated', { queue: captain })
    })

    expect(captainStep).toHaveBeenCalledTimes(3)
  })

  it('emits what the steps emit, after the command', async () => {
    vi.mocked(autoStep).mockImplementationOnce(async (_queue, emit) => {
      emit('queue/state:updated', { queue, state: QueueState.ready })
      return true
    })

    await queueCommand('test', async emit => {
      emit('queue/slots:updated', { queue, slots: [] })
    })

    expect(vi.mocked(events.emit).mock.calls).toEqual([
      ['queue/slots:updated', { queue, slots: [] }],
      ['queue/state:updated', { queue, state: QueueState.ready }],
    ])
  })

  it('reads the queue settings after the command, so steps see what it changed', async () => {
    const order: string[] = []
    vi.mocked(get).mockImplementation(async id => {
      order.push('get')
      return settings(id)
    })

    await queueCommand('test', async emit => {
      emit('queue/captainPool:updated', { queue: captain })
      order.push('command')
    })

    expect(order).toEqual(['command', 'get'])
  })

  it('does not step a queue the command did not touch', async () => {
    await queueCommand('test', async emit => {
      emit('queue/mapVoteResults:updated', { queue, results: {} })
    })

    expect(get).not.toHaveBeenCalled()
    expect(autoStep).not.toHaveBeenCalled()
  })

  it('does not step anything when told not to re-evaluate', async () => {
    await queueCommand(
      'test',
      async emit => {
        emit('queue/state:updated', { queue: captain, state: QueueState.waiting })
      },
      { reevaluate: false },
    )

    expect(captainStep).not.toHaveBeenCalled()
    expect(events.emit).toHaveBeenCalledWith('queue/state:updated', {
      queue: captain,
      state: QueueState.waiting,
    })
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

  it('steps the queue when the command throws after touching it', async () => {
    await expect(
      queueCommand('test', async emit => {
        emit('queue/slots:updated', { queue, slots: [slot('scout-1', true)] })
        throw new Error('boom')
      }),
    ).rejects.toThrow('boom')

    expect(autoStep).toHaveBeenCalledOnce()
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
