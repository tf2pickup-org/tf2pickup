import fp from 'fastify-plugin'
import { config } from './config'
import { QueuePage } from './views/html/queue.page'
import { getSlots } from './get-slots'
import { getState } from './get-state'
import { getMapWinner } from './get-map-winner'

export const queue = {
  config,
  getMapWinner,
  getSlots,
  getState,
} as const

export default fp(
  async app => {
    await app.register((await import('./plugins/initialize')).default)

    await app.register((await import('./plugins/gateway-listeners')).default)
    await app.register((await import('./plugins/kick-disconnected-players')).default)
    await app.register((await import('./plugins/auto-update-queue-state')).default)
    await app.register((await import('./plugins/update-clients')).default)
    await app.register((await import('./plugins/auto-reset')).default)
    await app.register((await import('./plugins/kick-replacement-players')).default)
    await app.register((await import('./plugins/kick-banned-players')).default)

    app.get('/', async (req, reply) => {
      await reply.status(200).html(QueuePage(req.user))
    })
  },
  {
    name: 'queue',
  },
)
