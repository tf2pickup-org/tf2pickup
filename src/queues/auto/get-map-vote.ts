import { collections } from '../../database/collections'
import type { QueueId } from '../../database/models/queue.model'
import type { SteamId64 } from '../../shared/types/steam-id-64'

export async function getMapVote(queue: QueueId, actor: SteamId64 | undefined) {
  if (actor) {
    return (await collections.queueMapVotes.findOne({ queue, player: actor }))?.map
  } else {
    return undefined
  }
}
