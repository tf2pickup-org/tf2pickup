import fp from 'fastify-plugin'
import { collections } from '../database/collections'
import { QueueSlot } from './views/html/queue-slot'
import { QueueState } from './views/html/queue-state'
import { OnlinePlayerList } from '../online-players/views/html/online-player-list'
import { join } from './join'
import { leave } from './leave'
import { readyUp } from './ready-up'
import { ReadyUpDialog } from './views/html/ready-up-dialog'

export default fp(
  // eslint-disable-next-line @typescript-eslint/require-await
  async app => {
    app.gateway.on('connected', async socket => {
      const slots = await collections.queueSlots.find().toArray()
      slots.forEach(async slot => {
        socket.send(await QueueSlot({ slot, actor: socket.player?.steamId }))
      })
      socket.send(await QueueState())
      socket.send(await OnlinePlayerList())

      // setTimeout(async () => socket.send(await ReadyUpDialog.show()), 3000)
    })

    app.gateway.on('queue:join', async (socket, slotId) => {
      if (!socket.player) {
        return
      }

      await join(slotId, socket.player.steamId)
    })

    app.gateway.on('queue:leave', async socket => {
      if (!socket.player) {
        return
      }

      const slot = await leave(socket.player.steamId)
      if (slot.ready) {
        const close = await ReadyUpDialog.close()
        app.gateway.toPlayers(socket.player.steamId).broadcast(() => close)
      }
    })

    app.gateway.on('queue:readyup', async socket => {
      if (!socket.player) {
        return
      }

      const [, close] = await Promise.all([readyUp(socket.player.steamId), ReadyUpDialog.close()])
      app.gateway.toPlayers(socket.player.steamId).broadcast(() => close)
    })
  },
  { name: 'queue-gateway-listeners' },
)
