import { beforeEach, describe, expect, it, vi } from 'vitest'

const handlers = vi.hoisted(() => new Map<string, (args: { queue: unknown }) => Promise<void>>())

vi.mock('../../tasks', () => ({
  tasks: {
    register: vi.fn((name: string, fn: (args: { queue: unknown }) => Promise<void>) => {
      handlers.set(name, fn)
    }),
    schedule: vi.fn(),
  },
}))
vi.mock('../../logger', () => ({ logger: { info: vi.fn() } }))
vi.mock('../get', () => ({ get: vi.fn() }))
vi.mock('../get-state', () => ({ getState: vi.fn() }))
vi.mock('./enter-state', () => ({ enterState: vi.fn() }))
vi.mock('./kick-from-queue', () => ({ kickFromQueue: vi.fn() }))
vi.mock('../../database/collections', () => ({
  collections: { queueSlots: { find: vi.fn(() => ({ toArray: () => Promise.resolve([]) })) } },
}))
vi.mock('./queue-command', () => ({
  queueCommand: vi.fn(
    async (_operation: string, fn: (emit: unknown) => unknown) => await fn(vi.fn()),
  ),
}))

import { ObjectId } from 'mongodb'
import { QueueState } from '../../database/models/queue-state.model'
import { get } from '../get'
import { getState } from '../get-state'
import { enterState } from './enter-state'
import { kickFromQueue } from './kick-from-queue'
import plugin from './plugins/ready-up-timeouts'

const queue = new ObjectId()

beforeEach(async () => {
  vi.clearAllMocks()
  await (plugin as unknown as () => Promise<void>)()
})

describe.each(['queue:readyUpTimeout', 'queue:unready'])('%s', name => {
  it('does nothing to a captain queue', async () => {
    vi.mocked(get).mockResolvedValue({ launchMode: 'captain' } as never)
    vi.mocked(getState).mockResolvedValue(QueueState.ready)

    await handlers.get(name)!({ queue })

    expect(enterState).not.toHaveBeenCalled()
    expect(kickFromQueue).not.toHaveBeenCalled()
  })
})
