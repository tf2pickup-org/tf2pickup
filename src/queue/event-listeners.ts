import fp from 'fastify-plugin'
import { events } from '../events'
import { QueueState } from './views/queue-state'
import { QueueSlot } from './views/queue-slot'
import { kick } from './kick'
import { WebSocket } from 'ws'

export default fp(
  // eslint-disable-next-line @typescript-eslint/require-await
  async app => {
    events.on('queue/slots:updated', async ({ slots }) => {
      const queueState = await QueueState()

      app.websocketServer.clients.forEach((client: WebSocket) => {
        slots.forEach(async slot => {
          client.send(await QueueSlot({ slot, actor: client.player?.steamId }))
        })
        client.send(queueState)
      })
    })

    events.on('player:disconnected', async ({ steamId }) => {
      const slots = await kick(steamId)
      const queueState = await QueueState()

      app.websocketServer.clients.forEach((client: WebSocket) => {
        slots.forEach(async slot => {
          client.send(await QueueSlot({ slot, actor: client.player?.steamId }))
        })
        client.send(queueState)
      })
    })
  },
  { name: 'queue-event-listeners' },
)
