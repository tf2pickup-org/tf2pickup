import { collections } from '../../../database/collections'
import type { QueueId } from '../../../database/models/queue.model'
import { get } from '../../get'
import { queueCommand } from '../../queue-command'
import { assertCaptainQueue } from '../assert-captain-queue'
import { legalPicksCache } from './legal-picks-cache'
import { readyTimers } from './ready-timers'
import { turnTimer } from './turn-timer'

export async function teardown(queue: QueueId) {
  assertCaptainQueue(await get(queue))
  await queueCommand('captain-teardown', async () => {
    await readyTimers.stop(queue)
    await turnTimer.stop(queue)
    legalPicksCache.delete(queue.toHexString())
    await Promise.all([
      collections.queueState.deleteMany({ queue }),
      collections.captainPool.deleteMany({ queue }),
      collections.captainDrafts.deleteMany({ queue }),
    ])
  })
}
