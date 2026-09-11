import { collections } from '../database/collections'
import type { Gamemode } from '../shared/types/gamemode'
import type { SteamId64 } from '../shared/types/steam-id-64'

export async function getFriends(gamemode: Gamemode): Promise<SteamId64[][]> {
  const friendships = await collections.queueFriends.find({ gamemode }).toArray()
  const slots = await collections.queueSlots.find({ gamemode }).toArray()

  return friendships
    .filter(({ source, target }) =>
      slots.some(({ player }) => player?.steamId === source || player?.steamId === target),
    )
    .map(({ source, target }) => [source, target])
}
