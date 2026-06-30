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
  logger.trace({ steamId }, 'queue.leave()')
  const current = await collections.queueSlots.findOne({ 'player.steamId': steamId })
  if (!current) {
    throw withLogLevel(errors.badRequest('player not in the queue'), 'debug')
  }
  const gamemode = current.gamemode

  return await withQueueLock(gamemode, 'leave', async () => {
    const state = await getState(gamemode)
    if (state === QueueState.launching) {
      throw withLogLevel(errors.badRequest('invalid queue state'), 'debug')
    }

    const slot = await collections.queueSlots.findOneAndUpdate(
      {
        gamemode,
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
      throw withLogLevel(errors.badRequest('player not in the queue'), 'debug')
    }
    events.emit('queue/slots:updated', { gamemode, slots: [slot] })

    const { deletedCount } = await collections.queueMapVotes.deleteMany({
      gamemode,
      player: steamId,
    })
    if (deletedCount > 0) {
      events.emit('queue/mapVoteResults:updated', {
        gamemode,
        results: await getMapVoteResults(gamemode),
      })
    }

    await preReady.cancel(steamId)
    return slot
  })
}
