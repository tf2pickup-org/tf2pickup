import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest'
import { substituteBlocker } from './substitute-blocker'
import type { SteamId64 } from '../shared/types/steam-id-64'
import type { GameNumber } from '../database/models/game.model'
import type { GameSlotModel } from '../database/models/game-slot.model'
import type { PlayerModel, PlayerBan } from '../database/models/player.model'

type Actor = Pick<PlayerModel, 'steamId' | 'activeGame' | 'bans'>

const now = new Date('2026-01-15T12:00:00Z')

const slot = { player: '76561198000000001' as SteamId64 } satisfies Pick<GameSlotModel, 'player'>

const activeBan: PlayerBan = {
  actor: '76561198000000005' as SteamId64,
  start: new Date('2026-01-01T00:00:00Z'),
  end: new Date('2026-02-01T00:00:00Z'),
  reason: 'griefing',
}

const expiredBan: PlayerBan = {
  actor: '76561198000000005' as SteamId64,
  start: new Date('2026-01-01T00:00:00Z'),
  end: new Date('2026-01-10T00:00:00Z'),
  reason: 'griefing',
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(now)
})

afterEach(() => {
  vi.useRealTimers()
})

describe('substituteBlocker()', () => {
  it('asks anonymous visitors to sign in', () => {
    expect(substituteBlocker(slot, null)).toBe('Sign in to substitute')
  })

  it('lets the substituted player take their own slot back despite bans and another game', () => {
    const actor: Actor = {
      steamId: slot.player,
      activeGame: 42 as GameNumber,
      bans: [activeBan],
    }
    expect(substituteBlocker(slot, actor)).toBe(null)
  })

  it('rejects a banned player', () => {
    const actor: Actor = {
      steamId: '76561198000000002' as SteamId64,
      bans: [activeBan],
    }
    expect(substituteBlocker(slot, actor)).toBe('You have active bans')
  })

  it('accepts a player whose bans are over', () => {
    const actor: Actor = {
      steamId: '76561198000000002' as SteamId64,
      bans: [expiredBan],
    }
    expect(substituteBlocker(slot, actor)).toBe(null)
  })

  it('rejects a player already in another game', () => {
    const actor: Actor = {
      steamId: '76561198000000002' as SteamId64,
      activeGame: 42 as GameNumber,
    }
    expect(substituteBlocker(slot, actor)).toBe('You are already in a game')
  })

  it('reports the active game like games/lifecycle/replace.ts does', () => {
    const actor: Actor = {
      steamId: '76561198000000002' as SteamId64,
      activeGame: 42 as GameNumber,
      bans: [activeBan],
    }
    expect(substituteBlocker(slot, actor)).toBe('You are already in a game')
  })

  it('lets an eligible stranger substitute', () => {
    const actor: Actor = {
      steamId: '76561198000000002' as SteamId64,
      bans: [],
    }
    expect(substituteBlocker(slot, actor)).toBe(null)
  })
})
