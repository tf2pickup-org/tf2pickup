import fp from 'fastify-plugin'
import { collections } from '../../database/collections'
import { QueueSlot } from '../views/html/queue-slot'
import { join } from '../join'
import { leave } from '../leave'
import { readyUp } from '../ready-up'
import { ReadyUpDialog } from '../views/html/ready-up-dialog'
import { voteMap } from '../vote-map'
import { logger } from '../../logger'
import type { SteamId64 } from '../../shared/types/steam-id-64'
import { markAsFriend } from '../mark-as-friend'
import { getState } from '../get-state'
import { QueueState } from '../../database/models/queue-state.model'
import { preReady } from '../../pre-ready'
import { FlashMessages } from '../../html/components/flash-messages'
import { WebSocket } from 'ws'
import { errors } from '../../errors'
import { IsInQueue } from '../views/html/is-in-queue'
import { MapVoteSelection } from '../views/html/map-vote-selection'

export default fp(
  // eslint-disable-next-line @typescript-eslint/require-await
  async app => {
    async function refreshTakenSlots(actor: SteamId64) {
      const slots = await collections.queueSlots.find({ player: { $ne: null } }).toArray()
      const cmps = await Promise.all(slots.map(async slot => await QueueSlot({ slot, actor })))
      app.gateway.to({ player: actor }).send(() => cmps)
    }

    function wsSafe<Args extends unknown[]>(
      fn: (socket: WebSocket, ...args: Args) => Promise<void>,
    ) {
      return (socket: WebSocket, ...args: Args) => {
        fn(socket, ...args).catch(async (error: unknown) => {
          logger.error(error)
          if (error instanceof Error) {
            const msg = await FlashMessages.append({
              message: `Error: ${error.message}`,
              type: 'error',
            })
            socket.send(msg)
          }
        })
      }
    }

    app.gateway.on(
      'queue:join',
      wsSafe(async (socket, slotId) => {
        if (!socket.player) {
          throw errors.unauthorized('unauthorized')
        }

        const slots = await join(slotId, socket.player.steamId)
        if (slots.find(s => s.canMakeFriendsWith?.length)) {
          await refreshTakenSlots(socket.player.steamId)
        }

        app.gateway
          .to({ player: socket.player.steamId })
          .send(async () => await IsInQueue({ actor: socket.player?.steamId }))
      }),
    )

    app.gateway.on(
      'queue:leave',
      wsSafe(async socket => {
        if (!socket.player) {
          throw errors.unauthorized('unauthorized')
        }

        const slot = await leave(socket.player.steamId)
        if (slot.canMakeFriendsWith?.length) {
          await refreshTakenSlots(socket.player.steamId)
        }

        app.gateway
          .to({ player: socket.player.steamId })
          .send(async () => [
            await IsInQueue({ actor: socket.player?.steamId }),
            await MapVoteSelection({ actor: socket.player?.steamId }),
          ])

        const queueState = await getState()
        if (queueState === QueueState.ready) {
          const close = await ReadyUpDialog.close()
          app.gateway.to({ player: socket.player.steamId }).send(() => close)
        }
      }),
    )

    app.gateway.on(
      'queue:readyup',
      wsSafe(async socket => {
        if (!socket.player) {
          throw errors.unauthorized('unauthorized')
        }

        const [, close] = await Promise.all([readyUp(socket.player.steamId), ReadyUpDialog.close()])
        app.gateway.to({ player: socket.player.steamId }).send(() => close)
      }),
    )

    app.gateway.on(
      'queue:votemap',
      wsSafe(async (socket, map) => {
        if (!socket.player) {
          throw errors.unauthorized('unauthorized')
        }

        await voteMap(socket.player.steamId, map)
        app.gateway
          .to({ player: socket.player.steamId })
          .send(async actor => await MapVoteSelection({ actor }))
      }),
    )

    app.gateway.on(
      'queue:markasfriend',
      wsSafe(async (socket, steamId) => {
        if (!socket.player) {
          throw errors.unauthorized('unauthorized')
        }

        await markAsFriend(socket.player.steamId, steamId)
      }),
    )

    app.gateway.on(
      'queue:togglepreready',
      wsSafe(async socket => {
        if (!socket.player) {
          throw errors.unauthorized('unauthorized')
        }

        await preReady.toggle(socket.player.steamId)
      }),
    )
  },
  { name: 'queue gateway listeners' },
)
