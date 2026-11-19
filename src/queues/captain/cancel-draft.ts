import { collections } from '../../database/collections'
import type { QueueId } from '../../database/models/queue.model'
import { QueueState } from '../../database/models/queue-state.model'
import { errors } from '../../errors'
import { applyEscalatingCooldown } from '../../games/apply-escalating-cooldown'
import { logger } from '../../logger'
import { preReady } from '../../pre-ready'
import type { SteamId64 } from '../../shared/types/steam-id-64'
import { withLogLevel } from '../../utils/with-log-level'
import { queueCommand } from '../queue-command'
import { get } from '../get'
import { assertCaptainQueue } from './assert-captain-queue'
import { captainMachine } from './machine'
import { captainDraftMetrics } from './metrics'

// Either captain can end a running draft, whatever it is doing, at the price of a cooldown. Everyone
// else keeps their sign-up and the queue is evaluated again over the whole pool.
export async function cancelDraft(queue: QueueId, actor: SteamId64) {
  const settings = await get(queue)
  assertCaptainQueue(settings)
  await queueCommand('captain-cancel-draft', async emit => {
    const [state, draft] = await Promise.all([
      collections.queueState.findOne({ queue }),
      collections.captainDrafts.findOne({ queue }),
    ])
    if (
      (state?.state !== QueueState.drafting && state?.state !== QueueState.banningMaps) ||
      !draft
    ) {
      throw withLogLevel(errors.badRequest('there is no draft to cancel'), 'debug')
    }
    if (actor !== draft.red && actor !== draft.blu) {
      throw withLogLevel(errors.forbidden('only a captain can cancel the draft'), 'debug')
    }

    const captain = await collections.captainPool.findOne({ queue, 'player.steamId': actor })
    // the cooldown ban would remove the captain anyway; do it here, inside the lock
    await captainMachine.toWaiting(settings, emit, { draft, remove: [actor] })
    captainDraftMetrics.aborted.add(1, { reason: 'cancelled' })
    logger.info({ queue, steamId: actor }, 'captain draft cancelled')
    emit('queue/captainDraft:cancelled', {
      queue,
      captain: actor,
      name: captain?.player.name ?? actor,
    })
  })

  await preReady.cancel(actor)
  await applyEscalatingCooldown(actor, 'Cancelled a captain draft')
}
