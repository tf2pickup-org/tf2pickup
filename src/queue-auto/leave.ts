import { collections } from '../database/collections'
import type { QueueSlotModel } from '../database/models/queue-slot.model'
import { QueueState } from '../database/models/queue-state.model'
import { events } from '../events'
import { logger } from '../logger'
import type { SteamId64 } from '../shared/types/steam-id-64'
import { getMapVoteResults } from './get-map-vote-results'
import { getState } from '../queue/get-state'
import { withQueueLock } from '../queue/with-queue-lock'
import { preReady } from '../pre-ready'
import { errors } from '../errors'
import { withLogLevel } from '../utils/with-log-level'

export async function leave(steamId: SteamId64): Promise<QueueSlotModel> {
  return await withQueueLock('leave', async () => {
    logger.trace({ steamId }, 'queue.leave()')
    const state = await getState()
    if (state === QueueState.launching) {
      throw withLogLevel(errors.badRequest('invalid queue state'), 'debug')
    }

    const slot = await collections.queueSlots.findOneAndUpdate(
      {
        'player.steamId': steamId,
      },
      {
        $set: { player: null, ready: false },
      },
      {
        returnDocument: 'after',
      },
    )

    if (!slot) {
      throw withLogLevel(errors.badRequest('player not in the queue'), 'debug')
    }
    events.emit('queue/slots:updated', { slots: [slot] })

    const { deletedCount } = await collections.queueMapVotes.deleteMany({ player: steamId })
    if (deletedCount > 0) {
      events.emit('queue/mapVoteResults:updated', { results: await getMapVoteResults() })
    }

    await preReady.cancel(steamId)
    return slot
  })
}
