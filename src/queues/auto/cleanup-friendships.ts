import { collections } from '../../database/collections'
import type { QueueId } from '../../database/models/queue.model'
import { get } from '../get'
import { queueCommand } from './queue-command'

export async function cleanupFriendships(queue: QueueId) {
  await queueCommand('cleanup-friendships', async emit => {
    if ((await get(queue)).launchMode !== 'auto') {
      return
    }

    const medics = (
      await collections.queueSlots
        .find({ queue, 'canMakeFriendsWith.0': { $exists: true }, player: { $ne: null } })
        .toArray()
    ).map(({ player }) => player!.steamId)
    const friendships = await collections.queueFriends
      .find({ queue, source: { $nin: medics } })
      .toArray()
    if (friendships.length === 0) return
    await collections.queueFriends.deleteMany({
      queue,
      source: { $in: friendships.map(({ source }) => source) },
    })
    for (const { source, target } of friendships) {
      emit('queue/friendship:removed', { queue, source, target })
    }
  })
}
