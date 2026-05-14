import { collections } from '../database/collections'
import type { QueueSlotModel } from '../database/models/queue-slot.model'
import { QueueState } from '../database/models/queue-state.model'
import { events } from '../events'
import { logger } from '../logger'
import type { SteamId64 } from '../shared/types/steam-id-64'
import { getMapVoteResults } from './get-map-vote-results'
import { getState } from './get-state'
import { mutex } from './mutex'
import { preReady } from '../pre-ready'
import { errors } from '../errors'
import { queueMutexWaitDuration } from './metrics'
import { performance } from 'perf_hooks'

export async function leave(steamId: SteamId64): Promise<QueueSlotModel> {
  const waitStart = performance.now()
  return await mutex.runExclusive(async () => {
    queueMutexWaitDuration.record((performance.now() - waitStart) / 1000, { operation: 'leave' })
    logger.trace({ steamId }, 'queue.leave()')
    const state = await getState()
    if (state === QueueState.launching) {
      throw errors.badRequest('invalid queue state')
    }

    const slot = await collections.queueSlots.findOneAndUpdate(
      {
        'player.steamId': steamId,
      },
      {
        $set: { player: null },
      },
      {
        returnDocument: 'after',
      },
    )

    if (!slot) {
      throw errors.badRequest('player not in the queue')
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
