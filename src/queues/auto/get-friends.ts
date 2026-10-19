import { collections } from '../../database/collections'
import type { QueueId } from '../../database/models/queue.model'
import type { SteamId64 } from '../../shared/types/steam-id-64'

export async function getFriends(queue: QueueId): Promise<SteamId64[][]> {
  const friendships = await collections.queueFriends.find({ queue }).toArray()
  const slots = await collections.queueSlots.find({ queue }).toArray()

  return friendships
    .filter(({ source, target }) =>
      slots.some(({ player }) => player?.steamId === source || player?.steamId === target),
    )
    .map(({ source, target }) => [source, target])
}
