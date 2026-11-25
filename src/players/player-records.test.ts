import { expect, it, vi } from 'vitest'
import SteamID from 'steamid'
import { Gamemode } from '../shared/types/gamemode'
import type { SteamId64 } from '../shared/types/steam-id-64'
import { playerRecords } from './player-records'

const { distinct, toArray } = vi.hoisted(() => ({ distinct: vi.fn(), toArray: vi.fn() }))
vi.mock('../database/collections', () => ({
  collections: {
    games: { distinct },
    logsTfLogs: { find: vi.fn(() => ({ toArray })) },
  },
}))

const steamId = '76561198074409147' as SteamId64
const logsTfId = new SteamID(steamId).steam3()

function log(gameNumber: number, stats: Record<string, number>, length = 1800) {
  return {
    gameNumber,
    data: {
      length,
      players: {
        [logsTfId]: { kills: 0, deaths: 0, dmg: 0, dapm: 0, heal: 0, ubers: 0, ...stats },
      },
    },
  }
}

it('picks single-game bests, earliest game on ties', async () => {
  distinct.mockResolvedValue([1, 2, 3])
  toArray.mockResolvedValue([
    log(1, { kills: 20, deaths: 10, dmg: 9000, dapm: 300 }),
    log(2, { kills: 20, deaths: 15, dmg: 11000, dapm: 250, heal: 30000, ubers: 8 }),
    { gameNumber: 3, data: { length: 1800, players: {} } },
  ])

  const records = await playerRecords(steamId, Gamemode.sixes)

  expect(records.kills).toEqual({ value: 20, gameNumber: 1 })
  expect(records.dpm).toEqual({ value: 300, gameNumber: 1 })
  expect(records.damage).toEqual({ value: 11000, gameNumber: 2 })
  expect(records.deaths).toEqual({ value: 15, gameNumber: 2 })
  expect(records.healing).toEqual({ value: 30000, gameNumber: 2 })
  expect(records.hpm).toEqual({ value: 1000, gameNumber: 2 })
  expect(records.ubers).toEqual({ value: 8, gameNumber: 2 })
  expect(records.kd).toEqual({ value: 2, gameNumber: 1, kills: 20, deaths: 10 })
})

it('ranks deathless games as infinite K/D, more kills first', async () => {
  distinct.mockResolvedValue([1, 2, 3])
  toArray.mockResolvedValue([
    log(1, { kills: 30, deaths: 1 }),
    log(2, { kills: 3, deaths: 0 }),
    log(3, { kills: 12, deaths: 0 }),
  ])

  const { kd } = await playerRecords(steamId, Gamemode.sixes)

  expect(kd).toEqual({ value: Infinity, gameNumber: 3, kills: 12, deaths: 0 })
})

it('keeps the earlier game when finite K/D ratios tie', async () => {
  distinct.mockResolvedValue([1, 2])
  toArray.mockResolvedValue([log(1, { kills: 10, deaths: 5 }), log(2, { kills: 20, deaths: 10 })])

  const { kd } = await playerRecords(steamId, Gamemode.sixes)

  expect(kd).toEqual({ value: 2, gameNumber: 1, kills: 10, deaths: 5 })
})

it('has no records without stats', async () => {
  distinct.mockResolvedValue([1])
  toArray.mockResolvedValue([log(1, {})])

  expect(await playerRecords(steamId, Gamemode.sixes)).toEqual({})
})
