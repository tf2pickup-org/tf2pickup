import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Acl } from '@tf2pickup-org/mumble-client'
import { PlayerConnectionStatus, SlotStatus } from '../../database/models/game-slot.model'
import { GameState, type GameModel, type GameNumber } from '../../database/models/game.model'
import type { GameSlotId } from '../../shared/types/game-slot-id'
import type { SteamId64 } from '../../shared/types/steam-id-64'
import { Tf2Team } from '../../shared/types/tf2-team'
import { VoiceServerType } from '../../shared/types/voice-server-type'
import type { VoiceChannel, VoiceServer, VoiceUser } from './voice-server'

const fake = vi.hoisted(() => {
  let nextId = 100

  class FakeChannel implements VoiceChannel {
    readonly id = nextId++
    subChannels: FakeChannel[] = []
    userCount = 0
    acl: Acl | undefined
    linked: number[] = []

    constructor(
      readonly name: string | undefined,
      private readonly parent?: FakeChannel,
    ) {}

    createSubChannel(name: string) {
      const channel = new FakeChannel(name, this)
      this.subChannels.push(channel)
      return Promise.resolve(channel)
    }

    saveAcl(acl: Acl) {
      this.acl = acl
      return Promise.resolve()
    }

    link(other: VoiceChannel) {
      this.linked.push(other.id)
      return Promise.resolve()
    }

    remove() {
      this.parent!.subChannels = this.parent!.subChannels.filter(channel => channel !== this)
      return Promise.resolve()
    }
  }

  class FakeUser implements VoiceUser {
    constructor(
      readonly hash: string | undefined,
      public channelId: number,
    ) {}

    moveToChannel(channelId: number) {
      this.channelId = channelId
      return Promise.resolve()
    }
  }

  const server = {
    connected: true,
    games: new FakeChannel('games'),
    userList: [] as FakeUser[],
    reset() {
      server.connected = true
      server.games = new FakeChannel('games')
      server.userList = []
    },
    gamesChannel() {
      return Promise.resolve(server.connected ? server.games : undefined)
    },
    users() {
      return server.userList
    },
  } satisfies VoiceServer & Record<string, unknown>

  return { FakeChannel, FakeUser, server }
})

const db = vi.hoisted(() => ({
  config: {} as Record<string, unknown>,
  players: [] as { steamId: string; name: string; mumbleCertificate?: { hash: string } }[],
  games: [] as unknown[],
}))

vi.mock('./mumble-voice-server', () => ({ mumbleVoiceServer: fake.server }))
vi.mock('../../configuration', () => ({
  configuration: { get: (key: string) => Promise.resolve(db.config[key]) },
}))
vi.mock('../../players', () => ({
  players: {
    bySteamId: (steamId: string) =>
      Promise.resolve(db.players.find(player => player.steamId === steamId)),
  },
}))
vi.mock('../../database/collections', () => {
  const byIds = (filter: { steamId?: { $in?: string[] } | string }) =>
    db.players.filter(({ steamId }) =>
      typeof filter.steamId === 'string'
        ? steamId === filter.steamId
        : (filter.steamId?.$in?.includes(steamId) ?? true),
    )
  return {
    collections: {
      players: {
        findOne: (filter: { steamId?: string }) => Promise.resolve(byIds(filter)[0] ?? null),
        find: (filter: { steamId?: { $in: string[] } }) => ({
          toArray: () =>
            Promise.resolve(byIds(filter).filter(({ mumbleCertificate }) => mumbleCertificate)),
        }),
      },
      games: {
        findOne: () => Promise.resolve(db.games[0] ?? null),
        find: () => ({ toArray: () => Promise.resolve(db.games) }),
      },
    },
  }
})
vi.mock('../../games', () => ({ games: { update: vi.fn() } }))
vi.mock('../../tasks', () => ({ tasks: { schedule: vi.fn() } }))
vi.mock('../../logger', () => ({ logger: { info: vi.fn(), debug: vi.fn() } }))

import { gameVoice } from '.'
import { games } from '../../games'
import { tasks } from '../../tasks'

const holder = '76561198000000001' as SteamId64
const outgoing = '76561198000000002' as SteamId64
const redPlayer = '76561198000000003' as SteamId64

const slot = (id: string, team: Tf2Team, player: SteamId64, extra = {}) => ({
  id: id as GameSlotId,
  team,
  player,
  status: SlotStatus.active,
  connectionStatus: PlayerConnectionStatus.offline,
  ...extra,
})

const makeGame = (extra: Partial<GameModel> = {}) =>
  ({
    number: 5 as GameNumber,
    state: GameState.started,
    slots: [slot('blu-scout-1', Tf2Team.blu, holder), slot('red-scout-1', Tf2Team.red, redPlayer)],
    ...extra,
  }) as GameModel

const findChannel = (name: string) => fake.server.games.subChannels.find(c => c.name === name)
const team = (name: string) => findChannel('5')!.subChannels.find(c => c.name === name)!
const groups = (channel: InstanceType<typeof fake.FakeChannel>) =>
  channel.acl?.entries.map(({ group }) => group)

async function openChannels() {
  const channel = await fake.server.games.createSubChannel('5')
  const [blu, red] = await Promise.all([
    channel.createSubChannel('BLU'),
    channel.createSubChannel('RED'),
  ])
  return { channel, blu, red }
}

describe('gameVoice', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    fake.server.reset()
    db.config = {
      'games.voice_server_type': VoiceServerType.mumble,
      'games.voice_server.mumble.player_verification': true,
      'games.voice_server.mumble.url': 'mumble.example',
      'games.voice_server.mumble.port': 64738,
      'games.voice_server.mumble.channel_name': 'games',
    }
    db.players = [
      { steamId: holder, name: 'holder one', mumbleCertificate: { hash: 'holder' } },
      { steamId: outgoing, name: 'outgoing', mumbleCertificate: { hash: 'outgoing' } },
      { steamId: redPlayer, name: 'red', mumbleCertificate: { hash: 'red' } },
    ]
    db.games = []
  })

  describe('open()', () => {
    it("creates the game's channels, voice URLs and ACLs", async () => {
      await gameVoice.open(makeGame())

      expect(findChannel('5')!.subChannels.map(({ name }) => name)).toEqual(['BLU', 'RED'])
      expect(games.update).toHaveBeenCalledWith(
        5,
        {
          $set: {
            'slots.$[s0].voiceServerUrl': 'mumble://holder_one@mumble.example:64738/games/5/BLU',
            'slots.$[s1].voiceServerUrl': 'mumble://red@mumble.example:64738/games/5/RED',
          },
        },
        { arrayFilters: [{ 's0.id': 'blu-scout-1' }, { 's1.id': 'red-scout-1' }] },
      )
      expect(groups(team('BLU'))).toEqual(['$holder'])
      expect(groups(team('RED'))).toEqual(['$red'])
      expect(groups(findChannel('5')!)).toEqual(['$holder', '$red'])
    })

    it('leaves the ACLs alone without verification', async () => {
      db.config['games.voice_server.mumble.player_verification'] = false
      await gameVoice.open(makeGame())
      expect(team('BLU').acl).toBeUndefined()
    })

    it('does nothing when the voice server is not mumble', async () => {
      db.config['games.voice_server_type'] = VoiceServerType.none
      await gameVoice.open(makeGame())
      expect(fake.server.games.subChannels).toEqual([])
      expect(games.update).not.toHaveBeenCalled()
    })

    it('fails while the bot is not connected', async () => {
      fake.server.connected = false
      await expect(gameVoice.open(makeGame())).rejects.toThrow()
    })
  })

  describe('replace()', () => {
    const replaced = (replacee: SteamId64) => ({
      game: makeGame(),
      replacee,
      replacement: holder,
      slotId: 'blu-scout-1' as GameSlotId,
    })

    it("writes the substitute's voice URL and hands the replacee's voice over in one update", async () => {
      await gameVoice.replace(replaced(outgoing))
      expect(games.update).toHaveBeenCalledExactlyOnceWith(
        5,
        {
          $set: {
            'slots.$[slot].voiceServerUrl': 'mumble://holder_one@mumble.example:64738/games/5/BLU',
            'slots.$[slot].voiceOutgoing': [outgoing],
          },
        },
        { arrayFilters: [{ 'slot.id': 'blu-scout-1' }] },
      )
    })

    it('only writes the voice URL without verification', async () => {
      db.config['games.voice_server.mumble.player_verification'] = false
      await gameVoice.replace(replaced(outgoing))
      expect(vi.mocked(games.update).mock.calls[0]![1]).toEqual({
        $set: {
          'slots.$[slot].voiceServerUrl': 'mumble://holder_one@mumble.example:64738/games/5/BLU',
        },
      })
    })

    it('does nothing when the voice server is not mumble', async () => {
      db.config['games.voice_server_type'] = VoiceServerType.none
      await gameVoice.replace(replaced(outgoing))
      expect(games.update).not.toHaveBeenCalled()
    })
  })

  describe('sync()', () => {
    it('rewrites the ACLs when who is in the game changes', async () => {
      const { blu } = await openChannels()
      const after = makeGame()
      after.slots[0]!.voiceOutgoing = [outgoing]
      await gameVoice.sync(after, makeGame())
      expect(groups(blu)).toEqual(['$holder', '$outgoing'])
    })

    it('skips when the occupancy did not change', async () => {
      const { blu } = await openChannels()
      await gameVoice.sync(makeGame(), makeGame())
      expect(blu.acl).toBeUndefined()
    })

    it('lets everyone in once the game is over', async () => {
      const { channel, blu } = await openChannels()
      await gameVoice.sync(makeGame({ state: GameState.ended }))
      expect(groups(channel)).toEqual(['all'])
      expect(groups(blu)).toEqual([])
    })
  })

  describe('settle()', () => {
    beforeEach(() => {
      db.games = [
        makeGame({
          slots: [
            slot('blu-scout-1', Tf2Team.blu, holder, {
              connectionStatus: PlayerConnectionStatus.connected,
              voiceOutgoing: [outgoing],
            }),
          ],
        }),
      ]
    })

    it('moves the replaced player out once the holder is in game and in the team channel', async () => {
      const { blu } = await openChannels()
      const leaving = new fake.FakeUser('outgoing', blu.id)
      fake.server.userList = [new fake.FakeUser('holder', blu.id), leaving]

      await gameVoice.settle(5 as GameNumber)

      expect(games.update).toHaveBeenCalledWith(
        5,
        { $unset: { 'slots.$[slot].voiceOutgoing': 1 } },
        { arrayFilters: [{ 'slot.id': { $in: ['blu-scout-1'] } }] },
      )
      expect(leaving.channelId).toBe(fake.server.games.id)
    })

    it('waits while the holder is not in the team channel', async () => {
      const { blu, red } = await openChannels()
      fake.server.userList = [
        new fake.FakeUser('holder', red.id),
        new fake.FakeUser('outgoing', blu.id),
      ]
      await gameVoice.settle(5 as GameNumber)
      expect(games.update).not.toHaveBeenCalled()
    })
  })

  describe('seat()', () => {
    it('moves a just-verified player into their team channel', async () => {
      const { red } = await openChannels()
      db.games = [makeGame()]
      const user = new fake.FakeUser('red', fake.server.games.id)
      fake.server.userList = [user]
      await gameVoice.seat(redPlayer, 'red')
      expect(user.channelId).toBe(red.id)
    })
  })

  describe('close()', () => {
    it('schedules the removal, lets everyone in and links the team channels', async () => {
      const { channel, blu, red } = await openChannels()
      await gameVoice.close(makeGame({ state: GameState.ended }))
      expect(tasks.schedule).toHaveBeenCalledWith('mumble.cleanupChannel', 60000, {
        gameNumber: 5,
      })
      expect(groups(channel)).toEqual(['all'])
      expect(red.linked).toEqual([blu.id])
    })

    it('skips the link quietly when the game has no channels', async () => {
      await expect(gameVoice.close(makeGame({ state: GameState.ended }))).resolves.toBeUndefined()
      expect(tasks.schedule).toHaveBeenCalled()
    })
  })

  describe('remove()', () => {
    it('removes an empty game channel', async () => {
      await openChannels()
      await gameVoice.remove(5 as GameNumber)
      expect(findChannel('5')).toBeUndefined()
    })

    it('tries again later while someone is still in it', async () => {
      const { red } = await openChannels()
      red.userCount = 1
      await gameVoice.remove(5 as GameNumber)
      expect(findChannel('5')).toBeDefined()
      expect(tasks.schedule).toHaveBeenCalledWith('mumble.cleanupChannel', 60000, {
        gameNumber: 5,
      })
    })
  })
})
