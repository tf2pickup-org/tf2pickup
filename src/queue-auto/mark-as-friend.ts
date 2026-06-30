import { collections } from '../database/collections'
import type { QueueSlotModel } from '../database/models/queue-slot.model'
import { QueueState } from '../database/models/queue-state.model'
import { errors } from '../errors'
import { events } from '../events'
import { logger } from '../logger'
import type { SteamId64 } from '../shared/types/steam-id-64'
import { getState } from '../queue/get-state'
import { withQueueLock } from '../queue/with-queue-lock'

export async function markAsFriend(
  source: SteamId64,
  target: SteamId64 | null,
): Promise<QueueSlotModel | null> {
  logger.trace({ source, target }, `queue.markAsFriend()`)
  const sourceSlot = await collections.queueSlots.findOne({ 'player.steamId': source })
  if (!sourceSlot) {
    throw errors.notFound(`source slot not found: ${source}`)
  }
  const gamemode = sourceSlot.gamemode

  return await withQueueLock(gamemode, 'mark-as-friend', async () => {
    const queueState = await getState(gamemode)
    if (queueState === QueueState.launching) {
      throw errors.badRequest('cannot mark as friend at this stage')
    }

    if (target === null) {
      const friendship = await collections.queueFriends.findOne({ gamemode, source })
      if (!friendship) {
        throw errors.notFound(`friendship not found: ${source}`)
      }
      const targetSlot = await collections.queueSlots.findOne({
        gamemode,
        'player.steamId': friendship.target,
      })
      await collections.queueFriends.deleteOne({ gamemode, source })
      events.emit('queue/friendship:removed', { gamemode, source, target: friendship.target })
      return targetSlot
    } else {
      const targetSlot = await collections.queueSlots.findOne({
        gamemode,
        'player.steamId': target,
      })
      const friendship = await collections.queueFriends.findOne({ gamemode, source })
      const after = await collections.queueFriends.findOneAndUpdate(
        { gamemode, source },
        { $set: { target } },
        { upsert: true, returnDocument: 'after' },
      )
      if (!after) {
        throw errors.badRequest(`failed to update friendship: ${source} -> ${target}`)
      }
      if (friendship) {
        events.emit('queue/friendship:updated', {
          gamemode,
          source,
          target: { before: friendship.target, after: after.target },
        })
      } else {
        events.emit('queue/friendship:created', { gamemode, source, target: after.target })
      }
      return targetSlot
    }
  })
}
