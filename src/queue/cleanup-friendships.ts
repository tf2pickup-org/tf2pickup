import { collections } from '../database/collections'
import { events } from '../events'
import { withQueueLock } from './with-queue-lock'

export async function cleanupFriendships() {
  await withQueueLock('cleanupfriendships', async () => {
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
