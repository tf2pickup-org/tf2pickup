import fp from 'fastify-plugin'
import { collections } from '../../database/collections'
import { QueueSlot } from '../views/html/queue-slot'
import { join } from '../join'
import { leave } from '../leave'
import { readyUp } from '../ready-up'
import { ReadyUpDialog } from '../views/html/ready-up-dialog'
import { voteMap } from '../vote-map'
import { logger } from '../../logger'
import { MapVote } from '../views/html/map-vote'
import type { SteamId64 } from '../../shared/types/steam-id-64'
import { markAsFriend } from '../mark-as-friend'
import { getState } from '../get-state'
import { QueueState } from '../../database/models/queue-state.model'
import { PreReadyUpButton } from '../../pre-ready/views/html/pre-ready-up-button'
import { preReady } from '../../pre-ready'

export default fp(
  // eslint-disable-next-line @typescript-eslint/require-await
  async app => {
    async function refreshTakenSlots(actor: SteamId64) {
      const slots = await collections.queueSlots.find({ player: { $ne: null } }).toArray()
      const cmps = await Promise.all(slots.map(async slot => await QueueSlot({ slot, actor })))
      app.gateway.to({ player: actor }).send(() => cmps)
    }

    app.gateway.on('queue:join', async (socket, slotId) => {
      if (!socket.player) {
        return
      }

      try {
        const slots = await join(slotId, socket.player.steamId)
        app.gateway.to({ player: socket.player.steamId }).send(async () => await MapVote.enable())
        app.gateway
          .to({ player: socket.player.steamId })
          .send(async () => await PreReadyUpButton.enable())

        if (slots.find(s => s.canMakeFriendsWith?.length)) {
          await refreshTakenSlots(socket.player.steamId)
        }
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
        app.gateway.to({ player: socket.player.steamId }).send(async () => await MapVote.disable())
        app.gateway
          .to({ player: socket.player.steamId })
          .send(async () => await PreReadyUpButton.disable())

        if (slot.canMakeFriendsWith?.length) {
          await refreshTakenSlots(socket.player.steamId)
        }

        const queueState = await getState()
        if (queueState === QueueState.ready) {
          const close = await ReadyUpDialog.close()
          app.gateway.to({ player: socket.player.steamId }).send(() => close)
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
        app.gateway.to({ player: socket.player.steamId }).send(() => close)
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
        app.gateway
          .to({ player: socket.player.steamId })
          .send(async actor => await MapVote({ actor }))
      } catch (error) {
        logger.error(error)
      }
    })

    app.gateway.on('queue:markasfriend', async (socket, steamId) => {
      if (!socket.player) {
        return
      }

      try {
        await markAsFriend(socket.player.steamId, steamId)
      } catch (error) {
        logger.error(error)
      }
    })

    app.gateway.on('queue:togglepreready', async socket => {
      if (!socket.player) {
        return
      }

      try {
        await preReady.toggle(socket.player.steamId)
      } catch (error) {
        logger.error(error)
      }
    })
  },
  { name: 'queue gateway listeners' },
)
