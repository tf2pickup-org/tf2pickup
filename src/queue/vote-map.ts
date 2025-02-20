import { collections } from '../database/collections'
import { errors } from '../errors'
import { events } from '../events'
import { logger } from '../logger'
import type { SteamId64 } from '../shared/types/steam-id-64'
import { getMapVoteResults } from './get-map-vote-results'
import { mutex } from './mutex'

export async function voteMap(steamId: SteamId64, map: string): Promise<Record<string, number>> {
  return await mutex.runExclusive(async () => {
    logger.trace({ steamId, map }, 'queue.voteMap()')
    const mapCount = await collections.queueMapOptions.countDocuments({ name: map })
    if (mapCount === 0) {
      throw errors.notFound('this map not an option in the vote')
    }

    const slotCount = await collections.queueSlots.countDocuments({ player: steamId })
    if (slotCount === 0) {
      throw errors.badRequest('player not in the queue')
    }

    await collections.queueMapVotes.findOneAndUpdate(
      { player: steamId },
      { $set: { map } },
      { upsert: true },
    )

    const results = await getMapVoteResults()
    events.emit('queue/mapVoteResults:updated', { results })
    return results
  })
}
