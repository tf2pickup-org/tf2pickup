import { describe, expect, it, vi } from 'vitest'

vi.mock('../shared/default-gamemode', () => ({ defaultGamemode: '6v6' }))

import { isGamemodeScoped, resolveStorageKey } from './gamemode-scoped-keys'
import { Gamemode } from '../shared/types/gamemode'

describe('isGamemodeScoped()', () => {
  it('is true for the per-gamemode keys', () => {
    expect(isGamemodeScoped('games.whitelist_id')).toBe(true)
    expect(isGamemodeScoped('queue.player_skill_threshold')).toBe(true)
    expect(isGamemodeScoped('games.default_player_skill')).toBe(true)
  })

  it('is false for global keys', () => {
    expect(isGamemodeScoped('queue.ready_up_timeout')).toBe(false)
    expect(isGamemodeScoped('discord.guilds')).toBe(false)
  })
})

describe('resolveStorageKey()', () => {
  it('uses the bare key for a global key regardless of gamemode', () => {
    expect(resolveStorageKey('queue.ready_up_timeout', undefined)).toBe('queue.ready_up_timeout')
    expect(resolveStorageKey('queue.ready_up_timeout', Gamemode.highlander)).toBe(
      'queue.ready_up_timeout',
    )
  })

  it('uses the bare key for the default gamemode of a scoped key', () => {
    expect(resolveStorageKey('queue.player_skill_threshold', undefined)).toBe(
      'queue.player_skill_threshold',
    )
    expect(resolveStorageKey('queue.player_skill_threshold', Gamemode.sixes)).toBe(
      'queue.player_skill_threshold',
    )
  })

  it('namespaces a non-default gamemode of a scoped key', () => {
    expect(resolveStorageKey('queue.player_skill_threshold', Gamemode.highlander)).toBe(
      'queue.player_skill_threshold#9v9',
    )
    expect(resolveStorageKey('games.whitelist_id', Gamemode.highlander)).toBe(
      'games.whitelist_id#9v9',
    )
  })
})
