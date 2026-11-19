import { describe, expect, it, vi } from 'vitest'

vi.mock('../../database/collections', () => ({
  collections: { captainPool: { countDocuments: vi.fn() } },
}))

import { ObjectId } from 'mongodb'
import { collections } from '../../database/collections'
import type { QueueId } from '../../database/models/queue.model'
import { Gamemode } from '../../shared/types/gamemode'
import { playerCounts } from './player-counts'

describe('playerCounts()', () => {
  it("counts the next game's pool, leaving out the running draft", async () => {
    const _id = new ObjectId() as QueueId
    vi.mocked(collections.captainPool.countDocuments).mockResolvedValue(5)
    expect(await playerCounts({ _id, gamemode: Gamemode.sixes })).toEqual({
      current: 5,
      required: 12,
    })
    expect(collections.captainPool.countDocuments).toHaveBeenCalledWith({
      queue: _id,
      locked: false,
    })
  })
})
