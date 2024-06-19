import fp from 'fastify-plugin'
import { collections } from '../../database/collections'
import { reset } from '../reset'
import { logger } from '../../logger'

export default fp(
  async () => {
    const slotCount = await collections.queueSlots.countDocuments()
    if (slotCount === 0) {
      logger.info(`no queue initialized, initializing one now...`)
      await reset()
    }
  },
  { name: 'initialize' },
)
