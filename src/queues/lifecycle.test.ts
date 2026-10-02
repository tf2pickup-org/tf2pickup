import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ObjectId } from 'mongodb'
import { collections } from '../database/collections'
import type { QueueId } from '../database/models/queue.model'
import type { SteamId64 } from '../shared/types/steam-id-64'
import { create } from './create'
import { disable } from './disable'
import { enable } from './enable'
import { get } from './get'
import { move } from './move'
import { remove } from './remove'
import { reset } from './auto/reset'
import { kick } from './auto/kick'

vi.mock('../database/collections', () => {
  const collection = () => ({
    countDocuments: vi.fn(),
    deleteMany: vi.fn(),
    deleteOne: vi.fn(),
    find: vi.fn(() => ({ toArray: vi.fn().mockResolvedValue([]) })),
    findOne: vi.fn(),
    insertOne: vi.fn(),
    updateOne: vi.fn(),
  })
  return {
    collections: {
      queues: collection(),
      queueSlots: collection(),
      queueState: collection(),
      queueMapOptions: collection(),
      queueMapVotes: collection(),
      queueFriends: collection(),
    },
  }
})
vi.mock('../activity-log', () => ({ activityLog: { record: vi.fn() } }))
vi.mock('../events', () => ({ events: { emit: vi.fn() } }))
vi.mock('../tasks', () => ({ tasks: { cancel: vi.fn() } }))
vi.mock('./get', () => ({ get: vi.fn() }))
vi.mock('./auto/reset', () => ({ reset: vi.fn() }))
vi.mock('./auto/kick', () => ({ kick: vi.fn() }))
vi.mock('./with-queue-lock', () => ({
  withQueueLock: vi.fn(async (_q: unknown, _op: string, fn: () => Promise<unknown>) => await fn()),
}))

const id = new ObjectId() as QueueId
const actor = '76561198000000001' as SteamId64
const maps = [{ name: 'a' }, { name: 'b' }, { name: 'c' }]

function withQueue(queue: object) {
  vi.mocked(get).mockResolvedValue({ _id: id, slug: 'q', position: 3, maps, ...queue } as never)
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('create()', () => {
  it('adds a disabled queue after the last one', async () => {
    vi.mocked(collections.queues.countDocuments).mockResolvedValue(0)
    vi.mocked(collections.queues.findOne).mockResolvedValue({ position: 5 } as never)

    const queue = await create(
      { slug: 'new-queue', name: 'New', gamemode: '6v6' as never, launchMode: 'auto' },
      maps,
      actor,
    )

    expect(queue).toMatchObject({ slug: 'new-queue', position: 6, enabled: false, maps })
    expect(collections.queues.insertOne).toHaveBeenCalledWith(queue)
  })

  it('rejects a slug that is taken', async () => {
    vi.mocked(collections.queues.countDocuments).mockResolvedValue(1)
    await expect(
      create({ slug: 'taken', name: 'x', gamemode: '6v6' as never, launchMode: 'auto' }, [], actor),
    ).rejects.toThrow('queue taken already exists')
  })

  it('rejects an invalid slug', async () => {
    await expect(
      create(
        { slug: 'Bad Slug', name: 'x', gamemode: '6v6' as never, launchMode: 'auto' },
        [],
        actor,
      ),
    ).rejects.toThrow()
    expect(collections.queues.insertOne).not.toHaveBeenCalled()
  })
})

describe('enable()', () => {
  it('enables the queue and sets up its slots', async () => {
    withQueue({ enabled: false })
    await enable(id, actor)
    expect(collections.queues.updateOne).toHaveBeenCalledWith(
      { _id: id },
      { $set: { enabled: true } },
    )
    expect(reset).toHaveBeenCalledWith(id)
  })

  it('refuses a queue with fewer than 3 maps', async () => {
    withQueue({ enabled: false, maps: [{ name: 'a' }] })
    await expect(enable(id, actor)).rejects.toThrow('at least 3 maps')
    expect(reset).not.toHaveBeenCalled()
  })
})

describe('disable()', () => {
  it('refuses to disable the last enabled queue', async () => {
    withQueue({ enabled: true })
    vi.mocked(collections.queues.countDocuments).mockResolvedValue(1)
    await expect(disable(id, actor)).rejects.toThrow('at least one queue must stay enabled')
    expect(collections.queues.updateOne).not.toHaveBeenCalled()
  })

  it('kicks the players and clears the runtime state', async () => {
    withQueue({ enabled: true })
    vi.mocked(collections.queues.countDocuments).mockResolvedValue(2)
    vi.mocked(collections.queueSlots.find).mockReturnValue({
      toArray: vi.fn().mockResolvedValue([{ player: { steamId: actor } }]),
    } as never)

    await disable(id, actor)

    expect(collections.queues.updateOne).toHaveBeenCalledWith(
      { _id: id },
      { $set: { enabled: false } },
    )
    expect(kick).toHaveBeenCalledWith(actor)
    for (const collection of [
      collections.queueSlots,
      collections.queueState,
      collections.queueMapOptions,
      collections.queueMapVotes,
      collections.queueFriends,
    ]) {
      expect(collection.deleteMany).toHaveBeenCalledWith({ queue: id })
    }
  })
})

describe('remove()', () => {
  it('refuses an enabled queue', async () => {
    withQueue({ enabled: true })
    await expect(remove(id, actor)).rejects.toThrow('disable the queue before deleting it')
    expect(collections.queues.deleteOne).not.toHaveBeenCalled()
  })

  it('deletes a disabled queue', async () => {
    withQueue({ enabled: false })
    await remove(id, actor)
    expect(collections.queues.deleteOne).toHaveBeenCalledWith({ _id: id })
  })
})

describe('move()', () => {
  it('swaps positions with the neighbour above', async () => {
    withQueue({})
    const neighbour = { _id: new ObjectId(), position: 1 }
    vi.mocked(collections.queues.findOne).mockResolvedValue(neighbour as never)

    await move(id, 'up')

    expect(collections.queues.findOne).toHaveBeenCalledWith(
      { position: { $lt: 3 } },
      { sort: { position: -1 } },
    )
    expect(collections.queues.updateOne).toHaveBeenCalledWith(
      { _id: id },
      { $set: { position: 1 } },
    )
    expect(collections.queues.updateOne).toHaveBeenCalledWith(
      { _id: neighbour._id },
      { $set: { position: 3 } },
    )
  })

  it('does nothing at the edge', async () => {
    withQueue({})
    vi.mocked(collections.queues.findOne).mockResolvedValue(null)
    await move(id, 'down')
    expect(collections.queues.updateOne).not.toHaveBeenCalled()
  })
})
