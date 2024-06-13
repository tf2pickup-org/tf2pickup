import fp from 'fastify-plugin'
import { collections } from '../database/collections'
import { QueueSlot } from './views/html/queue-slot'
import { QueueState } from './views/html/queue-state'
import { OnlinePlayerList } from '../online-players/views/html/online-player-list'
import { join } from './join'
import { leave } from './leave'
import { readyUp } from './ready-up'
import { ReadyUpDialog } from './views/html/ready-up-dialog'
import { voteMap } from './vote-map'
import { logger } from '../logger'
import { MapVote } from './views/html/map-vote'

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
    })

    app.gateway.on('queue:join', async (socket, slotId) => {
      if (!socket.player) {
        return
      }

      try {
        await join(slotId, socket.player.steamId)
        app.gateway.toPlayers(socket.player.steamId).broadcast(async () => await MapVote.enable())
      } catch (error) {
        logger.error(error)
      }
    })

    app.gateway.on('queue:leave', async socket => {
      if (!socket.player) {
        return
      }

      try {
        const slot = await leave(socket.player.steamId)
        app.gateway.toPlayers(socket.player.steamId).broadcast(async () => await MapVote.disable())

        if (slot.ready) {
          const close = await ReadyUpDialog.close()
          app.gateway.toPlayers(socket.player.steamId).broadcast(() => close)
        }
      } catch (error) {
        logger.error(error)
      }
    })

    app.gateway.on('queue:readyup', async socket => {
      if (!socket.player) {
        return
      }

      try {
        const [, close] = await Promise.all([readyUp(socket.player.steamId), ReadyUpDialog.close()])
        app.gateway.toPlayers(socket.player.steamId).broadcast(() => close)
      } catch (error) {
        logger.error(error)
      }
    })

    app.gateway.on('queue:votemap', async (socket, map) => {
      if (!socket.player) {
        return
      }

      try {
        await voteMap(socket.player.steamId, map)
      } catch (error) {
        logger.error(error)
      }
    })
  },
  { name: 'queue-gateway-listeners' },
)
