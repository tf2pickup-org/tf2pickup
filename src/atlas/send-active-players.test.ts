import { createHash } from 'node:crypto'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { sendActivePlayers } from './send-active-players'
import { environment } from '../environment'
import { getActivePlayers } from '../statistics/get-active-players'
import { logger } from '../logger'
import type { SteamId64 } from '../shared/types/steam-id-64'

vi.mock('../environment', () => ({
  environment: {
    ATLAS_URL: 'https://atlas.tf2pickup.org',
    ATLAS_SECRET: 'supersecret',
    WEBSITE_URL: 'https://tf2pickup.pl',
  },
}))

vi.mock('../logger', () => ({
  logger: {
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

vi.mock('../statistics/get-active-players', () => ({
  getActivePlayers: vi.fn(),
}))

const fetchMock = vi.fn()

const sha256 = (value: string) => createHash('sha256').update(value).digest('hex')

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock)
  fetchMock.mockResolvedValue({ ok: true, status: 204 })
  vi.mocked(getActivePlayers).mockResolvedValue([
    { steamId: '76561197960287930' as SteamId64, lastActiveAt: new Date('2026-06-21T10:00:00Z') },
    { steamId: '76561197960287931' as SteamId64, lastActiveAt: new Date('2026-06-29T18:42:00Z') },
  ])
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
    await sendActivePlayers()
    expect(fetchMock).not.toHaveBeenCalled()
  })
})

describe('when ATLAS_SECRET is set', () => {
  it('should report the players as hashed ids with their last-active time', async () => {
    await sendActivePlayers()

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0]
    expect(url.toString()).toBe('https://atlas.tf2pickup.org/api/active-players')
    expect(init.method).toBe('PUT')
    expect(init.headers).toMatchObject({
      'Content-Type': 'application/json',
      Authorization: 'Bearer supersecret',
    })
    expect(JSON.parse(init.body)).toEqual({
      url: 'https://tf2pickup.pl',
      players: [
        { id: sha256('76561197960287930'), lastActiveAt: '2026-06-21T10:00:00.000Z' },
        { id: sha256('76561197960287931'), lastActiveAt: '2026-06-29T18:42:00.000Z' },
      ],
    })
  })

  it('should request players active within the last 30 days', async () => {
    const now = new Date('2026-06-30T00:00:00Z')
    vi.useFakeTimers()
    vi.setSystemTime(now)

    await sendActivePlayers()

    expect(getActivePlayers).toHaveBeenCalledWith(new Date('2026-05-31T00:00:00Z'))
    vi.useRealTimers()
  })

  it('should not send anything when there are no active players', async () => {
    vi.mocked(getActivePlayers).mockResolvedValue([])
    await sendActivePlayers()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  describe('and the request is rejected', () => {
    beforeEach(() => {
      fetchMock.mockResolvedValue({ ok: false, status: 403 })
    })

    it('should log a warning and not throw', async () => {
      await expect(sendActivePlayers()).resolves.toBeUndefined()
      expect(logger.warn).toHaveBeenCalledWith({ status: 403 }, 'atlas active players rejected')
    })
  })
})
