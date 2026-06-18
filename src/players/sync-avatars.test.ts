import { describe, it, expect, vi, beforeEach } from 'vitest'

const { getUserSummary } = vi.hoisted(() => ({ getUserSummary: vi.fn() }))

vi.mock('steamapi', () => ({
  default: class {
    getUserSummary = getUserSummary
  },
}))

vi.mock('../environment', () => ({
  environment: { STEAM_API_KEY: 'test-key' },
}))

vi.mock('../shared/schemas/steam-id-64', () => ({
  steamId64: { parse: (value: string) => value },
}))

const toArray = vi.fn()
vi.mock('../database/collections', () => ({
  collections: {
    players: {
      find: vi.fn(() => ({ toArray })),
      bulkWrite: vi.fn(),
    },
  },
}))

vi.mock('../logger', () => ({
  logger: { warn: vi.fn(), debug: vi.fn() },
}))

import { collections } from '../database/collections'
import { syncAvatars } from './sync-avatars'

describe('syncAvatars', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    toArray.mockResolvedValue([])
  })

  it('does nothing when no players need syncing', async () => {
    toArray.mockResolvedValue([])

    await syncAvatars()

    expect(getUserSummary).not.toHaveBeenCalled()
    expect(collections.players.bulkWrite).not.toHaveBeenCalled()
  })

  it('updates avatars for the players Steam returns', async () => {
    toArray.mockResolvedValue([{ steamId: '11' }, { steamId: '22' }])
    getUserSummary.mockResolvedValue([
      { steamID: '11', avatar: { small: 's1', medium: 'm1', large: 'l1' } },
      { steamID: '22', avatar: { small: 's2', medium: 'm2', large: 'l2' } },
    ])

    await syncAvatars()

    expect(getUserSummary).toHaveBeenCalledWith(['11', '22'])
    expect(collections.players.bulkWrite).toHaveBeenCalledWith([
      {
        updateOne: {
          filter: { steamId: '11' },
          update: {
            $set: {
              avatar: { small: 's1', medium: 'm1', large: 'l1' },
              avatarLastSyncedAt: expect.any(Date),
            },
          },
        },
      },
      {
        updateOne: {
          filter: { steamId: '22' },
          update: {
            $set: {
              avatar: { small: 's2', medium: 'm2', large: 'l2' },
              avatarLastSyncedAt: expect.any(Date),
            },
          },
        },
      },
    ])
  })

  it('marks players Steam does not return as synced so they stop blocking the queue', async () => {
    toArray.mockResolvedValue([{ steamId: '11' }, { steamId: '99' }])
    getUserSummary.mockResolvedValue([
      { steamID: '11', avatar: { small: 's1', medium: 'm1', large: 'l1' } },
    ])

    await syncAvatars()

    expect(collections.players.bulkWrite).toHaveBeenCalledWith([
      {
        updateOne: {
          filter: { steamId: '11' },
          update: {
            $set: {
              avatar: { small: 's1', medium: 'm1', large: 'l1' },
              avatarLastSyncedAt: expect.any(Date),
            },
          },
        },
      },
      {
        updateMany: {
          filter: { steamId: { $in: ['99'] } },
          update: { $set: { avatarLastSyncedAt: expect.any(Date) } },
        },
      },
    ])
  })

  it('marks the whole batch as synced when Steam returns no players', async () => {
    toArray.mockResolvedValue([{ steamId: '11' }, { steamId: '22' }])
    getUserSummary.mockRejectedValue(new Error('No players found'))

    await syncAvatars()

    expect(collections.players.updateOne).not.toHaveBeenCalled()
    expect(collections.players.updateMany).toHaveBeenCalledWith(
      { steamId: { $in: ['11', '22'] } },
      { $set: { avatarLastSyncedAt: expect.any(Date) } },
    )
  })

  it('writes nothing when the Steam request fails', async () => {
    toArray.mockResolvedValue([{ steamId: '11' }])
    getUserSummary.mockRejectedValue(new Error('rate limited'))

    await syncAvatars()

    expect(collections.players.bulkWrite).not.toHaveBeenCalled()
  })
})
