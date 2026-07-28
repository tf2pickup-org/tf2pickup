import { collections } from '../database/collections'
import type { CaptainsPoolEntryModel } from '../database/models/captains-pool-entry.model'
import { QueueState } from '../database/models/queue-state.model'
import { errors } from '../errors'
import { events } from '../events'
import { logger } from '../logger'
import { players } from '../players'
import { getState } from '../queue/get-state'
import { withQueueLock } from '../queue/with-queue-lock'
import type { SteamId64 } from '../shared/types/steam-id-64'
import { withLogLevel } from '../utils/with-log-level'
import { canCaptain } from './can-captain'

export async function toggleCaptain(steamId: SteamId64): Promise<CaptainsPoolEntryModel> {
  logger.trace({ steamId }, 'queueCaptains.toggleCaptain()')
  const player = await players.bySteamId(steamId, ['stats'])

  return await withQueueLock('captains:toggle-captain', async () => {
    const state = await getState()
    if (state !== QueueState.waiting) {
      throw withLogLevel(errors.badRequest('invalid queue state'), 'debug')
    }

    const entry = await collections.queueCaptainsPool.findOne({ 'player.steamId': steamId })
    if (!entry) {
      throw withLogLevel(errors.badRequest('player not in the queue'), 'debug')
    }

    // only checked when volunteering, so losing eligibility never traps someone as a volunteer
    if (!entry.wantsToCaptain) {
      const eligibility = await canCaptain(player)
      if (!eligibility.eligible) {
        throw errors.badRequest(eligibility.reason)
      }
    }

    const updated = (await collections.queueCaptainsPool.findOneAndUpdate(
      { 'player.steamId': steamId },
      { $set: { wantsToCaptain: !entry.wantsToCaptain } },
      { returnDocument: 'after' },
    ))!

    events.emit('queueCaptains/pool:updated', { entries: [updated] })
    return updated
  })
}
