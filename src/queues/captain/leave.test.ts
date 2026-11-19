import { beforeEach, describe, expect, it, vi } from 'vitest'

const member = vi.hoisted(() => ({ value: undefined as unknown }))

vi.mock('../../database/collections', () => ({
  collections: {
    captainPool: { findOne: vi.fn(() => Promise.resolve(member.value)), deleteOne: vi.fn() },
  },
}))
vi.mock('../../logger', () => ({ logger: { info: vi.fn() } }))
vi.mock('../../pre-ready', () => ({ preReady: { cancel: vi.fn() } }))
vi.mock('./advance', () => ({ advance: vi.fn() }))
vi.mock('../get', () => ({ get: vi.fn().mockResolvedValue({ launchMode: 'captain' }) }))
vi.mock('../get-state', () => ({ getState: vi.fn().mockResolvedValue('drafting') }))
vi.mock('../auto/queue-command', () => ({
  queueCommand: vi.fn(
    async (_operation: string, fn: (emit: unknown) => unknown) => await fn(vi.fn()),
  ),
}))

import { ObjectId } from 'mongodb'
import { collections } from '../../database/collections'
import type { QueueId } from '../../database/models/queue.model'
import type { SteamId64 } from '../../shared/types/steam-id-64'
import { leave } from './leave'

const queue = new ObjectId() as QueueId
const player = '76561198000000001' as SteamId64

beforeEach(() => {
  vi.clearAllMocks()
})

describe('leave()', () => {
  it('rejects a crafted leave from a member locked into the draft', async () => {
    member.value = { player: { steamId: player }, locked: true }
    await expect(leave(queue, player)).rejects.toThrow('locked')
    expect(collections.captainPool.deleteOne).not.toHaveBeenCalled()
  })

  it('lets an unlocked member leave', async () => {
    member.value = { player: { steamId: player }, locked: false }
    await leave(queue, player)
    expect(collections.captainPool.deleteOne).toHaveBeenCalledWith({
      queue,
      'player.steamId': player,
    })
  })
})
