import { collections } from '../../../database/collections'
import type { QueueModel } from '../../../database/models/queue.model'
import { QueueState } from '../../../database/models/queue-state.model'
import { logger } from '../../../logger'
import { queueCommand } from '../../queue-command'
import { assertCaptainQueue } from '../assert-captain-queue'
import { banTurn } from '../ban-turn'
import { buildLaunchSnapshot } from '../build-launch-snapshot'
import { getPool } from '../get-pool'
import { advanceDraft } from './advance-draft'
import { turnTimer } from './turn-timer'

// Brings a draft back after the app (re)starts: the turn timer is scheduled again from the saved
// deadline, which fires at once when it has already passed.
export async function recover(queue: QueueModel) {
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
      const game = await collections.games.findOne({ launchToken: draft.token })
      if (game) emit('queue/game:created', { game })
      else
        emit('queue/captain:launching', buildLaunchSnapshot(queue, draft, await getPool(queue._id)))
      return
    }

    if (
      state.state === QueueState.banningMaps &&
      (!draft.mapOptions.length || banTurn(draft).remaining.length === 1)
    ) {
      await advanceDraft(queue, draft, emit)
      return
    }

    logger.info({ queue: queue._id }, 'captain draft was running, resuming it')
    await turnTimer.stop(queue._id)
    await turnTimer.start(queue._id, draft, state.state === QueueState.banningMaps ? 'ban' : 'pick')
  })
}
