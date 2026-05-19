import { collections } from '../database/collections'
import { events } from '../events'

export async function cleanupFriendships() {
  const medics = (
    await collections.queueSlots
      .find({ 'canMakeFriendsWith.0': { $exists: true }, player: { $ne: null } })
      .toArray()
  ).map(({ player }) => player!.steamId)
  const friendships = await collections.queueFriends.find({ source: { $nin: medics } }).toArray()
  if (friendships.length === 0) return
  await collections.queueFriends.deleteMany({
    source: { $in: friendships.map(({ source }) => source) },
  })
  for (const { source, target } of friendships) {
    events.emit('queue/friendship:removed', { source, target })
  }
}
