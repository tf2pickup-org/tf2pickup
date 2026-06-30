import { collections } from '../database/collections'
import { errors } from '../errors'
import { events } from '../events'
import { logger } from '../logger'
import type { SteamId64 } from '../shared/types/steam-id-64'
import { getMapVoteResults } from './get-map-vote-results'
import { withQueueLock } from '../queue/with-queue-lock'
import { withLogLevel } from '../utils/with-log-level'

export async function voteMap(steamId: SteamId64, map: string): Promise<Record<string, number>> {
  logger.trace({ steamId, map }, 'queue.voteMap()')
  const slot = await collections.queueSlots.findOne({ 'player.steamId': steamId })
  if (!slot) {
    throw withLogLevel(errors.badRequest('player not in the queue'), 'debug')
  }
  const gamemode = slot.gamemode

  return await withQueueLock(gamemode, 'vote-map', async () => {
    const mapCount = await collections.queueMapOptions.countDocuments({ gamemode, name: map })
    if (mapCount === 0) {
      throw errors.notFound('this map not an option in the vote')
    }

    const { deletedCount } = await collections.queueMapVotes.deleteOne({
      gamemode,
      player: steamId,
      map,
    })
    if (deletedCount === 0) {
      await collections.queueMapVotes.findOneAndUpdate(
        { gamemode, player: steamId },
        { $set: { map } },
        { upsert: true },
      )
    }

    const results = await getMapVoteResults(gamemode)
    events.emit('queue/mapVoteResults:updated', { gamemode, results })
    return results
  })
}
