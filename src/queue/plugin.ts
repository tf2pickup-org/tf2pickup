import fp from 'fastify-plugin'
import { Queue } from './views/queue'
import { collections } from '../database/collections'
import { reset } from './reset'
import { join } from './join'
import { WebSocket } from 'ws'
import { QueueSlot } from './views/queue-slot'
import { leave } from './leave'
import { QueueState } from './views/queue-state'
import { OnlinePlayerList } from '../online-players/views/online-player-list'
import { events } from '../events'
import { kick } from './kick'

// eslint-disable-next-line @typescript-eslint/require-await
export default fp(
  async app => {
    const slotCount = await collections.queueSlots.countDocuments()
    if (slotCount === 0) {
      await reset()
    }

    app.gateway.on('connected', async socket => {
      const slots = await collections.queueSlots.find().toArray()
      slots.forEach(async slot => {
        socket.send(await QueueSlot({ slot, actor: socket.player?.steamId }))
      })
      socket.send(await QueueState())
      socket.send(await OnlinePlayerList())
    })

    app.gateway.on('queue:join', async (socket, slotId) => {
      if (!socket.player) {
        return
      }

      const slots = await join(slotId, socket.player.steamId)
      const queueState = await QueueState()

      app.websocketServer.clients.forEach((client: WebSocket) => {
        slots.forEach(async slot => {
          client.send(await QueueSlot({ slot, actor: client.player?.steamId }))
        })
        client.send(queueState)
      })
    })

    app.gateway.on('queue:leave', async socket => {
      if (!socket.player) {
        return
      }

      const slot = await leave(socket.player.steamId)
      const queueState = await QueueState()

      app.websocketServer.clients.forEach(async (client: WebSocket) => {
        client.send(await QueueSlot({ slot, actor: client.player?.steamId }))
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

    app.get('/', async (req, reply) => {
      reply.status(200).html(await Queue(req.user))
    })
  },
  {
    name: 'queue',
  },
)
