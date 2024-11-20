import fp from 'fastify-plugin'
import { config } from './config'
import { QueuePage } from './views/html/queue.page'
import { getSlots } from './get-slots'
import { getState } from './get-state'
import { getMapWinner } from './get-map-winner'
import { resolve } from 'node:path'
import { collections } from '../database/collections'
import { logger } from '../logger'
import { reset } from './reset'

const slotCount = await collections.queueSlots.countDocuments()
if (slotCount === 0) {
  logger.info(`no queue initialized, initializing one now...`)
  await reset()
}

export const queue = {
  config,
  getMapWinner,
  getSlots,
  getState,
} as const

export default fp(
  async app => {
    await app.register((await import('@fastify/autoload')).default, {
      dir: resolve(import.meta.dirname, 'plugins'),
    })

    app.get('/', async (req, reply) => {
      await reply.status(200).html(QueuePage({ user: req.user }))
    })
  },
  {
    name: 'queue',
  },
)
