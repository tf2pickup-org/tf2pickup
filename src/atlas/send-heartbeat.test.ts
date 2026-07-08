import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { sendHeartbeat } from './send-heartbeat'
import { environment } from '../environment'
import { collections } from '../database/collections'
import { logger } from '../logger'

vi.mock('../environment', () => ({
  environment: {
    ATLAS_URL: 'https://atlas.tf2pickup.org',
    ATLAS_SECRET: 'supersecret',
    WEBSITE_URL: 'https://tf2pickup.pl',
    WEBSITE_NAME: 'tf2pickup.pl',
    ENABLED_GAMEMODES: '6v6',
  },
}))

vi.mock('../version', () => ({
  version: '1.2.3',
}))

vi.mock('../logger', () => ({
  logger: {
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

vi.mock('../database/collections', () => ({
  collections: {
    queueSlots: {
      countDocuments: vi.fn(),
    },
    onlinePlayers: {
      countDocuments: vi.fn(),
    },
    games: {
      countDocuments: vi.fn(),
    },
  },
}))

const fetchMock = vi.fn()

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock)
  fetchMock.mockResolvedValue({ ok: true, status: 204 })
  vi.mocked(collections.queueSlots.countDocuments).mockImplementation(async (filter?: unknown) =>
    filter ? 7 : 12,
  )
  vi.mocked(collections.onlinePlayers.countDocuments).mockResolvedValue(23)
  vi.mocked(collections.games.countDocuments).mockResolvedValue(2)
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.clearAllMocks()
})

describe('when ATLAS_SECRET is not set', () => {
  beforeEach(() => {
    environment.ATLAS_SECRET = undefined
  })

  afterEach(() => {
    environment.ATLAS_SECRET = 'supersecret'
  })

  it('should not send anything', async () => {
    await sendHeartbeat()
    expect(fetchMock).not.toHaveBeenCalled()
  })
})

describe('when ATLAS_SECRET is set', () => {
  it('should send the heartbeat', async () => {
    await sendHeartbeat()

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0]
    expect(url.toString()).toBe('https://atlas.tf2pickup.org/api/heartbeat')
    expect(init.method).toBe('PUT')
    expect(init.headers).toMatchObject({
      'Content-Type': 'application/json',
      Authorization: 'Bearer supersecret',
    })
    expect(JSON.parse(init.body)).toEqual({
      url: 'https://tf2pickup.pl',
      name: 'tf2pickup.pl',
      version: '1.2.3',
      queue: {
        config: '6v6',
        occupied: 7,
        capacity: 12,
      },
      onlinePlayers: 23,
      liveGames: 2,
    })
  })

  describe('and the heartbeat is rejected', () => {
    beforeEach(() => {
      fetchMock.mockResolvedValue({ ok: false, status: 403 })
    })

    it('should log a warning and not throw', async () => {
      await expect(sendHeartbeat()).resolves.toBeUndefined()
      expect(logger.warn).toHaveBeenCalledWith({ status: 403 }, 'atlas heartbeat rejected')
    })
  })
})
