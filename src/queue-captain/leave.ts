import { collections } from '../database/collections'
import type { QueuePlayerModel } from '../database/models/queue-player.model'
import { QueueState } from '../database/models/queue-state.model'
import { errors } from '../errors'
import { events } from '../events'
import { logger } from '../logger'
import { preReady } from '../pre-ready'
import type { SteamId64 } from '../shared/types/steam-id-64'
import { getState } from '../queue/get-state'
import { withQueueLock } from '../queue/with-queue-lock'

export async function leave(steamId: SteamId64): Promise<QueuePlayerModel> {
  return await withQueueLock('captain.leave', async () => {
    logger.trace({ steamId }, 'queue-captain.leave()')

    const state = await getState()
    if (state === QueueState.launching) {
      throw errors.badRequest('invalid queue state')
    }

    const player = await collections.queuePlayers.findOneAndDelete({ steamId })
    if (!player) {
      throw errors.badRequest('player not in the queue')
    }

    const allPlayers = await collections.queuePlayers.find({}).toArray()
    events.emit('queue/players:updated', { players: allPlayers })
    await preReady.cancel(steamId)
    return player
  })
}
