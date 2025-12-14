import { collections } from '../database/collections'
import { events } from '../events'
import { mutex } from './mutex'

export async function cleanupFriendships() {
  await mutex.runExclusive(async () => {
    const medics = (
      await collections.queueSlots
        .find({ 'canMakeFriendsWith.0': { $exists: true }, player: { $ne: null } })
        .toArray()
    ).map(({ player }) => player!.steamId)
    const friendships = await collections.queueFriends.find({ source: { $nin: medics } }).toArray()
    for (const { source, target } of friendships) {
      await collections.queueFriends.deleteOne({ source })
      events.emit('queue/friendship:removed', {
        source,
        target,
      })
    }
  })
}
