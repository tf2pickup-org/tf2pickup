import { collections } from '../../database/collections'
import type { QueueId } from '../../database/models/queue.model'
import { QueueState } from '../../database/models/queue-state.model'
import { queueCommand } from '../queue-command'
import { get } from '../get'
import { captainDraftMetrics } from './metrics'
import { captainMachine } from './machine'

export async function launchFailed(queue: QueueId, token: string) {
  await queueCommand('captain-launch-failed', async emit => {
    const [settings, state, draft] = await Promise.all([
      get(queue),
      collections.queueState.findOne({ queue }),
      collections.captainDrafts.findOne({ queue }),
    ])
    if (
      settings.launchMode !== 'captain' ||
      state?.state !== QueueState.launching ||
      draft?.token !== token
    )
      return
    captainDraftMetrics.aborted.add(1, { reason: 'launch_failed' })
    await captainMachine.toWaiting(settings, emit, { draft, failed: true })
    emit('queue/captainDraft:failed', { queue, message: 'Failed to launch game' })
  })
}
