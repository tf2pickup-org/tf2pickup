import { collections } from '../database/collections'
import type { SteamId64 } from '../shared/types/steam-id-64'

export async function getFriends(): Promise<SteamId64[][]> {
  const friendships = await collections.queueFriends.find().toArray()
  const slots = await collections.queueSlots.find().toArray()

  return friendships
    .filter(({ source, target }) =>
      slots.some(({ player }) => player === source || player === target),
    )
    .map(({ source, target }) => [source, target])
}
