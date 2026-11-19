import type { QueueId } from '../../../database/models/queue.model'
import { get } from '../../get'
import { queueCommand } from '../../queue-command'
import { assertCaptainQueue } from '../assert-captain-queue'
import { toWaiting } from './to-waiting'

export async function reset(queue: QueueId) {
  const settings = await get(queue)
  assertCaptainQueue(settings)
  await queueCommand('captain-reset', async emit => {
    await toWaiting(settings, emit)
  })
}
