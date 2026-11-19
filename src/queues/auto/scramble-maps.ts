import type { QueueId } from '../../database/models/queue.model'
import { logger } from '../../logger'
import { get } from '../get'
import { assertAutoQueue } from './assert-auto-queue'
import { queueCommand } from './queue-command'
import { resetMapOptions } from './reset-map-options'

export async function scrambleMaps(queue: QueueId) {
  logger.trace({ queue }, 'queue.scrambleMaps()')
  assertAutoQueue(await get(queue))
  await queueCommand('scramble-maps', async emit => {
    await resetMapOptions(queue, emit)
  })
}
