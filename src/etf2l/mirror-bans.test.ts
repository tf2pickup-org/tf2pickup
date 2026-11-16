import { beforeEach, describe, expect, it, vi } from 'vitest'
import { addDays, getUnixTime, subDays } from 'date-fns'
import type { PlayerBan } from '../database/models/player.model'
import { hasActiveBan } from '../players/has-active-ban'

const { config, bans, players, events, activityLog } = vi.hoisted(() => {
  const bans: PlayerBan[] = []
  return {
    bans,
    config: new Map<string, unknown>(),
    players: {
      bySteamId: vi.fn(async () => ({ bans: bans.map(b => ({ ...b })) })),
      addBan: vi.fn(),
      update: vi.fn(async (_steamId: string, update: { $set: Record<string, unknown> }) => {
        const ban = bans.find(b => b.source === 'etf2l')!
        ban.end = update.$set['bans.$[ban].end'] as Date
        ban.reason = update.$set['bans.$[ban].reason'] as string
        return { bans }
      }),
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
    bans.length = 0
    config.set('players.etf2l_ban_sync', true)
    config.set('players.etf2l_ban_sync_reasons', ['cheating'])
  })

  it('mirrors a new active matching ban', async () => {
    await mirrorBans(steamId, [etf2lBan('Cheating', future)])
    expect(players.addBan).toHaveBeenCalledExactlyOnceWith({
      player: steamId,
      admin: 'bot',
      start,
      end: future,
      reason: 'ETF2L.org: Cheating',
      source: 'etf2l',
    })
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
      bans.push({
        actor: 'bot',
        start,
        end: future,
        reason: 'ETF2L.org: Cheating',
        source: 'etf2l',
      })
    })

    it('applies a revert and emits ban:revoked once', async () => {
      const revertedEnd = subDays(start, 1)
      await mirrorBans(steamId, [etf2lBan('Reverted', revertedEnd)])

      expect(players.update).toHaveBeenCalledExactlyOnceWith(
        steamId,
        { $set: { 'bans.$[ban].end': revertedEnd, 'bans.$[ban].reason': 'ETF2L.org: Reverted' } },
        { arrayFilters: [{ 'ban.start': { $eq: start }, 'ban.source': 'etf2l' }] },
      )
      expect(hasActiveBan({ bans })).toBe(false)
      expect(events.emit).toHaveBeenCalledExactlyOnceWith('player/ban:revoked', {
        player: steamId,
        ban: bans[0],
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
      expect(players.update).toHaveBeenCalledOnce()
      expect(bans[0]!.end).toEqual(later)
      expect(events.emit).not.toHaveBeenCalled()
    })

    it('leaves a locally revoked ban untouched', async () => {
      bans[0]!.revokedLocally = true
      bans[0]!.end = subDays(new Date(), 1)
      await mirrorBans(steamId, [etf2lBan('Cheating', addDays(future, 10))])
      expect(players.update).not.toHaveBeenCalled()
      expect(players.addBan).not.toHaveBeenCalled()
    })

    it('is idempotent', async () => {
      await mirrorBans(steamId, [etf2lBan('Cheating', future)])
      expect(players.update).not.toHaveBeenCalled()
      expect(players.addBan).not.toHaveBeenCalled()
      expect(events.emit).not.toHaveBeenCalled()
    })

    it('leaves it untouched when absent from ETF2L', async () => {
      await mirrorBans(steamId, [])
      expect(players.update).not.toHaveBeenCalled()
    })
  })

  it('never touches a local ban with the same start', async () => {
    bans.push({ actor: 'bot', start, end: future, reason: 'local' })
    await mirrorBans(steamId, [etf2lBan('Reverted', subDays(start, 1))])
    expect(players.update).not.toHaveBeenCalled()
    expect(players.addBan).not.toHaveBeenCalled()
  })
})
