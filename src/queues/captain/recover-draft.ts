import { collections } from '../../database/collections'
import type { QueueModel } from '../../database/models/queue.model'
import { QueueState } from '../../database/models/queue-state.model'
import { logger } from '../../logger'
import { tasks } from '../../tasks'
import { queueCommand } from '../auto/queue-command'
import { assertCaptainQueue } from './assert-captain-queue'
import { buildLaunchSnapshot } from './build-launch-snapshot'
import { beginMapBans } from './begin-map-bans'
import { banTurn } from './ban-turn'
import { settleMapBans } from './settle-map-bans'
import { getPool } from './get-pool'
import { scheduleTurnTimeout } from './schedule-turn-timeout'

// Brings a draft back after the app (re)starts: the turn timer is scheduled again from the saved
// deadline, which fires at once when it has already passed.
export async function recoverDraft(queue: QueueModel) {
  assertCaptainQueue(queue)
  await queueCommand('captain-recover-draft', async emit => {
    const [state, draft] = await Promise.all([
      collections.queueState.findOne({ queue: queue._id }),
      collections.captainDrafts.findOne({ queue: queue._id }),
    ])
    if (
      !draft ||
      !state ||
      ![QueueState.drafting, QueueState.banningMaps, QueueState.launching].includes(state.state)
    ) {
      return
    }

    if (state.state === QueueState.launching) {
      const game = await collections.games.findOne({ captainDraftToken: draft.token })
      if (game) emit('queue/captainGame:created', { game })
      else
        emit('queue/captain:launching', buildLaunchSnapshot(queue, draft, await getPool(queue._id)))
      return
    }

    if (state.state === QueueState.banningMaps) {
      if (!draft.mapOptions.length) {
        await beginMapBans(queue, draft, await getPool(queue._id), emit)
        return
      }
      if (banTurn(draft).remaining.length === 1) {
        await settleMapBans(queue, draft, emit)
        return
      }
    }

    logger.info({ queue: queue._id }, 'captain draft was running, resuming it')
    await tasks.cancel('queue/captain:turnTimeout', { queue: queue._id })
    await scheduleTurnTimeout(queue, draft, state.state === QueueState.banningMaps ? 'ban' : 'pick')
  })
}
