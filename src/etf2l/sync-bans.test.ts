import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getUnixTime, subDays } from 'date-fns'

const { getBans, get, schedule, find } = vi.hoisted(() => ({
  getBans: vi.fn(),
  get: vi.fn(),
  schedule: vi.fn(),
  find: vi.fn(),
}))

vi.mock('./get-bans', () => ({ getBans }))
vi.mock('../configuration', () => ({ configuration: { get } }))
vi.mock('../tasks', () => ({ tasks: { schedule } }))
vi.mock('../logger', () => ({ logger: { warn: vi.fn() } }))
vi.mock('../database/collections', () => ({ collections: { players: { find } } }))

const now = new Date('2026-11-16T12:00:00Z')
const daysAgo = (days: number) => getUnixTime(subDays(now, days))
const row = (steamid64: string, days: number) => ({ steamid64, start: daysAgo(days) })

async function load() {
  vi.resetModules()
  return (await import('./sync-bans')).syncBans
}

describe('syncBans()', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers({ now })
    get.mockResolvedValue(true)
    find.mockImplementation((filter: { steamId: { $in: string[] } }) => ({
      toArray: () =>
        Promise.resolve(
          filter.steamId.$in.filter(id => id.startsWith('reg')).map(steamId => ({ steamId })),
        ),
    }))
  })

  it('pages until it crosses the watermark and schedules registered players once', async () => {
    const syncBans = await load()
    getBans.mockImplementation((page: number) =>
      Promise.resolve(
        page === 1
          ? [row('reg-1', 1), row('unregistered', 2), row('reg-1', 3)]
          : [row('reg-2', 20), row('reg-3', 60)],
      ),
    )

    await syncBans()

    expect(getBans.mock.calls).toEqual([[1], [2]])
    expect(find).toHaveBeenCalledWith(
      { steamId: { $in: ['reg-1', 'unregistered', 'reg-2'] } },
      expect.anything(),
    )
    expect(schedule.mock.calls).toEqual([
      ['etf2l:syncPlayerProfile', 0, { player: 'reg-1' }],
      ['etf2l:syncPlayerProfile', 0, { player: 'reg-2' }],
    ])

    vi.clearAllMocks()
    getBans.mockResolvedValue([row('reg-1', 1), row('reg-2', 20)])

    await syncBans()

    expect(getBans).toHaveBeenCalledTimes(1)
    expect(schedule).not.toHaveBeenCalled()
  })

  it('makes no request when the feature is off', async () => {
    const syncBans = await load()
    get.mockResolvedValue(false)

    await syncBans()

    expect(getBans).not.toHaveBeenCalled()
  })

  it('keeps the watermark and does not throw when getBans fails', async () => {
    const syncBans = await load()
    getBans.mockRejectedValue(new Error('429 Too Many Requests'))

    await expect(syncBans()).resolves.toBeUndefined()
    expect(schedule).not.toHaveBeenCalled()

    getBans.mockResolvedValue([row('reg-1', 1), row('reg-2', 40)])

    await syncBans()

    expect(schedule.mock.calls).toEqual([['etf2l:syncPlayerProfile', 0, { player: 'reg-1' }]])
  })

  it('stops on an empty page', async () => {
    const syncBans = await load()
    getBans.mockResolvedValue([])

    await syncBans()

    expect(getBans).toHaveBeenCalledTimes(1)
    expect(find).not.toHaveBeenCalled()
  })
})
