import { describe, expect, it } from 'vitest'
import { Gamemode } from '../../shared/types/gamemode'
import { Tf2ClassName } from '../../shared/types/tf2-class-name'
import type { GameNumber } from '../../database/models/game.model'
import type { PlayerBan } from '../../database/models/player.model'
import type { SteamId64 } from '../../shared/types/steam-id-64'
import { joinBlocker, type JoinBlockerPlayer } from './join-blocker'

const slot = { gameClass: Tf2ClassName.soldier }
const defaultSkill = { soldier: 1 }
const queue = {
  enabled: true,
  requireVerification: false,
  skillThreshold: null,
  gamemode: Gamemode.sixes,
}
const player: JoinBlockerPlayer = { hasAcceptedRules: true }
const ban = (end: Date): PlayerBan => ({
  actor: '76561198000000099' as SteamId64,
  start: new Date(0),
  end,
  reason: 'test ban',
})

describe('joinBlocker()', () => {
  it('lets a player in when nothing blocks them', () => {
    expect(joinBlocker(player, slot, queue, defaultSkill)).toBeNull()
  })

  it('blocks a disabled queue', () => {
    expect(joinBlocker(player, slot, { ...queue, enabled: false }, defaultSkill)).toBe(
      'This queue is disabled',
    )
  })

  it('blocks a player who has not accepted the rules', () => {
    expect(joinBlocker({ hasAcceptedRules: false }, slot, queue, defaultSkill)).toBe(
      'You have not accepted the rules',
    )
  })

  it('blocks a player with an active ban, but not an expired one', () => {
    expect(
      joinBlocker(
        { ...player, bans: [ban(new Date(Date.now() + 60_000))] },
        slot,
        queue,
        defaultSkill,
      ),
    ).toBe('You have active bans')
    expect(
      joinBlocker({ ...player, bans: [ban(new Date(0))] }, slot, queue, defaultSkill),
    ).toBeNull()
  })

  it('blocks a player who is in a game', () => {
    expect(joinBlocker({ ...player, activeGame: 1 as GameNumber }, slot, queue, defaultSkill)).toBe(
      'You are already in a game',
    )
  })

  it('blocks an unverified player when the queue requires verification', () => {
    const verifiedQueue = { ...queue, requireVerification: true }
    expect(joinBlocker(player, slot, verifiedQueue, defaultSkill)).toBe(
      'You are not verified to join the queue',
    )
    expect(joinBlocker({ ...player, verified: true }, slot, verifiedQueue, defaultSkill)).toBeNull()
  })

  describe('skill threshold', () => {
    const thresholdQueue = { ...queue, skillThreshold: 3 }
    const tooLow = 'You do not meet skill requirements to play soldier'

    it("compares the player's skill with the threshold", () => {
      expect(
        joinBlocker(
          { ...player, skill: { '6v6': { soldier: 3 } } },
          slot,
          thresholdQueue,
          defaultSkill,
        ),
      ).toBeNull()
      expect(
        joinBlocker(
          { ...player, skill: { '6v6': { soldier: 2 } } },
          slot,
          thresholdQueue,
          defaultSkill,
        ),
      ).toBe(tooLow)
    })

    it('falls back to the default skill, then to 1', () => {
      expect(joinBlocker(player, slot, thresholdQueue, { soldier: 3 })).toBeNull()
      expect(joinBlocker(player, slot, thresholdQueue, { soldier: 1 })).toBe(tooLow)
      expect(joinBlocker(player, slot, { ...queue, skillThreshold: 1 }, undefined)).toBeNull()
    })

    it('lets anyone in when the gamemode is not auto-balanced', () => {
      expect(
        joinBlocker(player, slot, { ...thresholdQueue, gamemode: Gamemode.ultiduo }, defaultSkill),
      ).toBeNull()
    })
  })

  it('reports the first blocker in a fixed order', () => {
    const everything: JoinBlockerPlayer = {
      hasAcceptedRules: false,
      bans: [ban(new Date(Date.now() + 60_000))],
      activeGame: 1 as GameNumber,
    }
    const strictQueue = { ...queue, requireVerification: true, skillThreshold: 3 }

    expect(joinBlocker(everything, slot, { ...strictQueue, enabled: false }, defaultSkill)).toBe(
      'This queue is disabled',
    )
    expect(joinBlocker(everything, slot, strictQueue, defaultSkill)).toBe(
      'You have not accepted the rules',
    )
    expect(
      joinBlocker({ ...everything, hasAcceptedRules: true }, slot, strictQueue, defaultSkill),
    ).toBe('You have active bans')
    expect(
      joinBlocker(
        { ...everything, hasAcceptedRules: true, bans: [] },
        slot,
        strictQueue,
        defaultSkill,
      ),
    ).toBe('You are already in a game')
    expect(joinBlocker(player, slot, strictQueue, defaultSkill)).toBe(
      'You are not verified to join the queue',
    )
  })
})
