import { collections } from '../../database/collections'
import type { SteamId64 } from '../../shared/types/steam-id-64'

export async function getPlayersByName(name: string): Promise<SteamId64[]> {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const players = await collections.players
    .find({ name: { $regex: escaped, $options: 'i' } }, { projection: { steamId: 1 }, limit: 100 })
    .toArray()
  return players.map(p => p.steamId)
}
