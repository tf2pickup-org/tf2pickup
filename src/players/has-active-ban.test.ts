import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { hasActiveBan } from './has-active-ban'
import type { PlayerModel } from '../database/models/player.model'
import type { SteamId64 } from '../shared/types/steam-id-64'

const now = new Date('2026-01-15T12:00:00Z')

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(now)
})

afterEach(() => {
  vi.useRealTimers()
})

const basePlayer = {
  steamId: '76561198074409147',
} as Pick<PlayerModel, 'steamId' | 'bans'>

describe('hasActiveBan()', () => {
  it('returns false when bans is undefined', () => {
    expect(hasActiveBan({ ...basePlayer })).toBe(false)
  })

  it('returns false when bans is empty', () => {
    expect(hasActiveBan({ ...basePlayer, bans: [] })).toBe(false)
  })

  it('returns false when all bans have expired', () => {
    expect(
      hasActiveBan({
        ...basePlayer,
        bans: [
          {
            actor: '76561198074409148' as SteamId64,
            start: new Date('2026-01-10T00:00:00Z'),
            end: new Date('2026-01-14T00:00:00Z'), // before now
            reason: 'cheating',
          },
        ],
      }),
    ).toBe(false)
  })

  it('returns true when there is an active ban', () => {
    expect(
      hasActiveBan({
        ...basePlayer,
        bans: [
          {
            actor: '76561198074409148' as SteamId64,
            start: new Date('2026-01-14T00:00:00Z'),
            end: new Date('2026-01-16T00:00:00Z'), // after now
            reason: 'cheating',
          },
        ],
      }),
    ).toBe(true)
  })

  it('returns true when one of multiple bans is active', () => {
    expect(
      hasActiveBan({
        ...basePlayer,
        bans: [
          {
            actor: '76561198074409148' as SteamId64,
            start: new Date('2026-01-01T00:00:00Z'),
            end: new Date('2026-01-10T00:00:00Z'), // expired
            reason: 'cheating',
          },
          {
            actor: '76561198074409148' as SteamId64,
            start: new Date('2026-01-14T00:00:00Z'),
            end: new Date('2026-01-20T00:00:00Z'), // active
            reason: 'griefing',
          },
        ],
      }),
    ).toBe(true)
  })
})
