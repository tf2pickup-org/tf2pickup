import { collections } from '../../database/collections'
import type { QueueSlotModel } from '../../database/models/queue-slot.model'
import { QueueState } from '../../database/models/queue-state.model'
import { errors } from '../../errors'
import { events } from '../../events'
import { logger } from '../../logger'
import type { SteamId64 } from '../../shared/types/steam-id-64'
import { withLogLevel } from '../../utils/with-log-level'
import { getState } from '../get-state'
import { withQueueLock } from '../with-queue-lock'
import { getMapVoteResults } from './get-map-vote-results'

export async function vacateSlot(steamId: SteamId64): Promise<QueueSlotModel> {
  const current = await collections.queueSlots.findOne({ 'player.steamId': steamId })
  if (!current) {
    throw withLogLevel(errors.badRequest('player not in the queue'), 'debug')
  }

  const { queue } = current
  return await withQueueLock(queue, 'vacate-slot', async () => {
    logger.trace({ queue, steamId }, 'queue.vacateSlot()')
    if ((await getState(queue)) === QueueState.launching) {
      throw withLogLevel(errors.badRequest('invalid queue state'), 'debug')
    }

    const slot = await collections.queueSlots.findOneAndUpdate(
      { queue, 'player.steamId': steamId },
      { $set: { player: null, ready: false } },
      { returnDocument: 'after' },
    )
    if (!slot) {
      throw withLogLevel(errors.badRequest('player not in the queue'), 'debug')
    }
    events.emit('queue/slots:updated', { queue, slots: [slot] })

    const { deletedCount } = await collections.queueMapVotes.deleteMany({ queue, player: steamId })
    if (deletedCount > 0) {
      events.emit('queue/mapVoteResults:updated', {
        queue,
        results: await getMapVoteResults(queue),
      })
    }

    return slot
  })
}
