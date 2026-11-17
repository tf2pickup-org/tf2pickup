import fp from 'fastify-plugin'
import { join } from '../join'
import { leave } from '../leave'
import { readyUp } from '../ready-up'
import { ReadyUpDialog } from '../views/html/ready-up-dialog'
import { voteMap } from '../vote-map'
import { logError } from '../../../utils/log-error'
import { markAsFriend } from '../mark-as-friend'
import { getState } from '../../get-state'
import { QueueState } from '../../../database/models/queue-state.model'
import { preReady } from '../../../pre-ready'
import { errors } from '../../../errors'
import { FlashMessage } from '../../../html/components/flash-message'
import type { AppWebSocket } from '../../../websocket/types'
import { queueWsCallDuration } from '../../metrics'
import { measureTime } from '../../../utils/measure-time'
import { byPageUrl } from '../../page/by-page-url'
import { queuePage } from '../../page'

export default fp(
  // eslint-disable-next-line @typescript-eslint/require-await
  async app => {
    function wsSafe<Args extends unknown[]>(
      operation: string,
      fn: (socket: AppWebSocket, ...args: Args) => Promise<void>,
    ) {
      return (socket: AppWebSocket, ...args: Args) => {
        measureTime(
          async () => {
            await fn(socket, ...args)
          },
          ({ ms, result }) => {
            queueWsCallDuration.record(ms, {
              operation,
              result,
            })
          },
        ).catch(async (error: unknown) => {
          // Same levelling as the HTTP error handler (src/main.ts): client errors
          // (4xx) — queue races ('slot occupied'), invalid state, unauthorized —
          // are routine and not logged at error level. See logError.
          logError(error)
          if (error instanceof Error) {
            const msg = await FlashMessage({
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
      wsSafe('join', async (socket, slotId) => {
        if (!socket.player) {
          throw errors.unauthorized('unauthorized')
        }

        const queue = await byPageUrl(socket.currentUrl)
        if (!queue) {
          throw errors.badRequest('not on a queue page')
        }
        const actor = socket.player.steamId
        const slots = await join(queue._id, slotId, actor)
        if (slots.find(s => s.canMakeFriendsWith?.length)) {
          await queuePage.update(app.gateway, queue._id, { slots: 'taken' }, { players: [actor] })
        }

        await queuePage.updateAll(app.gateway, { membership: true }, { players: [actor] })
      }),
    )

    app.gateway.on(
      'queue:leave',
      wsSafe('leave', async socket => {
        if (!socket.player) {
          throw errors.unauthorized('unauthorized')
        }

        const actor = socket.player.steamId
        const slot = await leave(actor)
        if (slot.canMakeFriendsWith?.length) {
          await queuePage.update(app.gateway, slot.queue, { slots: 'taken' }, { players: [actor] })
        }

        await queuePage.updateAll(app.gateway, { membership: true }, { players: [actor] })

        const queueState = await getState(slot.queue)
        if (queueState === QueueState.ready) {
          const close = await ReadyUpDialog.close()
          app.gateway.to({ player: socket.player.steamId }).send(() => close)
        }
      }),
    )

    app.gateway.on(
      'queue:readyup',
      wsSafe('readyup', async socket => {
        if (!socket.player) {
          throw errors.unauthorized('unauthorized')
        }

        const [, close] = await Promise.all([readyUp(socket.player.steamId), ReadyUpDialog.close()])
        app.gateway.to({ player: socket.player.steamId }).send(() => close)
      }),
    )

    app.gateway.on(
      'queue:votemap',
      wsSafe('votemap', async (socket, map) => {
        if (!socket.player) {
          throw errors.unauthorized('unauthorized')
        }

        const actor = socket.player.steamId
        const { queue } = await voteMap(actor, map)
        await queuePage.update(app.gateway, queue, { membership: true }, { players: [actor] })
      }),
    )

    app.gateway.on(
      'queue:markasfriend',
      wsSafe('markasfriend', async (socket, steamId) => {
        if (!socket.player) {
          throw errors.unauthorized('unauthorized')
        }

        await markAsFriend(socket.player.steamId, steamId)
      }),
    )

    app.gateway.on(
      'queue:togglepreready',
      wsSafe('togglepreready', async socket => {
        if (!socket.player) {
          throw errors.unauthorized('unauthorized')
        }

        await preReady.toggle(socket.player.steamId)
      }),
    )
  },
  { name: 'queue gateway listeners' },
)
