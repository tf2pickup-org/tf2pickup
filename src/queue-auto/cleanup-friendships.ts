import { collections } from '../database/collections'
import { events } from '../events'
import type { Gamemode } from '../shared/types/gamemode'

export async function cleanupFriendships(gamemode: Gamemode) {
  const medics = (
    await collections.queueSlots
      .find({ gamemode, 'canMakeFriendsWith.0': { $exists: true }, player: { $ne: null } })
      .toArray()
  ).map(({ player }) => player!.steamId)
  const friendships = await collections.queueFriends
    .find({ gamemode, source: { $nin: medics } })
    .toArray()
  if (friendships.length === 0) return
  await collections.queueFriends.deleteMany({
    gamemode,
    source: { $in: friendships.map(({ source }) => source) },
  })
  for (const { source, target } of friendships) {
    events.emit('queue/friendship:removed', { gamemode, source, target })
  }
}
