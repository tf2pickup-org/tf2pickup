import fp from 'fastify-plugin'
import { QueuePage } from './views/html/queue.page'
import { collections } from '../database/collections'
import { reset } from './reset'
import gatewayListeners from './gateway-listeners'
import eventListeners from './event-listeners'

// eslint-disable-next-line @typescript-eslint/require-await
export default fp(
  async app => {
    const slotCount = await collections.queueSlots.countDocuments()
    if (slotCount === 0) {
      await reset()
    }

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
