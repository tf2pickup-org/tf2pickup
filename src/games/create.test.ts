import { ObjectId } from 'mongodb'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { collections } from '../database/collections'
import type { QueueModel } from '../database/models/queue.model'
import type { QueueSlotModel } from '../database/models/queue-slot.model'
import { players } from '../players'
import { Gamemode } from '../shared/types/gamemode'
import { Tf2ClassName } from '../shared/types/tf2-class-name'
import { create } from './create'

vi.mock('../database/collections', () => ({
  collections: {
    games: {
      insertOne: vi.fn().mockResolvedValue({ insertedId: 'id' }),
      findOne: vi.fn().mockResolvedValue({ number: 1 }),
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

async function createdSlots(...args: Parameters<typeof create>) {
  vi.mocked(collections.games.findOne).mockResolvedValueOnce(null)
  await create(...args).catch(() => undefined)
  const [game] = vi.mocked(collections.games.insertOne).mock.lastCall!
  return game.slots
}

afterEach(() => vi.clearAllMocks())

describe('create()', () => {
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
})
