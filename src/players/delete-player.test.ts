import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ObjectId } from 'mongodb'
import { deletePlayer } from './delete-player'
import { collections } from '../database/collections'
import { PlayerRole } from '../database/models/player.model'
import { GameEventType } from '../database/models/game-event.model'
import { deletedUserSteamId, type SteamId64 } from '../shared/types/steam-id-64'

const victim = '76561198074409147' as SteamId64
const other = '76561198074409148' as SteamId64

const mockState = vi.hoisted(() => ({
  roles: [] as string[],
}))

vi.mock('../database/collections', () => ({
  collections: {
    players: {
      findOne: vi.fn(() => Promise.resolve({ roles: mockState.roles })),
      deleteOne: vi.fn(() => Promise.resolve()),
    },
    games: {
      find: vi.fn(() => ({ toArray: () => Promise.resolve([]) })),
      updateOne: vi.fn(() => Promise.resolve()),
    },
    chatMessages: {
      updateMany: vi.fn(() => Promise.resolve()),
      find: vi.fn(() => ({ toArray: () => Promise.resolve([]) })),
      updateOne: vi.fn(() => Promise.resolve()),
    },
    activityLog: { updateMany: vi.fn(() => Promise.resolve()) },
    onlinePlayers: { deleteMany: vi.fn(() => Promise.resolve()) },
    queueSlots: { updateMany: vi.fn(() => Promise.resolve()) },
    queueFriends: { deleteMany: vi.fn(() => Promise.resolve()) },
  },
}))

beforeEach(() => {
  vi.clearAllMocks()
  mockState.roles = []
})

describe('deletePlayer()', () => {
  it('should throw when the player does not exist', async () => {
    vi.mocked(collections.players.findOne).mockResolvedValueOnce(null)
    await expect(deletePlayer(victim)).rejects.toThrow('does not exist')
  })

  it('should refuse to delete super-users', async () => {
    mockState.roles = [PlayerRole.superUser]
    await expect(deletePlayer(victim)).rejects.toThrow('Super-users cannot be deleted')
    expect(collections.players.deleteOne).not.toHaveBeenCalled()
  })

  it('should remove the player document', async () => {
    await deletePlayer(victim)
    expect(collections.players.deleteOne).toHaveBeenCalledWith({ steamId: victim })
  })

  it('should anonymize chat messages and activity log', async () => {
    await deletePlayer(victim)
    expect(collections.chatMessages.updateMany).toHaveBeenCalledWith(
      { author: victim },
      { $set: { author: deletedUserSteamId } },
    )
    expect(collections.activityLog.updateMany).toHaveBeenCalledWith(
      { player: victim },
      { $set: { player: deletedUserSteamId } },
    )
    expect(collections.activityLog.updateMany).toHaveBeenCalledWith(
      { actor: victim },
      { $set: { actor: deletedUserSteamId } },
    )
  })

  it('should replace the steam id in game slots and events with the sentinel', async () => {
    vi.mocked(collections.games.find).mockReturnValueOnce({
      toArray: () =>
        Promise.resolve([
          {
            _id: new ObjectId(),
            slots: [
              { id: 0, player: victim },
              { id: 1, player: other },
            ],
            events: [
              { event: GameEventType.gameCreated, at: new Date() },
              { event: GameEventType.playerReplaced, replacee: victim, replacement: other },
            ],
          },
        ]),
    } as unknown as ReturnType<typeof collections.games.find>)

    await deletePlayer(victim)

    const [, update] = vi.mocked(collections.games.updateOne).mock.calls[0]!
    const set = (update as { $set: { slots: { player: SteamId64 }[]; events: unknown[] } }).$set
    expect(set.slots[0]!.player).toBe(deletedUserSteamId)
    expect(set.slots[1]!.player).toBe(other)
    expect(set.events[1]).toMatchObject({ replacee: deletedUserSteamId, replacement: other })
  })

  it('should scrub the steam id and link from chat mentions', async () => {
    const _id = new ObjectId()
    vi.mocked(collections.chatMessages.find).mockReturnValueOnce({
      toArray: () =>
        Promise.resolve([
          {
            _id,
            mentions: [victim, other],
            body: `hey <a href="/players/${victim}" class="mention">@bob</a> and <a href="/players/${other}" class="mention">@joe</a>`,
            originalBody: `hey @<${victim}> and @<${other}>`,
          },
        ]),
    } as unknown as ReturnType<typeof collections.chatMessages.find>)

    await deletePlayer(victim)

    const [, update] = vi.mocked(collections.chatMessages.updateOne).mock.calls[0]!
    const set = (update as { $set: { mentions: SteamId64[]; body: string; originalBody: string } })
      .$set
    expect(set.mentions).toEqual([deletedUserSteamId, other])
    expect(set.body).not.toContain(victim)
    expect(set.body).toContain('deleted user')
    expect(set.body).toContain(other)
    expect(set.originalBody).not.toContain(victim)
    expect(set.originalBody).toContain('@deleted user')
  })

  it('should clear live presence', async () => {
    await deletePlayer(victim)
    expect(collections.onlinePlayers.deleteMany).toHaveBeenCalledWith({ steamId: victim })
    expect(collections.queueSlots.updateMany).toHaveBeenCalledWith(
      { 'player.steamId': victim },
      { $set: { player: null, ready: false } },
    )
    expect(collections.queueFriends.deleteMany).toHaveBeenCalledWith({
      $or: [{ source: victim }, { target: victim }],
    })
  })
})
