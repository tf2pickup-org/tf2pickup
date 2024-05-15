import { collections } from '../database/collections'
import { QueueSlotModel } from '../database/models/queue-slot.model'
import { QueueState } from '../database/models/queue-state.model'
import { events } from '../events'
import { SteamId64 } from '../shared/types/steam-id-64'
import { getState } from './get-state'
import { mutex } from './mutex'

export async function kick(...steamIds: SteamId64[]): Promise<QueueSlotModel[]> {
  return await mutex.runExclusive(async () => {
    const state = await getState()
    if (state === QueueState.launching) {
      throw new Error('invalid queue state')
    }

    const slots: QueueSlotModel[] = []
    for (const steamId of steamIds) {
      const slot = await collections.queueSlots.findOneAndUpdate(
        {
          player: steamId,
        },
        {
          $set: { player: null, ready: false },
        },
        {
          returnDocument: 'after',
        },
      )

      if (!slot) {
        continue
      }

      // await collections.queueMapVotes.deleteMany({ player: steamId })
      slots.push(slot)
    }

    if (slots.length > 0) {
      events.emit('queue/slots:updated', { slots })
    }

    return slots
  })
}
