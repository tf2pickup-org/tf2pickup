import { collections } from '../database/collections'
import type { QueueSlotModel } from '../database/models/queue-slot.model'
import { QueueState } from '../database/models/queue-state.model'
import { events } from '../events'
import { logger } from '../logger'
import type { SteamId64 } from '../shared/types/steam-id-64'
import type { Gamemode } from '../shared/types/gamemode'
import { getMapVoteResults } from './get-map-vote-results'
import { getState } from '../queue/get-state'
import { withQueueLock } from '../queue/with-queue-lock'
import { preReady } from '../pre-ready'
import { errors } from '../errors'
import { withLogLevel } from '../utils/with-log-level'

export async function kick(
  gamemode: Gamemode,
  ...steamIds: SteamId64[]
): Promise<QueueSlotModel[]> {
  return await withQueueLock(gamemode, 'kick', async () => {
    logger.trace({ gamemode, steamIds }, 'queue.kick()')
    const state = await getState(gamemode)
    if (state === QueueState.launching) {
      throw withLogLevel(errors.badRequest('invalid queue state'), 'debug')
    }

    const slots: QueueSlotModel[] = []
    for (const steamId of steamIds) {
      const slot = await collections.queueSlots.findOneAndUpdate(
        {
          gamemode,
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
        continue
      }

      events.emit('queue:playerKicked', { player: steamId })
      slots.push(slot)
    }

    if (slots.length > 0) {
      events.emit('queue/slots:updated', { gamemode, slots })
      await collections.queueMapVotes.deleteMany({ gamemode, player: { $in: steamIds } })
      events.emit('queue/mapVoteResults:updated', {
        gamemode,
        results: await getMapVoteResults(gamemode),
      })
      for (const steamId of steamIds) {
        await preReady.cancel(steamId)
      }
    }

    return slots
  })
}
