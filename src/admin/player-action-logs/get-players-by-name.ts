import { collections } from '../../database/collections'
import type { SteamId64 } from '../../shared/types/steam-id-64'
import { escapeRegex } from '../../utils/escape-regex'

export async function getPlayersByName(name: string): Promise<SteamId64[]> {
  const escaped = escapeRegex(name)
  const players = await collections.players
    .find({ name: { $regex: escaped, $options: 'i' } }, { projection: { steamId: 1 }, limit: 100 })
    .toArray()
  return players.map(p => p.steamId)
}
