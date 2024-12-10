import { collections } from '../database/collections'
import type { QueueSlotModel } from '../database/models/queue-slot.model'
import { QueueState } from '../database/models/queue-state.model'
import { events } from '../events'
import { logger } from '../logger'
import type { SteamId64 } from '../shared/types/steam-id-64'
import { getState } from './get-state'
import { mutex } from './mutex'

export async function markAsFriend(
  source: SteamId64,
  target: SteamId64 | null,
): Promise<QueueSlotModel | null> {
  return await mutex.runExclusive(async () => {
    logger.trace({ source, target }, `queue.markAsFriend()`)

    const queueState = await getState()
    if (queueState === QueueState.launching) {
      throw new Error('cannot mark as friend at this stage')
    }

    const sourceSlot = await collections.queueSlots.findOne({ player: source })
    if (!sourceSlot) {
      throw new Error(`source slot not found: ${source}`)
    }

    if (target === null) {
      const friendship = await collections.queueFriends.findOne({ source })
      if (!friendship) {
        throw new Error(`friendship not found: ${source}`)
      }
      const targetSlot = await collections.queueSlots.findOne({ player: friendship.target })
      await collections.queueFriends.deleteOne({ source })
      events.emit('queue/friendship:removed', { source, target: friendship.target })
      return targetSlot
    } else {
      const targetSlot = await collections.queueSlots.findOne({ player: target })
      const friendship = await collections.queueFriends.findOne({ source })
      const after = await collections.queueFriends.findOneAndUpdate(
        { source },
        { $set: { target } },
        { upsert: true, returnDocument: 'after' },
      )
      if (!after) {
        throw new Error(`failed to update friendship: ${source} -> ${target}`)
      }
      if (friendship) {
        events.emit('queue/friendship:updated', {
          source,
          target: { before: friendship.target, after: after.target },
        })
      } else {
        events.emit('queue/friendship:created', { source, target: after.target })
      }
      return targetSlot
    }
  })
}
