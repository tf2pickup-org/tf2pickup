import { collections } from '../../database/collections'
import type { QueueId } from '../../database/models/queue.model'
import type { QueueSlotModel } from '../../database/models/queue-slot.model'
import { events } from '../../events'
import { logger } from '../../logger'
import type { SteamId64 } from '../../shared/types/steam-id-64'
import { withQueueLock } from '../with-queue-lock'

export async function unready(queue: QueueId, ...steamIds: SteamId64[]): Promise<QueueSlotModel[]> {
  return await withQueueLock(queue, 'unready', async () => {
    logger.trace({ queue, steamIds }, 'queue.unready()')
    const slots: QueueSlotModel[] = []
    for (const steamId of steamIds) {
      const slot = await collections.queueSlots.findOneAndUpdate(
        { queue, 'player.steamId': steamId },
        { $set: { ready: false } },
        { returnDocument: 'after' },
      )

      if (slot) {
        slots.push(slot)
      }
    }

    if (slots.length > 0) {
      events.emit('queue/slots:updated', { queue, slots })
    }

    return slots
  })
}
