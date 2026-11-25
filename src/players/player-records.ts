import SteamID from 'steamid'
import { collections } from '../database/collections'
import type { GameNumber } from '../database/models/game.model'
import type { LogsTfLogData } from '../database/models/logs-tf-log.model'
import type { Gamemode } from '../shared/types/gamemode'
import type { SteamId64 } from '../shared/types/steam-id-64'

export interface GameRecord {
  value: number
  gameNumber: GameNumber
}

export interface PlayerRecords {
  kills?: GameRecord
  dpm?: GameRecord
  damage?: GameRecord
  kd?: GameRecord & { kills: number; deaths: number }
  deaths?: GameRecord
  healing?: GameRecord
  hpm?: GameRecord
  ubers?: GameRecord
}

type LogStats = LogsTfLogData['players'][string]

// Single-game bests across the player's logs.tf logs in one gamemode; ties go to the earliest game.
export async function playerRecords(
  steamId: SteamId64,
  gamemode: Gamemode,
): Promise<PlayerRecords> {
  const gameNumbers = await collections.games.distinct('number', {
    gamemode,
    'slots.player': steamId,
  })
  const logsTfId = new SteamID(steamId).steam3()
  // ponytail: scans every log of the player on each view; cache records on the player doc if slow
  const logs = await collections.logsTfLogs
    .find(
      { gameNumber: { $in: gameNumbers } },
      {
        projection: { gameNumber: 1, 'data.length': 1, [`data.players.${logsTfId}`]: 1 },
        sort: { gameNumber: 1 },
      },
    )
    .toArray()

  const records: PlayerRecords = {}
  const consider = (
    key: Exclude<keyof PlayerRecords, 'kd'>,
    value: number,
    gameNumber: GameNumber,
  ) => {
    if (value > (records[key]?.value ?? 0)) {
      records[key] = { value, gameNumber }
    }
  }

  for (const { gameNumber, data } of logs) {
    const stats: LogStats | undefined = data.players[logsTfId]
    if (!stats) {
      continue
    }

    const minutes = data.length / 60
    consider('kills', stats.kills, gameNumber)
    consider('dpm', stats.dapm, gameNumber)
    consider('damage', stats.dmg, gameNumber)
    consider('deaths', stats.deaths, gameNumber)
    consider('healing', stats.heal, gameNumber)
    consider('hpm', minutes > 0 ? stats.heal / minutes : 0, gameNumber)
    consider('ubers', stats.ubers, gameNumber)

    const kd = stats.deaths > 0 ? stats.kills / stats.deaths : Infinity
    if (
      stats.kills > 0 &&
      (records.kd === undefined ||
        kd > records.kd.value ||
        (kd === Infinity && records.kd.value === Infinity && stats.kills > records.kd.kills))
    ) {
      records.kd = { value: kd, gameNumber, kills: stats.kills, deaths: stats.deaths }
    }
  }

  return records
}
