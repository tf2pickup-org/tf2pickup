import { collections } from '../../database/collections'
import type { PlayerActionEntryModel } from '../../database/models/player-action-entry.model'
import type { SteamId64 } from '../../shared/types/steam-id-64'

export async function getPlayersForLogs(
  logs: PlayerActionEntryModel[],
): Promise<Map<SteamId64, string>> {
  const steamIds = [...new Set(logs.map(l => l.player))]
  const players = await collections.players
    .find({ steamId: { $in: steamIds } }, { projection: { steamId: 1, name: 1 } })
    .toArray()
  return new Map(players.map(p => [p.steamId, p.name]))
}
