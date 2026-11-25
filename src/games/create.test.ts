import { ObjectId } from 'mongodb'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { collections } from '../database/collections'
import type { QueueModel } from '../database/models/queue.model'
import type { QueueSlotModel } from '../database/models/queue-slot.model'
import { events } from '../events'
import { players } from '../players'
import { Gamemode } from '../shared/types/gamemode'
import { Tf2ClassName } from '../shared/types/tf2-class-name'
import { create } from './create'
import { setActiveGame } from './set-active-game'

vi.mock('../database/collections', () => ({
  collections: {
    games: {
      insertOne: vi.fn().mockResolvedValue({ insertedId: 'id' }),
      findOne: vi.fn().mockResolvedValue({ number: 1, slots: [] }),
    },
  },
}))
vi.mock('../configuration', () => ({
  configuration: { get: vi.fn().mockResolvedValue({}) },
}))
vi.mock('../players', () => ({ players: { bySteamId: vi.fn() } }))
vi.mock('../queues/resolve-whitelist-id', () => ({
  resolveWhitelistId: vi.fn().mockResolvedValue(null),
}))
vi.mock('../events', () => ({ events: { emit: vi.fn() } }))
vi.mock('./set-active-game', () => ({ setActiveGame: vi.fn() }))

function queueSlots(classes: Tf2ClassName[]) {
  return classes.map((gameClass, i) => ({
    id: `${gameClass}-${i}`,
    gameClass,
    player: { steamId: `${i}` },
  })) as unknown as QueueSlotModel[]
}

function queue(gamemode: Gamemode) {
  return { _id: new ObjectId(), gamemode, maps: [] } as unknown as QueueModel
}

async function createdSlots(queue: QueueModel, slots: QueueSlotModel[], map: string) {
  vi.mocked(collections.games.findOne).mockResolvedValueOnce(null)
  await create({ queue, token: 'launch-token', slots, map, friends: [] }).catch(() => undefined)
  const [game] = vi.mocked(collections.games.insertOne).mock.lastCall!
  return game.slots
}

afterEach(() => vi.clearAllMocks())

describe('create()', () => {
  it('seats every player before announcing the game', async () => {
    vi.mocked(players.bySteamId).mockResolvedValue({ skill: {} } as never)
    const game = { number: 7, slots: [{ player: 'a' }, { player: 'b' }] }
    vi.mocked(collections.games.findOne)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(game as never)

    await create({
      queue: queue(Gamemode.sixes),
      token: 'launch-token',
      slots: queueSlots([Tf2ClassName.scout, Tf2ClassName.scout]),
      map: 'cp_a',
      friends: [],
    })

    expect(setActiveGame).toHaveBeenCalledWith('a', 7)
    expect(setActiveGame).toHaveBeenCalledWith('b', 7)
    expect(events.emit).toHaveBeenCalledWith('game:created', { game })
    expect(vi.mocked(setActiveGame).mock.invocationCallOrder[1]).toBeLessThan(
      vi.mocked(events.emit).mock.invocationCallOrder[0]!,
    )
  })

  it('balances an auto-balanced gamemode by skill', async () => {
    vi.mocked(players.bySteamId).mockImplementation(
      async steamId => ({ skill: { '6v6': { scout: Number(steamId) } } }) as never,
    )
    const slots = await createdSlots(
      queue(Gamemode.sixes),
      queueSlots([Tf2ClassName.scout, Tf2ClassName.scout, Tf2ClassName.scout, Tf2ClassName.scout]),
      'cp_process_f12',
    )
    expect(slots.map(slot => slot.skill).sort()).toEqual([0, 1, 2, 3])
    // 0+3 against 1+2
    const blu = slots.filter(slot => slot.team === 'blu').map(slot => slot.player)
    expect([
      ['0', '3'],
      ['1', '2'],
    ]).toContainEqual(blu.sort())
  })

  it('gives a player with no skill and no default skill 1', async () => {
    vi.mocked(players.bySteamId).mockResolvedValue({ skill: {} } as never)
    const slots = await createdSlots(
      queue(Gamemode.sixes),
      queueSlots([Tf2ClassName.scout, Tf2ClassName.scout]),
      'cp_process_f12',
    )
    expect(slots.map(slot => slot.skill)).toEqual([1, 1])
  })

  it('gives players no skill in a gamemode that is not auto-balanced', async () => {
    const slots = await createdSlots(
      queue(Gamemode.ultiduo),
      queueSlots([
        Tf2ClassName.soldier,
        Tf2ClassName.soldier,
        Tf2ClassName.medic,
        Tf2ClassName.medic,
      ]),
      'ultiduo_baloo_v2',
    )
    expect(players.bySteamId).not.toHaveBeenCalled()
    expect(slots).toHaveLength(4)
    expect(slots.every(slot => !('skill' in slot))).toBe(true)
  })

  it('picks random teams in a gamemode that is not auto-balanced', async () => {
    const soldiers = queueSlots([Tf2ClassName.soldier, Tf2ClassName.soldier])
    const teamOfFirst = async (random: number) => {
      const spy = vi.spyOn(Math, 'random').mockReturnValue(random)
      const slots = await createdSlots(queue(Gamemode.ultiduo), soldiers, 'ultiduo_baloo_v2')
      spy.mockRestore()
      return slots.find(slot => slot.player === '0')!.team
    }
    expect(await teamOfFirst(0)).not.toEqual(await teamOfFirst(0.99))
  })

  it('stamps the launch token on the game and announces it', async () => {
    vi.mocked(players.bySteamId).mockResolvedValue({ skill: {} } as never)
    await createdSlots(
      queue(Gamemode.sixes),
      queueSlots([Tf2ClassName.scout, Tf2ClassName.scout]),
      'cp_process_f12',
    )
    const [game] = vi.mocked(collections.games.insertOne).mock.lastCall!
    expect(game.launchToken).toBe('launch-token')
    expect(events.emit).toHaveBeenCalledWith('game:created', { game: { number: 1, slots: [] } })
    expect(events.emit).toHaveBeenCalledWith('queue/game:created', {
      game: { number: 1, slots: [] },
    })
  })

  it('reuses the game of a launch replayed after a crash without replaying global effects', async () => {
    const existing = { number: 7, launchToken: 'launch-token', slots: [{ player: 'a' }] }
    vi.mocked(collections.games.findOne).mockResolvedValueOnce(existing as never)
    expect(
      await create({
        queue: queue(Gamemode.sixes),
        token: 'launch-token',
        slots: queueSlots([Tf2ClassName.scout, Tf2ClassName.scout]),
        map: 'cp_process_f12',
        friends: [],
      }),
    ).toEqual({ game: existing, inserted: false })
    expect(collections.games.findOne).toHaveBeenCalledWith({ launchToken: 'launch-token' })
    expect(collections.games.insertOne).not.toHaveBeenCalled()
    expect(setActiveGame).toHaveBeenCalledExactlyOnceWith('a', 7)
    expect(events.emit).toHaveBeenCalledExactlyOnceWith('queue/game:created', { game: existing })
  })
})
