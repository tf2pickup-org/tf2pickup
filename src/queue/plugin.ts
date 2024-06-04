import fp from 'fastify-plugin'
import { QueuePage } from './views/html/queue.page'
import gatewayListeners from './gateway-listeners'
import eventListeners from './event-listeners'

// eslint-disable-next-line @typescript-eslint/require-await
export default fp(
  async app => {
    await import('./initialize')

    await app.register(gatewayListeners)
    await app.register(eventListeners)

    app.get('/', async (req, reply) => {
      reply.status(200).html(await QueuePage(req.user))
    })
  },
  {
    name: 'queue',
  },
)
