import { collections } from '../database/collections'
import type { QueueSlotModel } from '../database/models/queue-slot.model'
import { events } from '../events'
import { logger } from '../logger'
import type { SteamId64 } from '../shared/types/steam-id-64'
import type { Gamemode } from '../shared/types/gamemode'
import { withQueueLock } from '../queue/with-queue-lock'

export async function unready(
  gamemode: Gamemode,
  ...steamIds: SteamId64[]
): Promise<QueueSlotModel[]> {
  return await withQueueLock(gamemode, 'unready', async () => {
    logger.trace({ gamemode, steamIds }, 'queue.unready()')
    const slots: QueueSlotModel[] = []
    for (const steamId of steamIds) {
      const slot = await collections.queueSlots.findOneAndUpdate(
        {
          gamemode,
          'player.steamId': steamId,
        },
        {
          $set: { ready: false },
        },
        {
          returnDocument: 'after',
        },
      )

      if (!slot) {
        continue
      }

      slots.push(slot)
    }

    if (slots.length > 0) {
      events.emit('queue/slots:updated', { gamemode, slots })
    }

    return slots
  })
}
