import { collections } from '../../database/collections'
import { logger } from '../../logger'
import { reset } from './reset'
import { kick } from './kick'

for (const { _id, slug } of await collections.queues
  .find({ enabled: true, launchMode: 'auto' })
  .toArray()) {
  if ((await collections.queueSlots.countDocuments({ queue: _id })) === 0) {
    logger.info(`no slots in queue ${slug}, initializing them now...`)
    await reset(_id)
  }
}

export const queue = {
  kick,
} as const
