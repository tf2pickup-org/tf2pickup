import type { WithId } from 'mongodb'
import { collections } from '../database/collections'
import type { ActivityLogEntryModel } from '../database/models/activity-log-entry.model'
import type { SteamId64 } from '../shared/types/steam-id-64'

export async function getPlayersForActivityLogs(
  logs: WithId<ActivityLogEntryModel>[],
): Promise<Map<SteamId64, string>> {
  const ids = new Set<SteamId64>()

  for (const log of logs) {
    if (
      log.type === 'player name change' ||
      log.type === 'player skill change' ||
      log.type === 'ban added' ||
      log.type === 'ban revoked'
    ) {
      ids.add(log.player)
    }
    if (log.type === 'player skill change' || log.type === 'map scramble') {
      ids.add(log.actor)
    }
    if (log.type === 'ban added' && log.actor !== 'bot') {
      ids.add(log.actor)
    }
    if (log.type === 'ban revoked') {
      ids.add(log.admin)
    }
    if (log.type === 'configuration change') {
      ids.add(log.actor)
    }
  }

  if (ids.size === 0) return new Map()

  const players = await collections.players
    .find({ steamId: { $in: [...ids] } }, { projection: { steamId: 1, name: 1 } })
    .toArray()

  return new Map(players.map(p => [p.steamId, p.name]))
}
