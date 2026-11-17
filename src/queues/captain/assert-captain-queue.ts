import type { QueueModel } from '../../database/models/queue.model'
import { errors } from '../../errors'

// the captain engine must never act on an auto queue
export function assertCaptainQueue(queue: Pick<QueueModel, 'launchMode'>) {
  if (queue.launchMode !== 'captain') {
    throw errors.badRequest('not a captain queue')
  }
}
