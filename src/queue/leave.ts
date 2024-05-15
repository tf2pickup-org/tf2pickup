import { collections } from '../database/collections'
import { QueueSlotModel } from '../database/models/queue-slot.model'
import { QueueState } from '../database/models/queue-state.model'
import { SteamId64 } from '../shared/types/steam-id-64'
import { getState } from './get-state'
import { mutex } from './mutex'

export async function leave(steamId: SteamId64): Promise<QueueSlotModel> {
  return await mutex.runExclusive(async () => {
    const state = await getState()
    if (state === QueueState.launching) {
      throw new Error('invalid queue state')
    }

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
      throw new Error('player not in the queue')
    }
    return slot
  })
}
