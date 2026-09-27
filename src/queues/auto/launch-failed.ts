import type { QueueId } from '../../database/models/queue.model'
import { QueueState } from '../../database/models/queue-state.model'
import { getState } from '../get-state'
import { enterState } from './enter-state'
import { queueCommand } from './queue-command'

export async function launchFailed(queue: QueueId) {
  await queueCommand(queue, 'launch-failed', async emit => {
    if ((await getState(queue)) === QueueState.launching) {
      await enterState(queue, QueueState.waiting, emit)
    }
  })
}
