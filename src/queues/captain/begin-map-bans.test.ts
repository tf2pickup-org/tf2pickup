import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ObjectId } from 'mongodb'
import type { QueueModel } from '../../database/models/queue.model'
import type { CaptainDraftModel } from '../../database/models/captain-draft.model'
import { collections } from '../../database/collections'
import { logger } from '../../logger'
import { captainDraftMetrics } from './metrics'
import { returnDraftToPool } from './return-draft-to-pool'
import { settleMapBans } from './settle-map-bans'
import { beginMapBans } from './begin-map-bans'
vi.mock('../../database/collections', () => ({
  collections: { queueState: { updateOne: vi.fn() } },
}))
vi.mock('../../logger', () => ({ logger: { error: vi.fn() } }))
vi.mock('./metrics', () => ({ captainDraftMetrics: { aborted: { add: vi.fn() } } }))
vi.mock('./return-draft-to-pool', () => ({ returnDraftToPool: vi.fn() }))
vi.mock('./settle-map-bans', () => ({ settleMapBans: vi.fn() }))
const queue = { _id: new ObjectId(), maps: [] } as unknown as QueueModel
const emit = vi.fn()
beforeEach(() => vi.clearAllMocks())

describe('beginMapBans()', () => {
  it.each([1, 2, 3])('passes %i eligible options to the ban/launch transition', async count => {
    const settings = {
      ...queue,
      maps: Array.from({ length: count }, (_, i) => ({ name: `cp_${i}` })),
    }
    const draft = { mapOptions: [], bans: [] } as unknown as CaptainDraftModel
    await beginMapBans(settings, draft, [], emit)
    expect(draft.mapOptions).toHaveLength(count)
    expect(settleMapBans).toHaveBeenCalledWith(settings, draft, emit, [])
    expect(returnDraftToPool).not.toHaveBeenCalled()
  })
  it('returns all signups, clears returning pre-ready and reports an empty map pool without launching', async () => {
    const draft = {} as CaptainDraftModel
    await beginMapBans(queue, draft, [], emit)
    expect(returnDraftToPool).toHaveBeenCalledWith(queue, draft, emit, [], true)
    expect(settleMapBans).not.toHaveBeenCalled()
    expect(collections.queueState.updateOne).not.toHaveBeenCalled()
    expect(captainDraftMetrics.aborted.add).toHaveBeenCalledWith(1, { reason: 'launch_failed' })
    expect(logger.error).toHaveBeenCalledWith(
      { queue: queue._id },
      'captain draft has no maps available',
    )
    expect(emit).toHaveBeenCalledWith('queue/captainDraft:failed', {
      queue: queue._id,
      message: 'No maps available',
    })
  })
})
