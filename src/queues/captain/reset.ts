import { collections } from '../../database/collections'
import type { QueueId } from '../../database/models/queue.model'
import { QueueState } from '../../database/models/queue-state.model'
import { queueCommand } from '../queue-command'
import { get } from '../get'
import { assertCaptainQueue } from './assert-captain-queue'
import { cancelReadyTimeouts } from './cancel-ready-timeouts'

export async function reset(queue: QueueId) {
  assertCaptainQueue(await get(queue))
  await queueCommand('captain-reset', async () => {
    await cancelReadyTimeouts(queue)
    await collections.queueState.updateOne(
      { queue },
      { $set: { state: QueueState.waiting }, $unset: { captainReady: 1 } },
      { upsert: true },
    )
  })
}
