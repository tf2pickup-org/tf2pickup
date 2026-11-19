import { collections } from '../../../database/collections'
import type { QueueId } from '../../../database/models/queue.model'
import type { SteamId64 } from '../../../shared/types/steam-id-64'

// toReady() readies this player along with the pre-readied ones
export async function recordLast(queue: QueueId, steamId: SteamId64) {
  await collections.queueState.updateOne({ queue }, { $set: { last: steamId } })
}
