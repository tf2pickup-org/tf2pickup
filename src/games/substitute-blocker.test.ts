import { describe, expect, it } from 'vitest'
import { substituteBlocker } from './substitute-blocker'
import type { SteamId64 } from '../shared/types/steam-id-64'
import type { GameNumber } from '../database/models/game.model'
import type { GameSlotModel } from '../database/models/game-slot.model'
import type { SubstituteBlockerPlayer } from './substitute-blocker'

const slot = { player: '76561198000000001' as SteamId64 } satisfies Pick<GameSlotModel, 'player'>

const activeBan = {
  actor: '76561198000000005' as SteamId64,
  start: new Date('2026-01-01T00:00:00Z'),
  end: new Date('2030-01-01T00:00:00Z'),
  reason: 'griefing',
}

describe('substituteBlocker()', () => {
  it('asks anonymous visitors to sign in', () => {
    expect(substituteBlocker(slot, null)).toBe('Sign in to substitute')
  })

  it('lets the substituted player take their own slot back despite bans and cooldowns', () => {
    const actor: SubstituteBlockerPlayer = {
      steamId: slot.player,
      activeGame: 42 as GameNumber,
      bans: [activeBan],
    }
    expect(substituteBlocker(slot, actor)).toBe(null)
  })

  it('rejects a banned player', () => {
    const actor: SubstituteBlockerPlayer = {
      steamId: '76561198000000002' as SteamId64,
      activeGame: undefined,
      bans: [activeBan],
    }
    expect(substituteBlocker(slot, actor)).toBe('You have active bans')
  })

  it('accepts a player whose bans are over', () => {
    const actor: SubstituteBlockerPlayer = {
      steamId: '76561198000000002' as SteamId64,
      activeGame: undefined,
      bans: [{ ...activeBan, end: new Date('2026-01-02T00:00:00Z') }],
    }
    expect(substituteBlocker(slot, actor)).toBe(null)
  })

  it('rejects a player already in another game', () => {
    const actor: SubstituteBlockerPlayer = {
      steamId: '76561198000000002' as SteamId64,
      activeGame: 42 as GameNumber,
      bans: [],
    }
    expect(substituteBlocker(slot, actor)).toBe('You are already in a game')
  })

  it('lets an eligible stranger substitute', () => {
    const actor: SubstituteBlockerPlayer = {
      steamId: '76561198000000002' as SteamId64,
      activeGame: undefined,
      bans: [],
    }
    expect(substituteBlocker(slot, actor)).toBe(null)
  })
})
