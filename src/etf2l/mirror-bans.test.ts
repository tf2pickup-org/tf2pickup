import { beforeEach, describe, expect, it, vi } from 'vitest'
import { addDays, getUnixTime, subDays } from 'date-fns'
import type { PlayerBan } from '../database/models/player.model'
import { hasActiveBan } from '../players/has-active-ban'

interface Update {
  $set: Record<string, unknown>
}
type ArrayFilter = Record<string, unknown>

const { config, store, players, events, activityLog } = vi.hoisted(() => {
  const store = { bans: [] as PlayerBan[], afterSnapshot: undefined as (() => void) | undefined }

  function matches(ban: PlayerBan, filter: ArrayFilter, id: string) {
    return Object.entries(filter).every(([key, condition]) => {
      const value = ban[key.slice(id.length + 1) as keyof PlayerBan]
      if (typeof condition !== 'object') return value === condition
      const c = condition as { $eq?: Date; $ne?: unknown }
      if (c.$eq) return (value as Date).getTime() === c.$eq.getTime()
      return value !== c.$ne
    })
  }

  function applyUpdate(update: Update, arrayFilters: ArrayFilter[]) {
    for (const [path, value] of Object.entries(update.$set)) {
      const [, id, field] = /^bans\.\$\[(\w+)\]\.(\w+)$/.exec(path)!
      const filter = arrayFilters.find(f => Object.keys(f).every(k => k.startsWith(`${id}.`)))!
      for (const ban of store.bans.filter(b => matches(b, filter, id!))) {
        Object.assign(ban, { [field!]: value })
      }
    }
  }

  const copy = () => store.bans.map(b => ({ ...b }))

  return {
    store,
    config: new Map<string, unknown>(),
    players: {
      bySteamId: vi.fn(async () => {
        const snapshot = { bans: copy() }
        store.afterSnapshot?.()
        return snapshot
      }),
      addBan: vi.fn(async ({ admin, ...ban }: Omit<PlayerBan, 'actor'> & { admin: 'bot' }) => {
        store.bans.push({ actor: admin, ...ban })
      }),
      update: vi.fn(
        async (
          _steamId: string,
          updateOrFactory: Update | ((before: { bans: PlayerBan[] }) => Update),
          options: { arrayFilters: ArrayFilter[] },
        ) => {
          const update =
            typeof updateOrFactory === 'function'
              ? updateOrFactory({ bans: copy() })
              : updateOrFactory
          applyUpdate(update, options.arrayFilters)
          return { bans: copy() }
        },
      ),
    },
    events: { emit: vi.fn() },
    activityLog: { record: vi.fn() },
  }
})

vi.mock('../configuration', () => ({
  configuration: { get: vi.fn(async (key: string) => config.get(key)) },
}))
vi.mock('../players', () => ({ players }))
vi.mock('../events', () => ({ events }))
vi.mock('../activity-log', () => ({ activityLog }))

import { mirrorBans } from './mirror-bans'

const steamId = '76561198074409147' as never
const start = subDays(new Date(), 1)
start.setMilliseconds(0)
const future = addDays(new Date(), 30)
future.setMilliseconds(0)

function etf2lBan(reason: string, end: Date, banStart = start) {
  return { start: getUnixTime(banStart), end: getUnixTime(end), reason }
}

describe('mirrorBans', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    store.bans.length = 0
    store.afterSnapshot = undefined
    config.set('players.etf2l_ban_sync', true)
    config.set('players.etf2l_ban_sync_reasons', ['cheating'])
  })

  it('mirrors a new active matching ban, once across runs', async () => {
    await mirrorBans(steamId, [etf2lBan('Cheating', future)])
    await mirrorBans(steamId, [etf2lBan('Cheating', future)])

    expect(players.addBan).toHaveBeenCalledExactlyOnceWith({
      player: steamId,
      admin: 'bot',
      start,
      end: future,
      reason: 'ETF2L.org: Cheating',
      source: 'etf2l',
    })
    expect(players.update).not.toHaveBeenCalled()
    expect(events.emit).not.toHaveBeenCalled()
  })

  it('ignores expired and non-matching bans', async () => {
    await mirrorBans(steamId, [
      etf2lBan('Cheating', subDays(new Date(), 1), subDays(new Date(), 10)),
      etf2lBan('Toxicity', future),
    ])
    expect(players.addBan).not.toHaveBeenCalled()
    expect(players.update).not.toHaveBeenCalled()
  })

  it('does nothing when the feature is off', async () => {
    config.set('players.etf2l_ban_sync', false)
    await mirrorBans(steamId, [etf2lBan('Cheating', future)])
    expect(players.bySteamId).not.toHaveBeenCalled()
    expect(players.addBan).not.toHaveBeenCalled()
  })

  describe('with an existing mirrored ban', () => {
    beforeEach(() => {
      store.bans.push({
        actor: 'bot',
        start,
        end: future,
        reason: 'ETF2L.org: Cheating',
        source: 'etf2l',
      })
    })

    it('applies a revert and emits ban:revoked once across runs', async () => {
      const revertedEnd = subDays(start, 1)
      await mirrorBans(steamId, [etf2lBan('Reverted', revertedEnd)])
      await mirrorBans(steamId, [etf2lBan('Reverted', revertedEnd)])

      expect(players.update).toHaveBeenCalledOnce()
      expect(store.bans[0]).toMatchObject({ end: revertedEnd, reason: 'ETF2L.org: Reverted' })
      expect(hasActiveBan(store)).toBe(false)
      expect(events.emit).toHaveBeenCalledExactlyOnceWith('player/ban:revoked', {
        player: steamId,
        ban: store.bans[0],
        admin: 'bot',
      })
      expect(activityLog.record).toHaveBeenCalledExactlyOnceWith({
        type: 'ban revoked',
        player: steamId,
        actor: 'bot',
        reason: 'ETF2L.org: Reverted',
      })
    })

    it('updates end silently regardless of the reason list', async () => {
      config.set('players.etf2l_ban_sync_reasons', ['aimbot'])
      const later = addDays(future, 10)
      await mirrorBans(steamId, [etf2lBan('Cheating', later)])
      expect(store.bans[0]!.end).toEqual(later)
      expect(events.emit).not.toHaveBeenCalled()
    })

    it('leaves a locally revoked ban untouched', async () => {
      const revokedAt = subDays(new Date(), 1)
      Object.assign(store.bans[0]!, { revokedLocally: true, end: revokedAt })
      await mirrorBans(steamId, [etf2lBan('Cheating', addDays(future, 10))])
      expect(store.bans[0]!.end).toEqual(revokedAt)
      expect(players.update).not.toHaveBeenCalled()
      expect(players.addBan).not.toHaveBeenCalled()
    })

    it('does not override an admin revocation that lands after the snapshot', async () => {
      const revokedAt = new Date()
      store.afterSnapshot = () =>
        Object.assign(store.bans[0]!, { revokedLocally: true, end: revokedAt })

      await mirrorBans(steamId, [etf2lBan('Cheating', addDays(future, 10))])
      expect(store.bans[0]).toMatchObject({ end: revokedAt, revokedLocally: true })

      await mirrorBans(steamId, [etf2lBan('Reverted', subDays(start, 1))])
      expect(store.bans[0]).toMatchObject({ end: revokedAt, revokedLocally: true })
      expect(events.emit).not.toHaveBeenCalled()
    })

    it('leaves it untouched when absent from ETF2L', async () => {
      await mirrorBans(steamId, [])
      expect(players.update).not.toHaveBeenCalled()
    })
  })

  it('never touches a local ban with the same start', async () => {
    store.bans.push({ actor: 'bot', start, end: future, reason: 'local' })
    await mirrorBans(steamId, [etf2lBan('Reverted', subDays(start, 1))])
    expect(store.bans[0]).toMatchObject({ end: future, reason: 'local' })
    expect(players.addBan).not.toHaveBeenCalled()
  })
})
