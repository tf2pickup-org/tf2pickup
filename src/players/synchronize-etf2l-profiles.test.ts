import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ObjectId } from 'mongodb'
import { synchronizeEtf2lProfiles } from './synchronize-etf2l-profiles'
import { etf2l } from '../etf2l'
import { Etf2lApiError } from '../etf2l/errors/etf2l-api.error'
import type { Etf2lProfile } from '../etf2l/types/etf2l-profile'
import { ETF2L_SYNC_PROGRESS_ID } from '../database/models/etf2l-sync-progress.model'

const findMock = vi.hoisted(() => vi.fn())
const playerUpdateOneMock = vi.hoisted(() => vi.fn())
const progressFindOneMock = vi.hoisted(() => vi.fn())
const progressInsertOneMock = vi.hoisted(() => vi.fn())
const progressFindOneAndUpdateMock = vi.hoisted(() => vi.fn())
const progressUpdateOneMock = vi.hoisted(() => vi.fn())
const progressDeleteOneMock = vi.hoisted(() => vi.fn())

vi.mock('../database/collections', () => ({
  collections: {
    players: {
      find: findMock,
      updateOne: playerUpdateOneMock,
    },
    etf2lSyncProgress: {
      findOne: progressFindOneMock,
      insertOne: progressInsertOneMock,
      findOneAndUpdate: progressFindOneAndUpdateMock,
      updateOne: progressUpdateOneMock,
      deleteOne: progressDeleteOneMock,
    },
  },
}))

vi.mock('../logger', () => ({
  logger: {
    info: vi.fn(),
    debug: vi.fn(),
  },
}))

vi.mock('../etf2l', () => ({
  etf2l: {
    getPlayerProfile: vi.fn(),
  },
}))

vi.mock('../environment', () => ({
  environment: {
    NODE_ENV: 'test',
  },
}))

interface TestPlayer {
  _id: ObjectId
  steamId: string
  etf2lProfileId?: number
}

function createCursor(documents: readonly TestPlayer[]) {
  return {
    sort() {
      return this
    },
    [Symbol.asyncIterator]() {
      let index = 0
      return {
        next: async (): Promise<IteratorResult<TestPlayer>> => {
          if (index >= documents.length) {
            return { done: true, value: undefined as TestPlayer }
          }

          return { done: false, value: documents[index++] }
        },
      }
    },
  }
}

function createEtf2lProfile(overrides: Partial<Etf2lProfile> = {}): Etf2lProfile {
  return {
    id: 1,
    name: 'Player',
    country: 'xx',
    classes: [],
    registered: 0,
    steam: {
      avatar: 'https://example.com/avatar.jpg',
      id: 'STEAM_0:0:1',
      id3: '[U:1:1]',
      id64: '76561198000000001',
    },
    bans: null,
    teams: null,
    title: 'Player',
    urls: {
      results: 'https://example.com/results',
      self: 'https://example.com/self',
      transfers: 'https://example.com/transfers',
    },
    ...overrides,
  }
}

describe('synchronizeEtf2lProfiles()', () => {
  beforeEach(() => {
    findMock.mockReset()
    playerUpdateOneMock.mockReset()
    progressFindOneMock.mockReset()
    progressInsertOneMock.mockReset()
    progressFindOneAndUpdateMock.mockReset()
    progressUpdateOneMock.mockReset()
    progressDeleteOneMock.mockReset()
    playerUpdateOneMock.mockResolvedValue(undefined)
    progressFindOneMock.mockResolvedValue(null)
    progressInsertOneMock.mockResolvedValue({
      acknowledged: true,
      insertedId: ETF2L_SYNC_PROGRESS_ID,
    })
    progressFindOneAndUpdateMock.mockResolvedValue({ value: null })
    progressUpdateOneMock.mockResolvedValue({
      matchedCount: 1,
      modifiedCount: 1,
      acknowledged: true,
    })
    progressDeleteOneMock.mockResolvedValue({ deletedCount: 1, acknowledged: true })
    vi.mocked(etf2l.getPlayerProfile).mockReset()
  })

  it('updates players that are missing etf2l ids', async () => {
    const players: TestPlayer[] = [{ _id: new ObjectId(), steamId: '1' }]
    findMock.mockReturnValue(createCursor(players))
    vi.mocked(etf2l.getPlayerProfile).mockResolvedValue(createEtf2lProfile({ id: 111 }))

    await synchronizeEtf2lProfiles()

    expect(playerUpdateOneMock).toHaveBeenCalledWith(
      { steamId: '1' },
      { $set: { etf2lProfileId: 111 } },
    )
    expectProgressUpdates(1)
    expectProgressSnapshot({
      processed: 1,
      updated: 1,
      removed: 0,
      skipped: 0,
      lastSteamId: '1',
    })
    expectProgressCleanup()
  })

  it('replaces outdated etf2l ids', async () => {
    const players: TestPlayer[] = [{ _id: new ObjectId(), steamId: '1', etf2lProfileId: 5 }]
    findMock.mockReturnValue(createCursor(players))
    vi.mocked(etf2l.getPlayerProfile).mockResolvedValue(createEtf2lProfile({ id: 10 }))

    await synchronizeEtf2lProfiles()

    expect(playerUpdateOneMock).toHaveBeenCalledWith(
      { steamId: '1' },
      { $set: { etf2lProfileId: 10 } },
    )
    expectProgressUpdates(1)
    expectProgressSnapshot({
      processed: 1,
      updated: 1,
      removed: 0,
      skipped: 0,
      lastSteamId: '1',
    })
    expectProgressCleanup()
  })

  it('removes ids when ETF2L is missing the player', async () => {
    const players: TestPlayer[] = [{ _id: new ObjectId(), steamId: '1', etf2lProfileId: 5 }]
    findMock.mockReturnValue(createCursor(players))
    vi.mocked(etf2l.getPlayerProfile).mockRejectedValue(
      new Etf2lApiError(
        'https://example.com/player/1',
        new Response(null, { status: 404 }),
        'Not Found',
      ),
    )

    await synchronizeEtf2lProfiles()

    expect(playerUpdateOneMock).toHaveBeenCalledWith(
      { steamId: '1' },
      { $unset: { etf2lProfileId: '' } },
    )
    expectProgressUpdates(1)
    expectProgressSnapshot({
      processed: 1,
      updated: 0,
      removed: 1,
      skipped: 0,
      lastSteamId: '1',
    })
    expectProgressCleanup()
  })

  it('skips updates when ids already match', async () => {
    const players: TestPlayer[] = [{ _id: new ObjectId(), steamId: '1', etf2lProfileId: 42 }]
    findMock.mockReturnValue(createCursor(players))
    vi.mocked(etf2l.getPlayerProfile).mockResolvedValue(createEtf2lProfile({ id: 42 }))

    await synchronizeEtf2lProfiles()

    expect(playerUpdateOneMock).not.toHaveBeenCalled()
    expectProgressUpdates(1)
    expectProgressSnapshot({
      processed: 1,
      updated: 0,
      removed: 0,
      skipped: 1,
      lastSteamId: '1',
    })
    expectProgressCleanup()
  })

  it('rethrows unexpected errors', async () => {
    const players: TestPlayer[] = [{ _id: new ObjectId(), steamId: '1' }]
    findMock.mockReturnValue(createCursor(players))
    vi.mocked(etf2l.getPlayerProfile).mockRejectedValue(new Error('boom'))

    await expect(synchronizeEtf2lProfiles()).rejects.toThrow('boom')
    expectProgressUpdates(0)
    expect(progressDeleteOneMock).not.toHaveBeenCalled()
  })

  it('resumes when a stale progress record exists', async () => {
    const lastPlayerObjectId = new ObjectId('00000000000000000000000a')
    const staleProgress = {
      _id: ETF2L_SYNC_PROGRESS_ID,
      processed: 2,
      updated: 1,
      removed: 0,
      skipped: 1,
      lastSteamId: 'prev',
      lastPlayerObjectId,
      startedAt: new Date(0),
      lastUpdatedAt: new Date(0),
    }
    progressFindOneMock.mockResolvedValue(staleProgress)
    progressFindOneAndUpdateMock.mockResolvedValue({ value: staleProgress })

    const nextPlayer: TestPlayer = {
      _id: new ObjectId('00000000000000000000000b'),
      steamId: 'next',
    }
    findMock.mockImplementation(filter => {
      expect(filter).toEqual({ _id: { $gt: lastPlayerObjectId } })
      return createCursor([nextPlayer])
    })
    vi.mocked(etf2l.getPlayerProfile).mockResolvedValue(createEtf2lProfile({ id: 222 }))

    await synchronizeEtf2lProfiles()

    expect(progressInsertOneMock).not.toHaveBeenCalled()
    expect(progressFindOneAndUpdateMock).toHaveBeenCalled()
    expectProgressCleanup()
  })

  it('throws when another sync is currently running', async () => {
    progressFindOneMock.mockResolvedValue({
      _id: ETF2L_SYNC_PROGRESS_ID,
      processed: 0,
      updated: 0,
      removed: 0,
      skipped: 0,
      startedAt: new Date(),
      lastUpdatedAt: new Date(),
    })

    await expect(synchronizeEtf2lProfiles()).rejects.toThrow('already running')
    expect(progressInsertOneMock).not.toHaveBeenCalled()
    expect(progressDeleteOneMock).not.toHaveBeenCalled()
  })
})

function expectProgressUpdates(expected: number) {
  expect(progressUpdateOneMock).toHaveBeenCalledTimes(expected)
}

function expectProgressCleanup() {
  expect(progressDeleteOneMock).toHaveBeenCalledTimes(1)
  expect(progressDeleteOneMock).toHaveBeenCalledWith({ _id: ETF2L_SYNC_PROGRESS_ID })
}

function expectProgressSnapshot({
  processed,
  updated,
  removed,
  skipped,
  lastSteamId,
}: {
  processed: number
  updated: number
  removed: number
  skipped: number
  lastSteamId: string
}) {
  const lastCall = progressUpdateOneMock.mock.calls[progressUpdateOneMock.mock.calls.length - 1]
  expect(lastCall?.[0]).toEqual({ _id: ETF2L_SYNC_PROGRESS_ID })
  expect(lastCall?.[1]?.$set).toMatchObject({
    processed,
    updated,
    removed,
    skipped,
    lastSteamId,
  })
}
