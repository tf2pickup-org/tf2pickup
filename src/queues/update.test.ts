import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ObjectId } from 'mongodb'
import { update } from './update'
import { collections } from '../database/collections'
import { activityLog } from '../activity-log'
import { events } from '../events'
import { get } from './get'
import type { QueueId } from '../database/models/queue.model'
import type { SteamId64 } from '../shared/types/steam-id-64'

vi.mock('../database/collections', () => ({
  collections: { queues: { updateOne: vi.fn() } },
}))
vi.mock('../activity-log', () => ({ activityLog: { record: vi.fn() } }))
vi.mock('../events', () => ({ events: { emit: vi.fn() } }))
vi.mock('./get', () => ({ get: vi.fn() }))

const queue = new ObjectId() as QueueId
const actor = '76561198000000001' as SteamId64

describe('update()', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(get).mockResolvedValue({
      slug: 'auto-6v6',
      skillThreshold: null,
      requireVerification: false,
    } as never)
  })

  it('sets only the given settings', async () => {
    await update(queue, { skillThreshold: 3 }, actor)

    expect(collections.queues.updateOne).toHaveBeenCalledWith(
      { _id: queue },
      { $set: { skillThreshold: 3 } },
    )
  })

  it('records every changed setting', async () => {
    await update(queue, { skillThreshold: 3, requireVerification: false }, actor)

    expect(activityLog.record).toHaveBeenCalledTimes(1)
    expect(activityLog.record).toHaveBeenCalledWith({
      type: 'configuration change',
      key: 'queues.auto-6v6.skillThreshold',
      actor,
    })
    expect(events.emit).toHaveBeenCalledWith('queue:updated', { queue })
  })

  it('rejects invalid settings', async () => {
    await expect(update(queue, { readyUpTimeout: -1 }, actor)).rejects.toThrow()
    expect(collections.queues.updateOne).not.toHaveBeenCalled()
  })
})
