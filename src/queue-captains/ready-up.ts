import { collections } from '../database/collections'
import type { CaptainsPoolEntryModel } from '../database/models/captains-pool-entry.model'
import { QueueState } from '../database/models/queue-state.model'
import { errors } from '../errors'
import { events } from '../events'
import { logger } from '../logger'
import { preReady } from '../pre-ready'
import { getState } from '../queue/get-state'
import { withQueueLock } from '../queue/with-queue-lock'
import type { SteamId64 } from '../shared/types/steam-id-64'

export async function readyUp(steamId: SteamId64): Promise<CaptainsPoolEntryModel> {
  return await withQueueLock('captains:ready-up', async () => {
    logger.trace({ steamId }, 'queueCaptains.readyUp()')
    if ((await getState()) !== QueueState.ready) {
      throw errors.badRequest('wrong queue state')
    }

    const entry = await collections.queueCaptainsPool.findOneAndUpdate(
      { 'player.steamId': steamId },
      { $set: { ready: true } },
      { returnDocument: 'after' },
    )
    if (!entry) {
      throw errors.badRequest(`player not in queue: ${steamId}`)
    }

    events.emit('queueCaptains/pool:updated', { entries: [entry] })
    await preReady.start(steamId)
    return entry
  })
}
