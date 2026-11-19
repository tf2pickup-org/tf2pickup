import { collections } from '../../database/collections'
import type { QueueId } from '../../database/models/queue.model'
import { queueCommand } from '../queue-command'
import { get } from '../get'
import { assertCaptainQueue } from './assert-captain-queue'
import { cancelDraftTimeouts } from './cancel-draft-timeouts'
import { cancelReadyTimeouts } from './cancel-ready-timeouts'

export async function teardown(queue: QueueId) {
  assertCaptainQueue(await get(queue))
  await queueCommand('captain-teardown', async () => {
    await cancelReadyTimeouts(queue)
    await cancelDraftTimeouts(queue)
    await Promise.all([
      collections.queueState.deleteMany({ queue }),
      collections.captainPool.deleteMany({ queue }),
      collections.captainDrafts.deleteMany({ queue }),
    ])
  })
}
