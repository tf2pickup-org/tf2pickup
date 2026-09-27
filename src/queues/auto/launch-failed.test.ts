import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../database/collections', () => ({
  collections: {
    queueSlots: {
      find: vi.fn(() => ({
        toArray: () =>
          Promise.resolve([{ player: { steamId: 'a' } }, { player: { steamId: 'b' } }]),
      })),
    },
  },
}))
vi.mock('../../pre-ready', () => ({ preReady: { cancel: vi.fn() } }))
vi.mock('../get-state', () => ({ getState: vi.fn() }))
vi.mock('./enter-state', () => ({ enterState: vi.fn() }))
vi.mock('./queue-command', () => ({
  queueCommand: vi.fn(
    async (_queue: unknown, _operation: string, fn: (emit: unknown) => unknown) => await fn(emit),
  ),
}))

const emit = vi.fn()

import { ObjectId } from 'mongodb'
import type { QueueId } from '../../database/models/queue.model'
import { QueueState } from '../../database/models/queue-state.model'
import { preReady } from '../../pre-ready'
import { getState } from '../get-state'
import { enterState } from './enter-state'
import { launchFailed } from './launch-failed'

const queue = new ObjectId() as QueueId

describe('launchFailed()', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('cancels pre-ready before putting the queue back to waiting', async () => {
    vi.mocked(getState).mockResolvedValue(QueueState.launching)
    const order: string[] = []
    vi.mocked(preReady.cancel).mockImplementation(async player => {
      order.push(`cancel ${player}`)
    })
    vi.mocked(enterState).mockImplementation(async (_queue, state) => {
      order.push(state)
    })

    await launchFailed(queue)

    expect(order).toEqual(['cancel a', 'cancel b', QueueState.waiting])
    expect(enterState).toHaveBeenCalledWith(queue, QueueState.waiting, emit)
  })

  it.each([QueueState.waiting, QueueState.ready])('leaves a %s queue alone', async state => {
    vi.mocked(getState).mockResolvedValue(state)

    await launchFailed(queue)

    expect(preReady.cancel).not.toHaveBeenCalled()
    expect(enterState).not.toHaveBeenCalled()
  })
})
