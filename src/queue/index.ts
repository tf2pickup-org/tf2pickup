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
import { resetMapOptions } from './reset-map-options'
import { getFriends } from './get-friends'
import { getMapVoteResults } from './get-map-vote-results'

const slotCount = await collections.queueSlots.countDocuments()
if (slotCount === 0) {
  logger.info(`no queue initialized, initializing one now...`)
  await reset()
}

export const queue = {
  config,
  getFriends,
  getMapVoteResults,
  getMapWinner,
  getSlots,
  getState,
  resetMapOptions,
} as const

export default fp(
  async app => {
    await app.register((await import('@fastify/autoload')).default, {
      dir: resolve(import.meta.dirname, 'plugins'),
    })

    app.get('/', async (req, reply) => {
      return reply.status(200).html(QueuePage({ user: req.user }))
    })
  },
  {
    name: 'queue',
  },
)
