import { collections } from '../database/collections'
import { QueueState } from '../database/models/queue-state.model'
import { errors } from '../errors'
import { events } from '../events'
import { logger } from '../logger'
import { preReady } from '../pre-ready'
import { getState } from '../queue/get-state'
import { withQueueLock } from '../queue/with-queue-lock'
import type { SteamId64 } from '../shared/types/steam-id-64'
import { withLogLevel } from '../utils/with-log-level'

export async function leave(steamId: SteamId64): Promise<void> {
  await withQueueLock('captains:leave', async () => {
    logger.trace({ steamId }, 'queueCaptains.leave()')
    const state = await getState()
    if (state === QueueState.launching) {
      throw withLogLevel(errors.badRequest('invalid queue state'), 'debug')
    }

    const entry = await collections.queueCaptainsPool.findOneAndDelete({
      'player.steamId': steamId,
    })
    if (!entry) {
      throw withLogLevel(errors.badRequest('player not in the queue'), 'debug')
    }

    events.emit('queueCaptains/pool:left', { steamId })
    await preReady.cancel(steamId)
  })
}
