import { collections } from '../database/collections'
import type { QueuePlayerModel } from '../database/models/queue-player.model'
import { QueueState } from '../database/models/queue-state.model'
import { errors } from '../errors'
import { events } from '../events'
import { logger } from '../logger'
import { preReady } from '../pre-ready'
import type { Tf2ClassName } from '../shared/types/tf2-class-name'
import type { SteamId64 } from '../shared/types/steam-id-64'
import { getState } from '../queue/get-state'
import { withQueueLock } from '../queue/with-queue-lock'

export async function removeOfferedClass(
  steamId: SteamId64,
  gameClass: Tf2ClassName,
): Promise<QueuePlayerModel> {
  return await withQueueLock('captain.removeOfferedClass', async () => {
    logger.trace({ steamId, gameClass }, 'queue-captain.removeOfferedClass()')

    const state = await getState()
    if (state === QueueState.launching) {
      throw errors.badRequest('invalid queue state')
    }

    const existing = await collections.queuePlayers.findOne({ steamId })
    if (!existing) {
      throw errors.badRequest('player not in the queue')
    }

    if (!existing.offeredClasses.includes(gameClass)) {
      return existing
    }

    if (existing.offeredClasses.length === 1) {
      await collections.queuePlayers.deleteOne({ steamId })
      await preReady.cancel(steamId)
      const allPlayers = await collections.queuePlayers.find({}).toArray()
      events.emit('queue/players:updated', { players: allPlayers })
      return existing
    }

    const updated = (await collections.queuePlayers.findOneAndUpdate(
      { steamId },
      { $pull: { offeredClasses: gameClass } },
      { returnDocument: 'after' },
    ))!

    const allPlayers = await collections.queuePlayers.find({}).toArray()
    events.emit('queue/players:updated', { players: allPlayers })
    return updated
  })
}
