import { collections } from '../../database/collections'
import type { QueueId } from '../../database/models/queue.model'
import { errors } from '../../errors'
import { events } from '../../events'
import { logger } from '../../logger'
import type { SteamId64 } from '../../shared/types/steam-id-64'
import { getMapVoteResults } from './get-map-vote-results'
import { withQueueLock } from '../with-queue-lock'
import { withLogLevel } from '../../utils/with-log-level'

export async function voteMap(
  steamId: SteamId64,
  map: string,
): Promise<{ queue: QueueId; results: Record<string, number> }> {
  const slot = await collections.queueSlots.findOne({ 'player.steamId': steamId })
  if (!slot) {
    throw withLogLevel(errors.badRequest('player not in the queue'), 'debug')
  }

  const { queue } = slot
  return await withQueueLock(queue, 'vote-map', async () => {
    logger.trace({ queue, steamId, map }, 'queue.voteMap()')
    const mapCount = await collections.queueMapOptions.countDocuments({ queue, name: map })
    if (mapCount === 0) {
      throw errors.notFound('this map not an option in the vote')
    }

    const { deletedCount } = await collections.queueMapVotes.deleteOne({
      queue,
      player: steamId,
      map,
    })
    if (deletedCount === 0) {
      await collections.queueMapVotes.findOneAndUpdate(
        { queue, player: steamId },
        { $set: { map } },
        { upsert: true },
      )
    }

    const results = await getMapVoteResults(queue)
    events.emit('queue/mapVoteResults:updated', { queue, results })
    return { queue, results }
  })
}
