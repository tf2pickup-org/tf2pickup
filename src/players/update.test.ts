import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { SteamId64 } from '../shared/types/steam-id-64'
import type { PlayerModel } from '../database/models/player.model'

vi.mock('./mutex', () => ({
  mutex: {
    runExclusive: vi.fn(),
  },
}))

vi.mock('../database/collections', () => ({
  collections: {
    players: {
      findOne: vi.fn(),
      findOneAndUpdate: vi.fn(),
    },
  },
}))

vi.mock('../events', () => ({
  events: {
    emit: vi.fn(),
  },
}))

vi.mock('../errors', () => ({
  errors: {
    notFound: vi.fn((msg: string) => new Error(msg)),
  },
}))

import { update } from './update'
import { mutex } from './mutex'
import { collections } from '../database/collections'
import { events } from '../events'

const steamId = '76561198000000000' as SteamId64
const adminId = '76561198000000001' as SteamId64
const mockBefore = { steamId, name: 'OldName', cooldownLevel: 0 } as PlayerModel
const mockAfter = { steamId, name: 'NewName', cooldownLevel: 1 } as PlayerModel

describe('update', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.mocked(mutex.runExclusive).mockImplementation(fn => fn())
    vi.mocked(collections.players.findOne).mockResolvedValue(mockBefore)
    vi.mocked(collections.players.findOneAndUpdate).mockResolvedValue(mockAfter)
  })

  it('throws not-found when player does not exist', async () => {
    vi.mocked(collections.players.findOne).mockResolvedValue(null)
    await expect(update(steamId, { $set: { name: 'X' } })).rejects.toThrow(
      'Player with steamId 76561198000000000 does not exist',
    )
  })

  it('applies a static update document', async () => {
    const staticUpdate = { $set: { name: 'NewName', cooldownLevel: 1 } }
    await update(steamId, staticUpdate)
    expect(collections.players.findOneAndUpdate).toHaveBeenCalledWith(
      { steamId },
      staticUpdate,
      expect.objectContaining({ returnDocument: 'after' }),
    )
  })

  it('applies a factory function, passing before to the factory', async () => {
    const factory = vi.fn().mockReturnValue({ $set: { name: 'NewName', cooldownLevel: 1 } })
    await update(steamId, factory)
    expect(factory).toHaveBeenCalledWith(mockBefore)
    expect(collections.players.findOneAndUpdate).toHaveBeenCalledWith(
      { steamId },
      { $set: { name: 'NewName', cooldownLevel: 1 } },
      expect.objectContaining({ returnDocument: 'after' }),
    )
  })

  it('emits player:updated with before, after, and adminId', async () => {
    await update(steamId, { $set: { name: 'NewName' } }, {}, adminId)
    expect(events.emit).toHaveBeenCalledWith('player:updated', {
      before: mockBefore,
      after: mockAfter,
      adminId,
    })
  })

  it('emits player:updated without adminId when not provided', async () => {
    await update(steamId, { $set: { name: 'NewName' } })
    expect(events.emit).toHaveBeenCalledWith('player:updated', {
      before: mockBefore,
      after: mockAfter,
      adminId: undefined,
    })
  })

  it('returns the updated player document', async () => {
    const result = await update(steamId, { $set: { name: 'NewName' } })
    expect(result).toBe(mockAfter)
  })

  it('passes extra options to findOneAndUpdate', async () => {
    await update(steamId, { $set: { name: 'NewName' } }, { upsert: true })
    expect(collections.players.findOneAndUpdate).toHaveBeenCalledWith(
      { steamId },
      expect.anything(),
      expect.objectContaining({ returnDocument: 'after', upsert: true }),
    )
  })
})
