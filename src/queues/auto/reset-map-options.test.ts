import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ObjectId } from 'mongodb'
import { resetMapOptions } from './reset-map-options'
import { collections } from '../../database/collections'
import { events } from '../../events'
import { get } from '../get'
import type { QueueId } from '../../database/models/queue.model'

vi.mock('../../database/collections', () => ({
  collections: {
    queueMapOptions: { deleteMany: vi.fn(), insertMany: vi.fn() },
    queueMapVotes: { deleteMany: vi.fn() },
  },
}))
vi.mock('../../events', () => ({ events: { emit: vi.fn() } }))
vi.mock('../get', () => ({ get: vi.fn() }))

const queue = new ObjectId() as QueueId
const emit = vi.fn()

function withMaps(maps: { name: string; cooldown?: number }[]) {
  vi.mocked(get).mockResolvedValue({ maps } as never)
}

describe('resetMapOptions()', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('offers three maps that are not on cooldown', async () => {
    withMaps([
      { name: 'a' },
      { name: 'b', cooldown: 0 },
      { name: 'c', cooldown: 1 },
      { name: 'd' },
      { name: 'e', cooldown: 2 },
    ])

    await resetMapOptions(queue, emit)

    const [[options]] = vi.mocked(collections.queueMapOptions.insertMany).mock.calls as [
      [{ queue: QueueId; name: string }[]],
    ]
    expect(options.map(({ name }) => name).sort()).toEqual(['a', 'b', 'd'])
    expect(options.every(option => option.queue === queue)).toBe(true)
    expect(collections.queueMapVotes.deleteMany).toHaveBeenCalledWith({ queue })
  })

  it('defers the reset event to the queue command', async () => {
    withMaps([{ name: 'a' }])

    await resetMapOptions(queue, emit)

    expect(emit).toHaveBeenCalledOnce()
    expect(events.emit).not.toHaveBeenCalled()
  })

  it('offers fewer maps when fewer are off cooldown', async () => {
    withMaps([{ name: 'a' }, { name: 'b' }, { name: 'c', cooldown: 2 }])

    await resetMapOptions(queue, emit)

    expect(emit).toHaveBeenCalledWith('queue/mapOptions:reset', {
      queue,
      mapOptions: expect.arrayContaining(['a', 'b']) as string[],
    })
  })

  it('offers nothing when every map is on cooldown', async () => {
    withMaps([{ name: 'a', cooldown: 1 }])

    await resetMapOptions(queue, emit)

    expect(collections.queueMapOptions.insertMany).not.toHaveBeenCalled()
    expect(emit).toHaveBeenCalledWith('queue/mapOptions:reset', { queue, mapOptions: [] })
  })
})
