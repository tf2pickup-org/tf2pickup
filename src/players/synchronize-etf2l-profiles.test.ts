import { beforeEach, describe, expect, it, vi } from 'vitest'
import { synchronizeEtf2lProfiles } from './synchronize-etf2l-profiles'
import { etf2l } from '../etf2l'
import { Etf2lApiError } from '../etf2l/errors/etf2l-api.error'
import type { Etf2lProfile } from '../etf2l/types/etf2l-profile'

const findMock = vi.hoisted(() => vi.fn())
const updateOneMock = vi.hoisted(() => vi.fn())
const progressUpdateMock = vi.hoisted(() => vi.fn())
const progressDeleteMock = vi.hoisted(() => vi.fn())

vi.mock('../database/collections', () => ({
  collections: {
    players: {
      find: findMock,
      updateOne: updateOneMock,
    },
    etf2lSyncProgress: {
      updateOne: progressUpdateMock,
      deleteMany: progressDeleteMock,
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
  steamId: string
  etf2lProfileId?: number
}

function createCursor(documents: readonly TestPlayer[]) {
  return (async function* () {
    for (const document of documents) {
      yield document
    }
  })()
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
    updateOneMock.mockReset()
    progressUpdateMock.mockReset()
    progressDeleteMock.mockReset()
    updateOneMock.mockResolvedValue(undefined)
    progressUpdateMock.mockResolvedValue(undefined)
    progressDeleteMock.mockResolvedValue(undefined)
    vi.mocked(etf2l.getPlayerProfile).mockReset()
  })

  it('updates players that are missing etf2l ids', async () => {
    const players: TestPlayer[] = [{ steamId: '1' }]
    findMock.mockReturnValue(createCursor(players))
    vi.mocked(etf2l.getPlayerProfile).mockResolvedValue(createEtf2lProfile({ id: 111 }))

    await synchronizeEtf2lProfiles()

    expect(updateOneMock).toHaveBeenCalledWith({ steamId: '1' }, { $set: { etf2lProfileId: 111 } })
    expectProgressUpdates(2)
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
    const players: TestPlayer[] = [{ steamId: '1', etf2lProfileId: 5 }]
    findMock.mockReturnValue(createCursor(players))
    vi.mocked(etf2l.getPlayerProfile).mockResolvedValue(createEtf2lProfile({ id: 10 }))

    await synchronizeEtf2lProfiles()

    expect(updateOneMock).toHaveBeenCalledWith({ steamId: '1' }, { $set: { etf2lProfileId: 10 } })
    expectProgressUpdates(2)
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
    const players: TestPlayer[] = [{ steamId: '1', etf2lProfileId: 5 }]
    findMock.mockReturnValue(createCursor(players))
    vi.mocked(etf2l.getPlayerProfile).mockRejectedValue(
      new Etf2lApiError(
        'https://example.com/player/1',
        new Response(null, { status: 404 }),
        'Not Found',
      ),
    )

    await synchronizeEtf2lProfiles()

    expect(updateOneMock).toHaveBeenCalledWith({ steamId: '1' }, { $unset: { etf2lProfileId: '' } })
    expectProgressUpdates(2)
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
    const players: TestPlayer[] = [{ steamId: '1', etf2lProfileId: 42 }]
    findMock.mockReturnValue(createCursor(players))
    vi.mocked(etf2l.getPlayerProfile).mockResolvedValue(createEtf2lProfile({ id: 42 }))

    await synchronizeEtf2lProfiles()

    expect(updateOneMock).not.toHaveBeenCalled()
    expectProgressUpdates(2)
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
    const players: TestPlayer[] = [{ steamId: '1' }]
    findMock.mockReturnValue(createCursor(players))
    vi.mocked(etf2l.getPlayerProfile).mockRejectedValue(new Error('boom'))

    await expect(synchronizeEtf2lProfiles()).rejects.toThrow('boom')
    expectProgressUpdates(1)
    expect(progressDeleteMock).not.toHaveBeenCalled()
  })
})

function expectProgressUpdates(expected: number) {
  expect(progressUpdateMock).toHaveBeenCalledTimes(expected)
}

function expectProgressCleanup() {
  expect(progressDeleteMock).toHaveBeenCalledTimes(1)
  expect(progressDeleteMock).toHaveBeenCalledWith({})
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
  const lastCall = progressUpdateMock.mock.calls[progressUpdateMock.mock.calls.length - 1]
  expect(lastCall?.[0]).toEqual({})
  expect(lastCall?.[1]?.$set).toMatchObject({
    processed,
    updated,
    removed,
    skipped,
    lastSteamId,
  })
}
