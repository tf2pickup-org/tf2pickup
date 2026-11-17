import { collections } from '../../database/collections'
import type { QueueId } from '../../database/models/queue.model'
import { QueueState } from '../../database/models/queue-state.model'
import { errors } from '../../errors'
import { queueCommand } from '../auto/queue-command'
import { get } from '../get'

export async function reset(queue: QueueId) {
  if ((await get(queue)).launchMode !== 'captain') {
    throw errors.badRequest('not a captain queue')
  }

  await queueCommand('captain-reset', async () => {
    await collections.queueState.updateOne(
      { queue },
      { $set: { state: QueueState.waiting } },
      { upsert: true },
    )
  })
}
