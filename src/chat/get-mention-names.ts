import { collections } from '../database/collections'
import type { SteamId64 } from '../shared/types/steam-id-64'

export async function getMentionNames(mentions: SteamId64[]): Promise<Map<SteamId64, string>> {
  if (mentions.length === 0) {
    return new Map()
  }

  const players = await collections.players
    .find({ steamId: { $in: mentions } }, { projection: { steamId: 1, name: 1 } })
    .toArray()

  return new Map(players.map(p => [p.steamId, p.name]))
}
