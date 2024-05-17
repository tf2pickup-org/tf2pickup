import { collections } from '../database/collections'
import { QueueSlotModel } from '../database/models/queue-slot.model'
import { QueueState } from '../database/models/queue-state.model'
import { events } from '../events'
import { SteamId64 } from '../shared/types/steam-id-64'
import { getState } from './get-state'

export async function readyUp(steamId: SteamId64): Promise<QueueSlotModel> {
  const state = await getState()
  if (state !== QueueState.ready) {
    throw new Error('wrong queue state')
  }

  const slot = await collections.queueSlots.findOneAndUpdate(
    { player: steamId },
    { $set: { ready: true } },
    { returnDocument: 'after' },
  )
  if (!slot) {
    throw new Error(`player not in queue: ${steamId}`)
  }

  events.emit('queue/slots:updated', { slots: [slot] })
  return slot
}
