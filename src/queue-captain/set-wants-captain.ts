import { collections } from '../database/collections'
import type { QueuePlayerModel } from '../database/models/queue-player.model'
import { errors } from '../errors'
import { events } from '../events'
import { logger } from '../logger'
import { players } from '../players'
import type { SteamId64 } from '../shared/types/steam-id-64'
import { withQueueLock } from '../queue/with-queue-lock'
import { isEligibleCaptain } from './is-eligible-captain'

export async function setWantsCaptain(
  steamId: SteamId64,
  wantsCaptain: boolean,
): Promise<QueuePlayerModel> {
  return await withQueueLock('captain.setWantsCaptain', async () => {
    logger.trace({ steamId, wantsCaptain }, 'queue-captain.setWantsCaptain()')

    const existing = await collections.queuePlayers.findOne({ steamId })
    if (!existing) {
      throw errors.badRequest('player not in the queue')
    }

    if (wantsCaptain) {
      const player = await players.bySteamId(steamId, ['stats'])
      if (!(await isEligibleCaptain(player))) {
        throw errors.badRequest('player is not eligible to be captain')
      }
    }

    const updated = (await collections.queuePlayers.findOneAndUpdate(
      { steamId },
      { $set: { wantsCaptain } },
      { returnDocument: 'after' },
    ))!

    events.emit('queue/players:updated')
    return updated
  })
}
