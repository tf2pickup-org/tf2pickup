import fp from 'fastify-plugin'
import { Queue } from './views/queue'
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
      reply.status(200).html(await Queue(req.user))
    })

    // function showReadyUpDialog() {
    //   const clients = [...app.websocketServer.clients].filter(
    //     client => client.player?.steamId === '76561198074409147',
    //   )
    //   clients.forEach(async c => c.send(await Show()))
    // }

    // setTimeout(() => showReadyUpDialog(), secondsToMilliseconds(10))
  },
  {
    name: 'queue',
  },
)
