import { describe, expect, it, vi } from 'vitest'
import { Gamemode } from '../../shared/types/gamemode'
import { Tf2ClassName } from '../../shared/types/tf2-class-name'
import type { GameNumber } from '../../database/models/game.model'
import type { PlayerBan } from '../../database/models/player.model'
import type { SteamId64 } from '../../shared/types/steam-id-64'
import { configuration } from '../../configuration'
import { joinBlocker, type JoinBlockerPlayer } from './join-blocker'

vi.mock('../../configuration', () => ({
  configuration: { get: vi.fn().mockResolvedValue({ '6v6': { soldier: 1 } }) },
}))

const slot = { gameClass: Tf2ClassName.soldier }
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
  it('lets a player in when nothing blocks them', async () => {
    expect(await joinBlocker(player, slot, queue)).toBeNull()
  })

  it('blocks a disabled queue', async () => {
    expect(await joinBlocker(player, slot, { ...queue, enabled: false })).toBe(
      'This queue is disabled',
    )
  })

  it('blocks a player who has not accepted the rules', async () => {
    expect(await joinBlocker({ hasAcceptedRules: false }, slot, queue)).toBe(
      'You have not accepted the rules',
    )
  })

  it('blocks a player with an active ban, but not an expired one', async () => {
    expect(
      await joinBlocker({ ...player, bans: [ban(new Date(Date.now() + 60_000))] }, slot, queue),
    ).toBe('You have active bans')
    expect(await joinBlocker({ ...player, bans: [ban(new Date(0))] }, slot, queue)).toBeNull()
  })

  it('blocks a player who is in a game', async () => {
    expect(await joinBlocker({ ...player, activeGame: 1 as GameNumber }, slot, queue)).toBe(
      'You are already in a game',
    )
  })

  it('blocks an unverified player when the queue requires verification', async () => {
    const verifiedQueue = { ...queue, requireVerification: true }
    expect(await joinBlocker(player, slot, verifiedQueue)).toBe(
      'You are not verified to join the queue',
    )
    expect(await joinBlocker({ ...player, verified: true }, slot, verifiedQueue)).toBeNull()
  })

  describe('skill threshold', () => {
    const thresholdQueue = { ...queue, skillThreshold: 3 }
    const tooLow = 'You do not meet skill requirements to play soldier'

    it("compares the player's skill with the threshold", async () => {
      expect(
        await joinBlocker({ ...player, skill: { '6v6': { soldier: 3 } } }, slot, thresholdQueue),
      ).toBeNull()
      expect(
        await joinBlocker({ ...player, skill: { '6v6': { soldier: 2 } } }, slot, thresholdQueue),
      ).toBe(tooLow)
    })

    it('falls back to the default skill, then to 1', async () => {
      expect(await joinBlocker(player, slot, thresholdQueue)).toBe(tooLow)
      vi.mocked(configuration.get).mockResolvedValueOnce({})
      expect(await joinBlocker(player, slot, { ...queue, skillThreshold: 1 })).toBeNull()
    })

    it('lets anyone in when the gamemode is not auto-balanced', async () => {
      expect(
        await joinBlocker(player, slot, { ...thresholdQueue, gamemode: Gamemode.ultiduo }),
      ).toBeNull()
    })
  })

  it('reports the first blocker in a fixed order', async () => {
    const everything: JoinBlockerPlayer = {
      hasAcceptedRules: false,
      bans: [ban(new Date(Date.now() + 60_000))],
      activeGame: 1 as GameNumber,
    }
    const strictQueue = { ...queue, requireVerification: true, skillThreshold: 3 }

    expect(await joinBlocker(everything, slot, { ...strictQueue, enabled: false })).toBe(
      'This queue is disabled',
    )
    expect(await joinBlocker(everything, slot, strictQueue)).toBe('You have not accepted the rules')
    expect(await joinBlocker({ ...everything, hasAcceptedRules: true }, slot, strictQueue)).toBe(
      'You have active bans',
    )
    expect(
      await joinBlocker({ ...everything, hasAcceptedRules: true, bans: [] }, slot, strictQueue),
    ).toBe('You are already in a game')
    expect(await joinBlocker(player, slot, strictQueue)).toBe(
      'You are not verified to join the queue',
    )
  })
})
