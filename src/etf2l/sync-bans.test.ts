import { beforeEach, describe, expect, it, vi } from 'vitest'
import { addDays, getUnixTime, subDays } from 'date-fns'
import type { PlayerBan } from '../database/models/player.model'

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

interface FixturePlayer {
  steamId: string
  bans: Partial<PlayerBan>[]
}

interface PlayersFilter {
  $or: [
    { steamId: { $in: string[] } },
    { bans: { $elemMatch: { source: string; revokedLocally: { $ne: true }; end: { $gt: Date } } } },
  ]
}

let players: FixturePlayer[] = []

// ponytail: evaluates only the query syncBans() builds, not general Mongo semantics
function matching({ $or: [discovered, mirrored] }: PlayersFilter) {
  const { source, revokedLocally, end } = mirrored.bans.$elemMatch
  return players
    .filter(
      player =>
        discovered.steamId.$in.includes(player.steamId) ||
        player.bans.some(
          ban =>
            ban.source === source &&
            ban.revokedLocally !== revokedLocally.$ne &&
            ban.end! > end.$gt,
        ),
    )
    .map(({ steamId }) => ({ steamId }))
}

async function load() {
  vi.resetModules()
  return (await import('./sync-bans')).syncBans
}

describe('syncBans()', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers({ now })
    get.mockResolvedValue(true)
    players = ['reg-1', 'reg-2', 'reg-3'].map(steamId => ({ steamId, bans: [] }))
    find.mockImplementation((filter: PlayersFilter) => ({
      toArray: () => Promise.resolve(matching(filter)),
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

  it('keeps hits from earlier pages when a later page fails', async () => {
    const syncBans = await load()
    getBans.mockImplementation((page: number) =>
      page === 1
        ? Promise.resolve([row('reg-1', 1), row('reg-2', 2)])
        : Promise.reject(new Error('500 Internal Server Error')),
    )

    await syncBans()

    expect(getBans.mock.calls).toEqual([[1], [2]])
    expect(schedule.mock.calls).toEqual([
      ['etf2l:syncPlayerProfile', 0, { player: 'reg-1' }],
      ['etf2l:syncPlayerProfile', 0, { player: 'reg-2' }],
    ])

    vi.clearAllMocks()
    getBans.mockResolvedValue([row('reg-1', 1), row('reg-2', 2)])

    await syncBans()

    expect(getBans).toHaveBeenCalledTimes(1)
    expect(schedule).not.toHaveBeenCalled()
  })

  it('stops on an empty page', async () => {
    const syncBans = await load()
    getBans.mockResolvedValue([])

    await syncBans()

    expect(getBans).toHaveBeenCalledTimes(1)
    expect(schedule).not.toHaveBeenCalled()
  })

  describe('players with mirrored bans', () => {
    const etf2lBan = { source: 'etf2l' as const, start: subDays(now, 10), end: addDays(now, 10) }

    beforeEach(() => {
      players.push(
        { steamId: 'active', bans: [etf2lBan] },
        { steamId: 'expired', bans: [{ ...etf2lBan, end: subDays(now, 1) }] },
        { steamId: 'revoked', bans: [{ ...etf2lBan, revokedLocally: true }] },
        { steamId: 'local', bans: [{ start: etf2lBan.start, end: etf2lBan.end }] },
      )
      getBans.mockResolvedValue([])
    })

    it('schedules only active, not locally revoked mirrored bans, every cycle', async () => {
      const syncBans = await load()

      await syncBans()
      await syncBans()

      expect(schedule.mock.calls).toEqual([
        ['etf2l:syncPlayerProfile', 0, { player: 'active' }],
        ['etf2l:syncPlayerProfile', 0, { player: 'active' }],
      ])
    })

    it('still schedules them when /bans fails', async () => {
      const syncBans = await load()
      getBans.mockRejectedValue(new Error('500 Internal Server Error'))

      await syncBans()

      expect(schedule.mock.calls).toEqual([['etf2l:syncPlayerProfile', 0, { player: 'active' }]])
    })

    it('schedules nothing when the feature is off', async () => {
      const syncBans = await load()
      get.mockResolvedValue(false)

      await syncBans()

      expect(find).not.toHaveBeenCalled()
      expect(schedule).not.toHaveBeenCalled()
    })

    it('schedules a discovery hit with an active mirrored ban once', async () => {
      const syncBans = await load()
      getBans.mockResolvedValue([row('active', 1)])

      await syncBans()

      expect(schedule.mock.calls).toEqual([['etf2l:syncPlayerProfile', 0, { player: 'active' }]])
    })
  })
})
