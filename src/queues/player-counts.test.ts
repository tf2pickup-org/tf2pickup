import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../database/collections', () => ({
  collections: {
    queueSlots: { countDocuments: vi.fn() },
    captainPool: { countDocuments: vi.fn() },
  },
}))

import { ObjectId } from 'mongodb'
import { collections } from '../database/collections'
import type { QueueId } from '../database/models/queue.model'
import { Gamemode } from '../shared/types/gamemode'
import { playerCounts } from './player-counts'

const _id = new ObjectId() as QueueId

describe('playerCounts()', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('counts the taken slots of an auto queue', async () => {
    vi.mocked(collections.queueSlots.countDocuments).mockImplementation((async (filter?: object) =>
      filter && 'player' in filter ? 7 : 12) as never)
    expect(await playerCounts({ _id, gamemode: Gamemode.sixes, launchMode: 'auto' })).toEqual({
      current: 7,
      required: 12,
    })
    expect(collections.captainPool.countDocuments).not.toHaveBeenCalled()
  })

  it("counts a captain queue's next-game pool, leaving out the running draft", async () => {
    vi.mocked(collections.captainPool.countDocuments).mockResolvedValue(5)
    expect(await playerCounts({ _id, gamemode: Gamemode.sixes, launchMode: 'captain' })).toEqual({
      current: 5,
      required: 12,
    })
    expect(collections.captainPool.countDocuments).toHaveBeenCalledWith({
      queue: _id,
      locked: false,
    })
    expect(collections.queueSlots.countDocuments).not.toHaveBeenCalled()
  })
})
