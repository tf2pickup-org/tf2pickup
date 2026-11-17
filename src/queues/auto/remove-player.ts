import { collections } from '../../database/collections'
import { logger } from '../../logger'
import type { SteamId64 } from '../../shared/types/steam-id-64'
import { kickFromQueue } from './kick-from-queue'
import { queueCommand } from './queue-command'

// forgets a player for good: frees their slot and drops friendships on both sides
export async function removePlayer(steamId: SteamId64) {
  logger.trace({ steamId }, 'queue.removePlayer()')
  await queueCommand('remove-player', async emit => {
    const slot = await collections.queueSlots.findOne({ 'player.steamId': steamId })
    if (slot) {
      await kickFromQueue(slot.queue, [steamId], emit)
    }

    const filter = { $or: [{ source: steamId }, { target: steamId }] }
    const friendships = await collections.queueFriends.find(filter).toArray()
    if (friendships.length === 0) {
      return
    }
    await collections.queueFriends.deleteMany(filter)
    for (const { queue, source, target } of friendships) {
      emit('queue/friendship:removed', { queue, source, target })
    }
  })
}
