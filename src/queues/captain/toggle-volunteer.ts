import { collections } from '../../database/collections'
import type { QueueId } from '../../database/models/queue.model'
import { QueueState } from '../../database/models/queue-state.model'
import { errors } from '../../errors'
import { logger } from '../../logger'
import type { SteamId64 } from '../../shared/types/steam-id-64'
import { withLogLevel } from '../../utils/with-log-level'
import { players } from '../../players'
import { preReady } from '../../pre-ready'
import { Tf2ClassName } from '../../shared/types/tf2-class-name'
import { joinBlocker } from '../auto/join-blocker'
import { queueCommand } from '../auto/queue-command'
import { get } from '../get'
import { getState } from '../get-state'
import { advance } from './advance'
import { assertCaptainQueue } from './assert-captain-queue'

// Only a player in the pool can volunteer; leaving the pool clears the flag.
export async function toggleVolunteer(queue: QueueId, steamId: SteamId64) {
  const settings = await get(queue)
  assertCaptainQueue(settings)
  const readied = await queueCommand('captain-toggle-volunteer', async emit => {
    const state = await getState(queue)
    if (state === QueueState.launching) {
      throw withLogLevel(errors.badRequest('invalid queue state'), 'debug')
    }

    const member = await collections.captainPool.findOne({ queue, 'player.steamId': steamId })
    if (!member) {
      throw withLogLevel(errors.badRequest('you are not in the pool'), 'debug')
    }
    if (member.locked) {
      throw withLogLevel(errors.badRequest('you are locked into the current draft'), 'debug')
    }

    const volunteer = !member.volunteer
    if (volunteer) {
      const blocker = joinBlocker(
        await players.bySteamId(steamId, [
          'hasAcceptedRules',
          'bans',
          'activeGame',
          'skill',
          'verified',
        ]),
        { gameClass: Tf2ClassName.medic },
        { ...settings, skillThreshold: null },
        undefined,
      )
      if (blocker) {
        throw errors.badRequest(blocker)
      }
    }
    await collections.captainPool.updateOne(
      { queue, 'player.steamId': steamId },
      { $set: { volunteer, ...(state === QueueState.ready ? { ready: true } : {}) } },
    )
    logger.info({ queue, steamId, volunteer }, 'captain volunteer toggled')
    emit('queue/captainPool:updated', { queue })
    const filled = await advance(queue, emit, { state, settings, last: steamId })
    return filled || state === QueueState.ready
  })
  if (readied) await preReady.start(steamId)
}
