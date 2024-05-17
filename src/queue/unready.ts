import { collections } from '../database/collections'
import { QueueSlotModel } from '../database/models/queue-slot.model'
import { events } from '../events'
import { SteamId64 } from '../shared/types/steam-id-64'
import { mutex } from './mutex'

export async function unready(...steamIds: SteamId64[]): Promise<QueueSlotModel[]> {
  return await mutex.runExclusive(async () => {
    const slots: QueueSlotModel[] = []
    for (const steamId of steamIds) {
      const slot = await collections.queueSlots.findOneAndUpdate(
        {
          player: steamId,
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
      events.emit('queue/slots:updated', { slots })
    }

    return slots
  })
}
