import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { sendActivity } from './send-activity'
import { environment } from '../environment'
import { getGameLaunchesPerDay } from '../statistics/get-game-launches-per-day'
import { logger } from '../logger'

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

vi.mock('../statistics/get-game-launches-per-day', () => ({
  getGameLaunchesPerDay: vi.fn(),
}))

const fetchMock = vi.fn()

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock)
  fetchMock.mockResolvedValue({ ok: true, status: 204 })
  vi.mocked(getGameLaunchesPerDay).mockResolvedValue([
    { day: '2026-06-21', count: 4 },
    { day: '2026-06-22', count: 7 },
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
    await sendActivity()
    expect(fetchMock).not.toHaveBeenCalled()
  })
})

describe('when ATLAS_SECRET is set', () => {
  it('should report the per-day counts as gamesLaunched', async () => {
    await sendActivity()

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0]
    expect(url.toString()).toBe('https://atlas.tf2pickup.org/api/activity')
    expect(init.method).toBe('PUT')
    expect(init.headers).toMatchObject({
      'Content-Type': 'application/json',
      Authorization: 'Bearer supersecret',
    })
    expect(JSON.parse(init.body)).toEqual({
      url: 'https://tf2pickup.pl',
      days: [
        { day: '2026-06-21', gamesLaunched: 4 },
        { day: '2026-06-22', gamesLaunched: 7 },
      ],
    })
  })

  it('should pass the since bound through to the aggregation', async () => {
    const since = new Date('2026-06-20T00:00:00Z')
    await sendActivity(since)
    expect(getGameLaunchesPerDay).toHaveBeenCalledWith(since)
  })

  it('should not send anything when there are no launches', async () => {
    vi.mocked(getGameLaunchesPerDay).mockResolvedValue([])
    await sendActivity()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  describe('and the request is rejected', () => {
    beforeEach(() => {
      fetchMock.mockResolvedValue({ ok: false, status: 403 })
    })

    it('should log a warning and not throw', async () => {
      await expect(sendActivity()).resolves.toBeUndefined()
      expect(logger.warn).toHaveBeenCalledWith({ status: 403 }, 'atlas activity rejected')
    })
  })
})
