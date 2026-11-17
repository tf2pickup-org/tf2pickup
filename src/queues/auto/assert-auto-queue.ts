import type { QueueModel } from '../../database/models/queue.model'
import { errors } from '../../errors'

// the auto engine must never act on a captain queue
export function assertAutoQueue(queue: Pick<QueueModel, 'launchMode'>) {
  if (queue.launchMode !== 'auto') {
    throw errors.badRequest('not an auto queue')
  }
}
