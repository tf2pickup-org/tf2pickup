import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PlayerConnectionStatus, SlotStatus } from '../database/models/game-slot.model'
import type { GameNumber } from '../database/models/game.model'
import { Tf2Team } from '../shared/types/tf2-team'

const mocks = vi.hoisted(() => ({
  users: [] as { hash: string; channelId: number; moveToChannel: ReturnType<typeof vi.fn> }[],
  slot: {} as Record<string, unknown>,
}))
const channel = (id: number, subChannels: unknown[] = []) => ({ id, subChannels })
const blu = channel(11)
const red = channel(12)
const game = channel(10, [blu, red])

vi.mock('./client', () => ({
  client: {
    users: { findAll: (predicate: (user: unknown) => boolean) => mocks.users.filter(predicate) },
  },
}))
vi.mock('./find-game-channels', () => ({
  findGameChannels: () => Promise.resolve({ game, [Tf2Team.blu]: blu, [Tf2Team.red]: red }),
}))
vi.mock('./find-target-channel', () => ({ findTargetChannel: () => Promise.resolve(channel(1)) }))
vi.mock('./run-in-command-queue', () => ({ runInCommandQueue: (fn: () => unknown) => fn() }))
vi.mock('../games', () => ({ games: { update: vi.fn() } }))
vi.mock('../database/collections', () => ({
  collections: {
    games: { findOne: () => Promise.resolve({ number: 1, slots: [mocks.slot] }) },
    players: {
      findOne: () => Promise.resolve({ mumbleCertificate: { hash: 'holder' } }),
      find: () => ({
        toArray: () => Promise.resolve([{ mumbleCertificate: { hash: 'outgoing' } }]),
      }),
    },
  },
}))

import { settleVoiceHandover } from './settle-voice-handover'
import { games } from '../games'

const user = (hash: string, channelId: number) => ({ hash, channelId, moveToChannel: vi.fn() })

describe('settleVoiceHandover()', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.slot = {
      id: 'blu-scout-1',
      team: Tf2Team.blu,
      status: SlotStatus.active,
      connectionStatus: PlayerConnectionStatus.connected,
      player: 'holder',
      voiceOutgoing: ['outgoing'],
    }
  })

  it('moves the replaced player out once the holder is in game and in the team channel', async () => {
    const outgoing = user('outgoing', blu.id)
    mocks.users = [user('holder', blu.id), outgoing]
    await settleVoiceHandover(1 as GameNumber)
    expect(games.update).toHaveBeenCalledWith(
      1,
      { $unset: { 'slots.$[slot].voiceOutgoing': 1 } },
      { arrayFilters: [{ 'slot.id': { $in: ['blu-scout-1'] } }] },
    )
    expect(outgoing.moveToChannel).toHaveBeenCalledWith(1)
  })

  it("leaves a replaced player who isn't in the game's channels where they are", async () => {
    const outgoing = user('outgoing', 99)
    mocks.users = [user('holder', blu.id), outgoing]
    await settleVoiceHandover(1 as GameNumber)
    expect(games.update).toHaveBeenCalled()
    expect(outgoing.moveToChannel).not.toHaveBeenCalled()
  })

  it('waits while the holder is not in the team channel', async () => {
    mocks.users = [user('holder', red.id), user('outgoing', blu.id)]
    await settleVoiceHandover(1 as GameNumber)
    expect(games.update).not.toHaveBeenCalled()
  })

  it('waits while the holder is not on the game server', async () => {
    mocks.slot.connectionStatus = PlayerConnectionStatus.joining
    mocks.users = [user('holder', blu.id), user('outgoing', blu.id)]
    await settleVoiceHandover(1 as GameNumber)
    expect(games.update).not.toHaveBeenCalled()
  })
})
