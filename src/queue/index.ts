import fp from 'fastify-plugin'
import { config } from './config'
import { reset } from './reset'
import { QueuePage } from './views/html/queue.page'

export const queue = {
  config,
  reset,
} as const

export default fp(
  async app => {
    await app.register((await import('./plugins/initialize')).default)

    await app.register((await import('./plugins/gateway-listeners')).default)
    await app.register((await import('./plugins/kick-disconnected-players')).default)
    await app.register((await import('./plugins/auto-update-queue-state')).default)
    await app.register((await import('./plugins/update-clients')).default)

    app.get('/', async (req, reply) => {
      reply.status(200).html(await QueuePage(req.user))
    })
  },
  {
    name: 'queue',
  },
)
