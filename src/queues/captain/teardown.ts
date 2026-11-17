import { collections } from '../../database/collections'
import type { QueueId } from '../../database/models/queue.model'
import { errors } from '../../errors'
import { queueCommand } from '../auto/queue-command'
import { get } from '../get'

export async function teardown(queue: QueueId) {
  if ((await get(queue)).launchMode !== 'captain') {
    throw errors.badRequest('not a captain queue')
  }

  await queueCommand('captain-teardown', async () => {
    await collections.queueState.deleteMany({ queue })
  })
}
