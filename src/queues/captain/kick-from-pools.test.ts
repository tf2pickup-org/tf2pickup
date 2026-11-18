import { beforeEach, describe, expect, it, vi } from 'vitest'

const found = vi.hoisted(() => ({ entries: [] as unknown[] }))

vi.mock('../../database/collections', () => ({
  collections: {
    captainPool: {
      find: vi.fn(() => ({ toArray: () => Promise.resolve(found.entries) })),
      deleteOne: vi.fn(),
    },
  },
}))
vi.mock('../../logger', () => ({ logger: { info: vi.fn() } }))
vi.mock('../../pre-ready', () => ({ preReady: { cancel: vi.fn() } }))
vi.mock('./advance', () => ({ advance: vi.fn() }))
vi.mock('../auto/queue-command', () => ({
  queueCommand: vi.fn(
    async (_operation: string, fn: (emit: unknown) => unknown) => await fn(vi.fn()),
  ),
}))

import { ObjectId } from 'mongodb'
import { collections } from '../../database/collections'
import type { SteamId64 } from '../../shared/types/steam-id-64'
import { kickFromPools } from './kick-from-pools'

const player = '76561198000000001' as SteamId64

beforeEach(() => {
  vi.clearAllMocks()
  found.entries = []
})

describe('kickFromPools()', () => {
  it('only ever looks at the members who are not locked into a draft', async () => {
    await kickFromPools(player)
    expect(collections.captainPool.find).toHaveBeenCalledWith({
      'player.steamId': { $in: [player] },
      locked: false,
    })
  })

  it('leaves a locked member alone: nothing is removed', async () => {
    await kickFromPools(player)
    expect(collections.captainPool.deleteOne).not.toHaveBeenCalled()
  })

  it('removes an unlocked member', async () => {
    const queue = new ObjectId()
    found.entries = [{ queue, player: { steamId: player } }]
    await kickFromPools(player)
    expect(collections.captainPool.deleteOne).toHaveBeenCalledWith({
      queue,
      'player.steamId': player,
    })
  })
})
