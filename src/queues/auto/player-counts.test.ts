import { describe, expect, it, vi } from 'vitest'

vi.mock('../../database/collections', () => ({
  collections: { queueSlots: { countDocuments: vi.fn() } },
}))

import { ObjectId } from 'mongodb'
import { collections } from '../../database/collections'
import type { QueueId } from '../../database/models/queue.model'
import { playerCounts } from './player-counts'

describe('playerCounts()', () => {
  it('counts the taken slots', async () => {
    vi.mocked(collections.queueSlots.countDocuments).mockImplementation((async (filter?: object) =>
      filter && 'player' in filter ? 7 : 12) as never)
    expect(await playerCounts({ _id: new ObjectId() as QueueId })).toEqual({
      current: 7,
      required: 12,
    })
  })
})
