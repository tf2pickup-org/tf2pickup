import type { QueueId } from '../../database/models/queue.model'
import { QueueState } from '../../database/models/queue-state.model'
import { enterState } from './enter-state'
import { queueCommand } from './queue-command'

export async function unreadyQueue(queue: QueueId) {
  await queueCommand(queue, 'unready-queue', async emit => {
    await enterState(queue, QueueState.waiting, emit)
  })
}
