import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { PlayerBan } from '../../database/models/player.model'
import type { SteamId64 } from '../../shared/types/steam-id-64'

const { update, bySteamId, emit, record } = vi.hoisted(() => ({
  update: vi.fn(),
  bySteamId: vi.fn(),
  emit: vi.fn(),
  record: vi.fn(),
}))

vi.mock('../update', () => ({ update }))
vi.mock('../by-steam-id', () => ({ bySteamId }))
vi.mock('../../events', () => ({ events: { emit } }))
vi.mock('../../activity-log', () => ({ activityLog: { record } }))

import { restrictions } from '.'

const now = new Date('2026-01-15T12:00:00Z')
const player = '76561198074409147' as SteamId64
const admin = '76561198074409148' as SteamId64

function restriction(overrides: Partial<PlayerBan> = {}): PlayerBan {
  return {
    actor: admin,
    start: new Date('2026-01-14T00:00:00Z'),
    end: new Date('2026-01-16T00:00:00Z'),
    reason: 'x',
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.useFakeTimers()
  vi.setSystemTime(now)
  bySteamId.mockResolvedValue({ steamId: admin })
})

afterEach(() => {
  vi.useRealTimers()
})

describe('isActive()', () => {
  it('is active until its end', () => {
    expect(restrictions.isActive(restriction())).toBe(true)
    expect(restrictions.isActive(restriction({ end: now }))).toBe(false)
  })

  it('counts a future-dated restriction as active', () => {
    expect(restrictions.isActive(restriction({ start: new Date('2026-02-01') }))).toBe(true)
  })
})

describe.each([
  {
    kind: 'ban' as const,
    field: 'bans' as const,
    added: 'player/ban:added',
    revoked: 'player/ban:revoked',
    payloadKey: 'ban',
    log: 'ban',
  },
  {
    kind: 'chatMute' as const,
    field: 'chatMutes' as const,
    added: 'player/chatMute:added',
    revoked: 'player/chatMute:revoked',
    payloadKey: 'chatMute',
    log: 'chat mute',
  },
])('$kind', ({ kind, field, added, revoked, payloadKey, log }) => {
  it('lists only active restrictions', () => {
    const expired = restriction({ end: new Date('2026-01-14T00:00:00Z') })
    const current = restriction()
    expect(restrictions.active({ [field]: [expired, current] } as never, kind)).toEqual([current])
    expect(restrictions.active({} as never, kind)).toEqual([])
  })

  it('builds a Mongo filter on the end date', () => {
    expect(restrictions.activeFilter(kind)).toEqual({ [`${field}.end`]: { $gt: now } })
  })

  it('adds, logs and emits', async () => {
    const end = new Date('2026-02-01')
    const result = await restrictions.add(kind, { player, actor: admin, end, reason: 'r' })
    expect(result).toEqual({ actor: admin, start: now, end, reason: 'r' })
    expect(update).toHaveBeenCalledExactlyOnceWith(player, { $push: { [field]: result } })
    expect(record).toHaveBeenCalledWith(
      expect.objectContaining({ type: `${log} added`, player, actor: admin }),
    )
    expect(emit).toHaveBeenCalledExactlyOnceWith(added, { player, [payloadKey]: result })
  })

  it('stores a bot actor without looking it up', async () => {
    await restrictions.add(kind, { player, actor: 'bot', end: now, reason: 'r' })
    expect(bySteamId).not.toHaveBeenCalled()
    expect(update).toHaveBeenCalledWith(player, {
      $push: { [field]: expect.objectContaining({ actor: 'bot' }) },
    })
  })

  it('revokes by start, logs and emits', async () => {
    const start = new Date('2026-01-14T00:00:00Z')
    const revokedRestriction = restriction({ start, end: now })
    update.mockResolvedValue({ steamId: player, [field]: [revokedRestriction] })

    const result = await restrictions.revoke(kind, { player, start, actor: admin })

    expect(result).toBe(revokedRestriction)
    const [, updateDoc, options] = update.mock.calls[0]! as [
      unknown,
      { $set: Record<string, unknown> },
      { arrayFilters: unknown[] },
    ]
    expect(updateDoc.$set[`${field}.$[restriction].end`]).toEqual(now)
    expect(options.arrayFilters[0]).toEqual({ 'restriction.start': { $eq: start } })
    expect(record).toHaveBeenCalledWith(
      expect.objectContaining({ type: `${log} revoked`, player, actor: admin }),
    )
    expect(emit).toHaveBeenCalledExactlyOnceWith(revoked, {
      player,
      [payloadKey]: revokedRestriction,
      admin,
    })
  })

  it('throws when there is nothing to revoke', async () => {
    update.mockResolvedValue({ steamId: player, [field]: [] })
    await expect(restrictions.revoke(kind, { player, start: now, actor: admin })).rejects.toThrow(
      /not found/,
    )
    expect(emit).not.toHaveBeenCalled()
  })
})

describe('revoking a ban', () => {
  it('marks a mirrored ETF2L ban as revoked locally in the same update', async () => {
    const start = new Date('2026-01-14T00:00:00Z')
    update.mockResolvedValue({ steamId: player, bans: [restriction({ start })] })

    await restrictions.revoke('ban', { player, start, actor: admin })

    expect(update).toHaveBeenCalledExactlyOnceWith(
      player,
      {
        $set: {
          'bans.$[restriction].end': now,
          'bans.$[mirrored].revokedLocally': true,
        },
      },
      {
        arrayFilters: [
          { 'restriction.start': { $eq: start } },
          { 'mirrored.start': { $eq: start }, 'mirrored.source': 'etf2l' },
        ],
      },
    )
  })

  it('a chat mute revoke leaves revokedLocally alone', async () => {
    const start = new Date('2026-01-14T00:00:00Z')
    update.mockResolvedValue({ steamId: player, chatMutes: [restriction({ start })] })

    await restrictions.revoke('chatMute', { player, start, actor: admin })

    expect(update).toHaveBeenCalledExactlyOnceWith(
      player,
      { $set: { 'chatMutes.$[restriction].end': now } },
      { arrayFilters: [{ 'restriction.start': { $eq: start } }] },
    )
  })
})
