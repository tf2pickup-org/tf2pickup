import { describe, expect, it, vi } from 'vitest'
import { isGamemodeScoped, isInherited, resolveStorageKey } from './gamemode-scoped-keys'
import { Gamemode } from '../shared/types/gamemode'

vi.mock('../shared/enabled-gamemodes', () => ({
  defaultGamemode: '6v6',
  enabledGamemodes: ['6v6', '9v9'],
}))

describe('isGamemodeScoped', () => {
  it('is true for per-gamemode keys', () => {
    expect(isGamemodeScoped('games.default_player_skill')).toBe(true)
    expect(isGamemodeScoped('queue.player_skill_threshold')).toBe(true)
  })

  it('is true for inherited keys', () => {
    expect(isGamemodeScoped('games.execute_extra_commands')).toBe(true)
  })

  it('is false for global keys', () => {
    expect(isGamemodeScoped('queue.ready_up_timeout')).toBe(false)
    expect(isGamemodeScoped('games.cooldown_levels')).toBe(false)
  })
})

describe('isInherited', () => {
  it('distinguishes inherited from per-gamemode keys', () => {
    expect(isInherited('games.execute_extra_commands')).toBe(true)
    expect(isInherited('games.default_player_skill')).toBe(false)
  })
})

describe('resolveStorageKey', () => {
  it('uses the bare key for global keys regardless of gamemode', () => {
    expect(resolveStorageKey('queue.ready_up_timeout', Gamemode.highlander)).toBe(
      'queue.ready_up_timeout',
    )
  })

  it('uses the bare key for the default gamemode', () => {
    expect(resolveStorageKey('games.whitelist_id', Gamemode.sixes)).toBe('games.whitelist_id')
  })

  it('uses the bare key when no gamemode is given', () => {
    expect(resolveStorageKey('games.whitelist_id', undefined)).toBe('games.whitelist_id')
  })

  it('namespaces a scoped key for a non-default gamemode', () => {
    expect(resolveStorageKey('games.whitelist_id', Gamemode.highlander)).toBe(
      'games.whitelist_id#9v9',
    )
  })
})
