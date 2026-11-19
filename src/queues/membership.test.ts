import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../database/collections', () => ({
  collections: {
    queueSlots: { findOne: vi.fn() },
    captainPool: { findOne: vi.fn() },
  },
}))

import { ObjectId } from 'mongodb'
import { collections } from '../database/collections'
import type { QueueId } from '../database/models/queue.model'
import type { SteamId64 } from '../shared/types/steam-id-64'
import { membership } from './membership'

const queue = new ObjectId() as QueueId
const steamId = '76561198000000001' as SteamId64

describe('membership()', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.mocked(collections.queueSlots.findOne).mockResolvedValue(null)
    vi.mocked(collections.captainPool.findOne).mockResolvedValue(null)
  })

  it('finds a player in an auto queue slot', async () => {
    vi.mocked(collections.queueSlots.findOne).mockResolvedValue({ queue, ready: true } as never)
    expect(await membership(steamId)).toEqual({ queue, launchMode: 'auto', ready: true })
    expect(collections.queueSlots.findOne).toHaveBeenCalledWith({ 'player.steamId': steamId })
  })

  it('finds a player in a captain pool', async () => {
    vi.mocked(collections.captainPool.findOne).mockResolvedValue({ queue, ready: false } as never)
    expect(await membership(steamId)).toEqual({ queue, launchMode: 'captain', ready: false })
    expect(collections.captainPool.findOne).toHaveBeenCalledWith({ 'player.steamId': steamId })
  })

  it('returns null for a player in no queue', async () => {
    expect(await membership(steamId)).toBeNull()
  })
})
